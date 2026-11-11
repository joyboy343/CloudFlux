import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { CostBreakdownRow, CostResponse, EnvironmentFilter, OverviewRangeDays, TimelineEvent } from "@cloudflux/contracts";

import { PrismaService } from "../../common/prisma/prisma.service";

const DEMO_WORKSPACE_SLUG = "acme-cloud-demo";

@Injectable()
export class CostsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getSummary(environment: EnvironmentFilter, rangeDays: OverviewRangeDays): Promise<CostResponse> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { slug: DEMO_WORKSPACE_SLUG },
      include: { cloudAccounts: { orderBy: { createdAt: "asc" }, take: 1 }, environments: { orderBy: { name: "asc" } } },
    });
    const cloudAccount = workspace?.cloudAccounts[0];
    if (!workspace || !cloudAccount) throw new NotFoundException("Demo workspace has not been seeded yet.");

    const environmentId = environment === "all" ? undefined : workspace.environments.find((item) => item.name === environment)?.id;
    const latestCost = await this.prisma.costSnapshot.findFirst({
      where: { workspaceId: workspace.id, ...(environmentId ? { environmentId } : {}) },
      orderBy: { periodStart: "desc" },
      select: { periodStart: true },
    });
    const latestDataAt = latestCost?.periodStart ?? new Date();
    const rangeStart = new Date(latestDataAt);
    rangeStart.setUTCDate(rangeStart.getUTCDate() - rangeDays + 1);
    const splitAt = new Date(rangeStart);
    splitAt.setUTCDate(splitAt.getUTCDate() + Math.floor(rangeDays / 2));

    const [costs, events] = await Promise.all([
      this.prisma.costSnapshot.findMany({
        where: { workspaceId: workspace.id, periodStart: { gte: rangeStart }, ...(environmentId ? { environmentId } : {}) },
        orderBy: { periodStart: "asc" },
        include: { environment: { select: { name: true } } },
      }),
      this.prisma.changeEvent.findMany({
        where: { workspaceId: workspace.id, happenedAt: { gte: rangeStart }, ...(environmentId ? { environmentId } : {}) },
        orderBy: { happenedAt: "desc" },
        include: {
          environment: { select: { name: true } },
          impactSummary: true,
          resourceChanges: { include: { cloudResource: { select: { service: true } } } },
          introducedFindings: { select: { id: true } },
          resolvedFindings: { select: { id: true } },
        },
      }),
    ]);

    const trend = buildTrend(costs, events, splitAt);
    const currentCosts = costs.filter((item) => item.periodStart >= splitAt);
    const previousCosts = costs.filter((item) => item.periodStart < splitAt);
    const currentPeriodCost = sum(costs.map((item) => item.amount));
    const latestDate = costs.at(-1)?.periodStart.toISOString().slice(0, 10);
    const projectedMonthlyCost = latestDate
      ? sum(costs.filter((item) => item.periodStart.toISOString().slice(0, 10) === latestDate).map((item) => item.amount)) * 30
      : 0;
    const costDeltaOverRange = sum(events.map((event) => event.impactSummary?.costDeltaMonthlyProjected));
    const largestServiceCostDriver = largestLabel(groupBy(costs, (item) => item.service));
    const largestRecentIncrease = Math.max(0, ...events.map((event) => numberValue(event.impactSummary?.costDeltaMonthlyProjected)));
    const relatedChanges = events.filter((event) => numberValue(event.impactSummary?.costDeltaMonthlyProjected) !== 0).map(toTimelineEvent);

    return {
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug, status: "active" },
      cloudAccount: {
        id: cloudAccount.id,
        name: cloudAccount.accountName,
        provider: cloudAccount.provider as "aws",
        mode: cloudAccount.mode as "demo" | "connected",
        connectionStatus: cloudAccount.connectionStatus as "demo" | "pending" | "active" | "error" | "disabled",
      },
      environments: workspace.environments.map((item) => ({ id: item.id, name: item.name as "development" | "staging" | "production", displayName: toDisplayName(item.name), criticality: item.criticality as "low" | "medium" | "high" })),
      filters: { environment, rangeDays },
      metrics: {
        currentPeriodCost,
        projectedMonthlyCost,
        costDeltaOverRange,
        costDeltaPercent: currentPeriodCost === 0 ? null : (costDeltaOverRange / currentPeriodCost) * 100,
        largestServiceCostDriver,
        largestRecentIncrease,
      },
      trend,
      serviceBreakdown: buildBreakdown(costs, currentCosts, previousCosts, (item) => item.service, events, "service"),
      environmentBreakdown: buildBreakdown(costs, currentCosts, previousCosts, (item) => item.environment?.name ?? "unassigned", events, "environment"),
      relatedChanges,
      source: "seeded-demo",
      generatedAt: new Date().toISOString(),
    };
  }
}

function buildTrend(costs: CostRecord[], events: EventRecord[], splitAt: Date) {
  const grouped = new Map<string, number>();
  for (const cost of costs) {
    const date = cost.periodStart.toISOString().slice(0, 10);
    grouped.set(date, (grouped.get(date) ?? 0) + numberValue(cost.amount));
  }
  const eventIdsByDate = new Map<string, string[]>();
  for (const event of events) {
    const date = event.happenedAt.toISOString().slice(0, 10);
    eventIdsByDate.set(date, [...(eventIdsByDate.get(date) ?? []), event.id]);
  }
  const points = [...grouped.entries()].map(([date, amount]) => ({ date, amount, relatedChangeIds: eventIdsByDate.get(date) ?? [] }));
  const baselinePoints = points.filter((point) => new Date(`${point.date}T00:00:00.000Z`) < splitAt);
  const baseline = baselinePoints.length === 0 ? 0 : sum(baselinePoints.map((point) => point.amount)) / baselinePoints.length;
  return points.map((point) => ({ ...point, isAnomaly: baseline > 0 && point.amount > baseline * 1.05 }));
}

function buildBreakdown(
  allCosts: CostRecord[],
  currentCosts: CostRecord[],
  previousCosts: CostRecord[],
  labelFor: (cost: CostRecord) => string,
  events: EventRecord[],
  breakdownKind: "service" | "environment",
): CostBreakdownRow[] {
  const labels = unique(allCosts.map(labelFor));
  return labels.map((label) => {
    const currentPeriodCost = sum(currentCosts.filter((item) => labelFor(item) === label).map((item) => item.amount));
    const previousPeriodCost = sum(previousCosts.filter((item) => labelFor(item) === label).map((item) => item.amount));
    const delta = currentPeriodCost - previousPeriodCost;
    const relatedChangeIds = events
      .filter((event) =>
        breakdownKind === "service"
          ? event.resourceChanges.some((change) => change.cloudResource?.service === label)
          : event.environment?.name === label,
      )
      .map((event) => event.id);
    return { label, currentPeriodCost, previousPeriodCost, delta, deltaPercent: previousPeriodCost === 0 ? null : (delta / previousPeriodCost) * 100, relatedChangeIds };
  }).sort((left, right) => right.currentPeriodCost - left.currentPeriodCost);
}

function toTimelineEvent(event: EventRecord): TimelineEvent {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    eventType: event.eventType,
    source: event.source,
    environment: event.environment?.name ?? null,
    actorName: event.actorName,
    actorType: event.actorType,
    happenedAt: event.happenedAt.toISOString(),
    impactLevel: event.impactSummary?.overallImpactLevel ?? event.riskLevel,
    summary: event.impactSummary?.summaryText ?? event.description,
    costDeltaMonthlyProjected: numberValue(event.impactSummary?.costDeltaMonthlyProjected),
    resourceDelta: resourceDelta(event.resourceChanges),
    securityDelta: { introduced: event.impactSummary?.newSecurityFindingsCount ?? event.introducedFindings.length, resolved: event.impactSummary?.resolvedSecurityFindingsCount ?? event.resolvedFindings.length, highestSeverity: event.impactSummary?.highestSeverity ?? null },
  };
}

function groupBy(items: CostRecord[], key: (item: CostRecord) => string) {
  const groups = new Map<string, CostRecord[]>();
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return groups;
}
function largestLabel(groups: Map<string, CostRecord[]>) { return [...groups.entries()].sort((left, right) => sum(right[1].map((item) => item.amount)) - sum(left[1].map((item) => item.amount)))[0]?.[0] ?? null; }
function unique(values: string[]) { return [...new Set(values)]; }
function sum(values: Array<unknown>): number { return values.reduce<number>((total, value) => total + numberValue(value), 0); }
function numberValue(value: unknown): number { return value === undefined || value === null ? 0 : Number(value); }
function toDisplayName(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function resourceDelta(changes: Array<{ action: string }>) { const created = changes.filter((change) => change.action === "created").length; const updated = changes.filter((change) => change.action === "updated").length; const deleted = changes.filter((change) => change.action === "deleted").length; return { created, updated, deleted, total: changes.length }; }

type CostRecord = { service: string; periodStart: Date; amount: unknown; environment: { name: string } | null };
type EventRecord = { id: string; title: string; description: string | null; eventType: string; source: string; actorName: string; actorType: string; happenedAt: Date; riskLevel: string; environment: { name: string } | null; impactSummary: { summaryText: string; costDeltaMonthlyProjected: unknown; newSecurityFindingsCount: number; resolvedSecurityFindingsCount: number; highestSeverity: string | null; overallImpactLevel: string } | null; resourceChanges: Array<{ action: string; cloudResource: { service: string } | null }>; introducedFindings: Array<{ id: string }>; resolvedFindings: Array<{ id: string }> };
