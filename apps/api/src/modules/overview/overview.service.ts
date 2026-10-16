import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  EnvironmentFilter,
  OverviewDistributionItem,
  OverviewLatestImpact,
  OverviewRangeDays,
  OverviewRecentChange,
  OverviewResourceDelta,
  OverviewResponse,
  OverviewSecurityDelta,
} from "@cloudflux/contracts";

import { PrismaService } from "../../common/prisma/prisma.service";

const DEMO_WORKSPACE_SLUG = "acme-cloud-demo";

@Injectable()
export class OverviewService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getOverview(
    environment: EnvironmentFilter,
    rangeDays: OverviewRangeDays,
  ): Promise<OverviewResponse> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { slug: DEMO_WORKSPACE_SLUG },
      include: {
        cloudAccounts: {
          orderBy: { createdAt: "asc" },
          take: 1,
        },
        environments: {
          orderBy: { name: "asc" },
        },
      },
    });

    const cloudAccount = workspace?.cloudAccounts[0];
    if (!workspace || !cloudAccount) {
      throw new NotFoundException("Demo workspace has not been seeded yet.");
    }

    const selectedEnvironment =
      environment === "all"
        ? undefined
        : workspace.environments.find((item) => item.name === environment);
    const environmentId = selectedEnvironment?.id;

    const [latestEvent, latestCostSnapshot] = await Promise.all([
      this.prisma.changeEvent.findFirst({
        where: { workspaceId: workspace.id, ...(environmentId ? { environmentId } : {}) },
        orderBy: { happenedAt: "desc" },
        select: { happenedAt: true },
      }),
      this.prisma.costSnapshot.findFirst({
        where: { workspaceId: workspace.id, ...(environmentId ? { environmentId } : {}) },
        orderBy: { periodStart: "desc" },
        select: { periodStart: true },
      }),
    ]);

    const latestDataAt = maxDate(latestEvent?.happenedAt, latestCostSnapshot?.periodStart) ?? new Date();
    const rangeStart = new Date(latestDataAt);
    rangeStart.setUTCDate(rangeStart.getUTCDate() - rangeDays + 1);

    const [events, findings, resources, costs] = await Promise.all([
      this.prisma.changeEvent.findMany({
        where: {
          workspaceId: workspace.id,
          happenedAt: { gte: rangeStart },
          ...(environmentId ? { environmentId } : {}),
        },
        orderBy: { happenedAt: "desc" },
        take: 30,
        include: {
          environment: { select: { name: true } },
          impactSummary: true,
          resourceChanges: true,
          introducedFindings: {
            orderBy: { detectedAt: "desc" },
            take: 1,
            select: { remediation: true },
          },
          aiInsights: {
            orderBy: { generatedAt: "desc" },
            take: 1,
          },
        },
      }),
      this.prisma.securityFinding.findMany({
        where: { workspaceId: workspace.id, ...(environmentId ? { environmentId } : {}) },
        include: { environment: { select: { name: true } } },
      }),
      this.prisma.cloudResource.findMany({
        where: {
          workspaceId: workspace.id,
          status: { not: "deleted" },
          ...(environmentId ? { environmentId } : {}),
        },
        select: {
          service: true,
          environment: { select: { name: true } },
        },
      }),
      this.prisma.costSnapshot.findMany({
        where: {
          workspaceId: workspace.id,
          periodStart: { gte: rangeStart },
          ...(environmentId ? { environmentId } : {}),
        },
        orderBy: { periodStart: "asc" },
        select: { periodStart: true, amount: true },
      }),
    ]);

    const recentChanges = events.slice(0, 5).map(toRecentChange);
    const latestHighImpactEvent = events.find((event) => {
      const impactLevel = event.impactSummary?.overallImpactLevel ?? event.riskLevel;
      return impactLevel === "high" || impactLevel === "medium";
    });
    const latestImpact = latestHighImpactEvent
      ? toLatestImpact(latestHighImpactEvent)
      : null;
    const costTrend = buildCostTrend(costs);
    const projectedMonthlyCost = (costTrend.at(-1)?.amount ?? 0) * 30;
    const openFindings = countOpenFindings(findings);
    const newFindings = findings.filter((finding) => finding.detectedAt >= rangeStart).length;
    const resolvedFindings = findings.filter(
      (finding) => finding.resolvedAt !== null && finding.resolvedAt >= rangeStart,
    ).length;

    return {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        status: "active",
      },
      cloudAccount: {
        id: cloudAccount.id,
        name: cloudAccount.accountName,
        provider: cloudAccount.provider as "aws",
        mode: cloudAccount.mode as "demo" | "connected",
        connectionStatus: cloudAccount.connectionStatus as
          | "demo"
          | "pending"
          | "active"
          | "error"
          | "disabled",
      },
      environments: workspace.environments.map((item) => ({
        id: item.id,
        name: item.name as "development" | "staging" | "production",
        displayName: toDisplayName(item.name),
        criticality: item.criticality as "low" | "medium" | "high",
      })),
      filters: { environment, rangeDays, currency: "USD" },
      generatedAt: new Date().toISOString(),
      latestImpact,
      metrics: {
        projectedMonthlyCost,
        latestChangeCostDelta: latestImpact?.costDeltaMonthlyProjected ?? 0,
        activeResourceCount: resources.length,
        recentChangeCount: events.length,
        openFindings,
      },
      costTrend,
      securitySummary: {
        newFindings,
        resolvedFindings,
        highestRiskEnvironment: highestRiskEnvironment(findings),
        openBySeverity: openFindings,
      },
      recentChanges,
      resourceDistribution: {
        byService: countDistribution(resources.map((item) => item.service)),
        byEnvironment: countDistribution(resources.map((item) => item.environment.name)),
      },
      primaryInsight: latestHighImpactEvent?.aiInsights[0]
        ? {
            id: latestHighImpactEvent.aiInsights[0].id,
            title: latestHighImpactEvent.aiInsights[0].title,
            content: latestHighImpactEvent.aiInsights[0].content,
            generatedAt: latestHighImpactEvent.aiInsights[0].generatedAt.toISOString(),
          }
        : null,
    };
  }
}

function toLatestImpact(event: EventWithRelations): OverviewLatestImpact {
  const resourceDelta = toResourceDelta(event.resourceChanges);
  const securityDelta: OverviewSecurityDelta = {
    introduced: event.impactSummary?.newSecurityFindingsCount ?? 0,
    resolved: event.impactSummary?.resolvedSecurityFindingsCount ?? 0,
    highestSeverity: event.impactSummary?.highestSeverity ?? null,
  };

  return {
    id: event.id,
    title: event.impactSummary?.summaryTitle ?? event.title,
    description: event.impactSummary?.summaryText ?? event.description,
    source: event.source,
    eventType: event.eventType,
    environment: event.environment?.name ?? null,
    actorName: event.actorName,
    happenedAt: event.happenedAt.toISOString(),
    impactLevel: event.impactSummary?.overallImpactLevel ?? event.riskLevel,
    costDeltaMonthlyProjected: numberValue(event.impactSummary?.costDeltaMonthlyProjected),
    resourceDelta,
    securityDelta,
    reviewAction:
      event.introducedFindings[0]?.remediation ??
      "Review the affected resources and confirm the change matches the intended deployment.",
  };
}

function toRecentChange(event: EventWithRelations): OverviewRecentChange {
  return {
    id: event.id,
    title: event.title,
    source: event.source,
    eventType: event.eventType,
    environment: event.environment?.name ?? null,
    happenedAt: event.happenedAt.toISOString(),
    impactLevel: event.impactSummary?.overallImpactLevel ?? event.riskLevel,
    costDeltaMonthlyProjected: numberValue(event.impactSummary?.costDeltaMonthlyProjected),
    resourceDelta: toResourceDelta(event.resourceChanges),
    securityDelta: {
      introduced: event.impactSummary?.newSecurityFindingsCount ?? 0,
      resolved: event.impactSummary?.resolvedSecurityFindingsCount ?? 0,
      highestSeverity: event.impactSummary?.highestSeverity ?? null,
    },
  };
}

function toResourceDelta(
  changes: Array<{ action: string }>,
): OverviewResourceDelta {
  const created = changes.filter((change) => change.action === "created").length;
  const updated = changes.filter((change) => change.action === "updated").length;
  const deleted = changes.filter((change) => change.action === "deleted").length;
  return { created, updated, deleted, total: changes.length };
}

function buildCostTrend(
  costs: Array<{ periodStart: Date; amount: unknown }>,
): Array<{ date: string; amount: number }> {
  const grouped = new Map<string, number>();
  for (const cost of costs) {
    const date = cost.periodStart.toISOString().slice(0, 10);
    grouped.set(date, (grouped.get(date) ?? 0) + numberValue(cost.amount));
  }

  return [...grouped.entries()].map(([date, amount]) => ({ date, amount }));
}

function countOpenFindings(
  findings: Array<{ status: string; severity: string }>,
): { total: number; critical: number; high: number; medium: number; low: number } {
  const open = findings.filter((finding) => finding.status === "open");
  return {
    total: open.length,
    critical: countBy(open, "critical"),
    high: countBy(open, "high"),
    medium: countBy(open, "medium"),
    low: countBy(open, "low"),
  };
}

function countBy(items: Array<{ severity: string }>, severity: string) {
  return items.filter((item) => item.severity === severity).length;
}

function highestRiskEnvironment(
  findings: Array<{ status: string; environment: { name: string } | null }>,
) {
  const counts = new Map<string, number>();
  for (const finding of findings.filter((item) => item.status === "open" && item.environment)) {
    const name = finding.environment?.name;
    if (name) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

function countDistribution(values: string[]): OverviewDistributionItem[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label, count]) => ({ label, count }));
}

function maxDate(first?: Date, second?: Date) {
  if (!first) return second;
  if (!second) return first;
  return first > second ? first : second;
}

function numberValue(value: unknown): number {
  return value === undefined || value === null ? 0 : Number(value);
}

function toDisplayName(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

type EventWithRelations = {
  id: string;
  title: string;
  source: string;
  eventType: string;
  description: string | null;
  actorName: string;
  happenedAt: Date;
  riskLevel: string;
  environment: { name: string } | null;
  impactSummary: {
    summaryTitle: string;
    summaryText: string;
    costDeltaMonthlyProjected: unknown;
    newSecurityFindingsCount: number;
    resolvedSecurityFindingsCount: number;
    highestSeverity: string | null;
    overallImpactLevel: string;
  } | null;
  resourceChanges: Array<{ action: string }>;
  introducedFindings: Array<{ remediation: string }>;
  aiInsights: Array<{
    id: string;
    title: string;
    content: string;
    generatedAt: Date;
  }>;
};
