import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  EnvironmentFilter,
  FindingSummary,
  ResourceDetailResponse,
  ResourceFilters,
  ResourceInventoryResponse,
  ResourceSummary,
  TimelineEvent,
} from "@cloudflux/contracts";

import { PrismaService } from "../../common/prisma/prisma.service";

const DEMO_WORKSPACE_SLUG = "acme-cloud-demo";

@Injectable()
export class ResourcesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getResources(filters: ResourceFilters): Promise<ResourceInventoryResponse> {
    const workspace = await this.getWorkspace();
    const environmentId = this.environmentId(workspace.environments, filters.environment);
    const latestEvent = await this.prisma.changeEvent.findFirst({
      where: { workspaceId: workspace.id },
      orderBy: { happenedAt: "desc" },
      select: { happenedAt: true },
    });
    const recentSince = new Date(latestEvent?.happenedAt ?? new Date());
    recentSince.setUTCDate(recentSince.getUTCDate() - 30);

    const resources = await this.prisma.cloudResource.findMany({
      where: { workspaceId: workspace.id, ...(environmentId ? { environmentId } : {}) },
      include: {
        environment: { select: { name: true } },
        costSnapshots: { orderBy: { periodStart: "desc" }, select: { periodStart: true, amount: true } },
        securityFindings: { where: { status: "open" }, select: { id: true } },
        resourceChanges: { select: { changeEvent: { select: { happenedAt: true } } } },
      },
      orderBy: { name: "asc" },
    });

    const summaries = resources.map((resource) => toResourceSummary(resource, recentSince));
    const filtered = summaries.filter((resource) => matchesFilters(resource, filters));

    return {
      ...this.context(workspace),
      filters,
      filterOptions: {
        services: unique(summaries.map((item) => item.service)),
        resourceTypes: unique(summaries.map((item) => item.resourceType)),
        regions: unique(summaries.map((item) => item.region)),
        statuses: unique(summaries.map((item) => item.status)),
        owners: unique(summaries.map((item) => item.owner).filter((item): item is string => Boolean(item))),
      },
      resources: filtered,
      total: filtered.length,
      generatedAt: new Date().toISOString(),
    };
  }

  async getResourceDetail(resourceId: string): Promise<ResourceDetailResponse> {
    const workspace = await this.getWorkspace();
    const resource = await this.prisma.cloudResource.findFirst({
      where: { id: resourceId, workspaceId: workspace.id },
      include: {
        environment: { select: { name: true } },
        snapshots: { orderBy: { capturedAt: "desc" }, take: 12 },
        costSnapshots: { orderBy: { periodStart: "asc" } },
        securityFindings: { orderBy: { detectedAt: "desc" }, include: { environment: { select: { name: true } }, cloudResource: { select: { name: true } } } },
        resourceChanges: {
          orderBy: { createdAt: "desc" },
          include: {
            changeEvent: {
              include: {
                environment: { select: { name: true } },
                impactSummary: true,
                resourceChanges: { select: { action: true } },
                introducedFindings: { select: { id: true } },
                resolvedFindings: { select: { id: true } },
              },
            },
          },
        },
      },
    });

    if (!resource) throw new NotFoundException("Resource not found.");

    const latestEvent = await this.prisma.changeEvent.findFirst({
      where: { workspaceId: workspace.id },
      orderBy: { happenedAt: "desc" },
      select: { happenedAt: true },
    });
    const recentSince = new Date(latestEvent?.happenedAt ?? new Date());
    recentSince.setUTCDate(recentSince.getUTCDate() - 30);
    const summary = toResourceSummary(resource, recentSince);
    const relatedEvents = uniqueEvents(resource.resourceChanges.map((item) => toTimelineEvent(item.changeEvent)));

    return {
      ...this.context(workspace),
      resource: summary,
      snapshots: resource.snapshots.map((snapshot) => ({
        id: snapshot.id,
        capturedAt: snapshot.capturedAt.toISOString(),
        normalizedStatus: snapshot.normalizedStatus,
        configuration: snapshot.configuration,
        tags: snapshot.tags,
      })),
      costTrend: buildCostTrend(resource.costSnapshots),
      findings: resource.securityFindings.map(toFindingSummary),
      relatedChanges: relatedEvents,
    };
  }

  private async getWorkspace() {
    const workspace = await this.prisma.workspace.findUnique({
      where: { slug: DEMO_WORKSPACE_SLUG },
      include: { cloudAccounts: { orderBy: { createdAt: "asc" }, take: 1 }, environments: { orderBy: { name: "asc" } } },
    });
    if (!workspace?.cloudAccounts[0]) throw new NotFoundException("Demo workspace has not been seeded yet.");
    return workspace;
  }

  private context(workspace: WorkspaceRecord) {
    const cloudAccount = workspace.cloudAccounts[0];
    if (!cloudAccount) throw new NotFoundException("Demo cloud account has not been seeded yet.");
    return {
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug, status: "active" as const },
      cloudAccount: {
        id: cloudAccount.id,
        name: cloudAccount.accountName,
        provider: cloudAccount.provider as "aws",
        mode: cloudAccount.mode as "demo" | "connected",
        connectionStatus: cloudAccount.connectionStatus as "demo" | "pending" | "active" | "error" | "disabled",
      },
      environments: workspace.environments.map((item) => ({
        id: item.id,
        name: item.name as "development" | "staging" | "production",
        displayName: toDisplayName(item.name),
        criticality: item.criticality as "low" | "medium" | "high",
      })),
    };
  }

  private environmentId(environments: Array<{ id: string; name: string }>, environment: EnvironmentFilter) {
    return environment === "all" ? undefined : environments.find((item) => item.name === environment)?.id;
  }
}

function toResourceSummary(resource: ResourceRecord, recentSince: Date): ResourceSummary {
  const latestCostDate = resource.costSnapshots[0]?.periodStart;
  const latestDateKey = latestCostDate?.toISOString().slice(0, 10);
  const estimatedMonthlyCost = latestDateKey
    ? resource.costSnapshots.filter((item) => item.periodStart.toISOString().slice(0, 10) === latestDateKey).reduce((total, item) => total + numberValue(item.amount), 0) * 30
    : 0;
  const lastChangedAt = maxDate(resource.resourceChanges.map((item) => item.changeEvent.happenedAt));
  return {
    id: resource.id,
    name: resource.name,
    externalResourceId: resource.externalResourceId,
    arn: resource.arn,
    service: resource.service,
    resourceType: resource.resourceType,
    region: resource.region,
    status: resource.status,
    owner: resource.owner,
    tags: resource.tags,
    environment: resource.environment.name,
    estimatedMonthlyCost,
    openFindingsCount: resource.securityFindings.length,
    changedRecently: Boolean(lastChangedAt && lastChangedAt >= recentSince),
    lastChangedAt: lastChangedAt?.toISOString() ?? null,
    lastSeenAt: resource.lastSeenAt.toISOString(),
  };
}

function matchesFilters(resource: ResourceSummary, filters: ResourceFilters) {
  return (
    (filters.service === "all" || resource.service === filters.service) &&
    (filters.resourceType === "all" || resource.resourceType === filters.resourceType) &&
    (filters.region === "all" || resource.region === filters.region) &&
    (filters.status === "all" || resource.status === filters.status) &&
    (filters.owner === "all" || resource.owner === filters.owner) &&
    (filters.hasFindings === null || (resource.openFindingsCount > 0) === filters.hasFindings) &&
    (filters.changedRecently === null || resource.changedRecently === filters.changedRecently) &&
    (filters.minMonthlyCost === null || resource.estimatedMonthlyCost >= filters.minMonthlyCost)
  );
}

function toFindingSummary(finding: FindingRecord): FindingSummary {
  return {
    id: finding.id,
    title: finding.title,
    description: finding.description,
    severity: finding.severity,
    category: finding.category,
    status: finding.status,
    detectedAt: finding.detectedAt.toISOString(),
    resolvedAt: finding.resolvedAt?.toISOString() ?? null,
    resourceId: finding.cloudResourceId,
    resourceName: finding.cloudResource?.name ?? null,
    environment: finding.environment?.name ?? null,
    remediation: finding.remediation,
    introducedByChangeEventId: finding.introducedByChangeEventId,
    resolvedByChangeEventId: finding.resolvedByChangeEventId,
  };
}

function buildCostTrend(costs: Array<{ periodStart: Date; amount: unknown }>) {
  const grouped = new Map<string, number>();
  for (const cost of costs) {
    const date = cost.periodStart.toISOString().slice(0, 10);
    grouped.set(date, (grouped.get(date) ?? 0) + numberValue(cost.amount));
  }
  return [...grouped.entries()].map(([date, amount]) => ({ date, amount }));
}

function toTimelineEvent(event: RelatedEventRecord): TimelineEvent {
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
    securityDelta: {
      introduced: event.impactSummary?.newSecurityFindingsCount ?? event.introducedFindings.length,
      resolved: event.impactSummary?.resolvedSecurityFindingsCount ?? event.resolvedFindings.length,
      highestSeverity: event.impactSummary?.highestSeverity ?? null,
    },
  };
}

function resourceDelta(changes: Array<{ action: string }>) {
  const created = changes.filter((change) => change.action === "created").length;
  const updated = changes.filter((change) => change.action === "updated").length;
  const deleted = changes.filter((change) => change.action === "deleted").length;
  return { created, updated, deleted, total: changes.length };
}

function uniqueEvents(events: TimelineEvent[]) {
  return [...new Map(events.map((event) => [event.id, event])).values()];
}

function unique(values: string[]) { return [...new Set(values)].sort(); }
function maxDate(values: Date[]) { return values.sort((left, right) => right.getTime() - left.getTime())[0]; }
function numberValue(value: unknown): number { return value === undefined || value === null ? 0 : Number(value); }
function toDisplayName(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }

type WorkspaceRecord = {
  id: string;
  name: string;
  slug: string;
  cloudAccounts: Array<{ id: string; accountName: string; provider: string; mode: string; connectionStatus: string }>;
  environments: Array<{ id: string; name: string; criticality: string }>;
};

type ResourceRecord = {
  id: string;
  name: string;
  externalResourceId: string;
  arn: string | null;
  service: string;
  resourceType: string;
  region: string;
  status: string;
  owner: string | null;
  tags: unknown;
  lastSeenAt: Date;
  environment: { name: string };
  costSnapshots: Array<{ periodStart: Date; amount: unknown }>;
  securityFindings: Array<{ id: string }>;
  resourceChanges: Array<{ changeEvent: { happenedAt: Date } }>;
};

type FindingRecord = {
  id: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  status: string;
  detectedAt: Date;
  resolvedAt: Date | null;
  cloudResourceId: string | null;
  cloudResource: { name: string } | null;
  environment: { name: string } | null;
  remediation: string;
  introducedByChangeEventId: string | null;
  resolvedByChangeEventId: string | null;
};

type RelatedEventRecord = {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  source: string;
  actorName: string;
  actorType: string;
  happenedAt: Date;
  riskLevel: string;
  environment: { name: string } | null;
  impactSummary: { summaryText: string; costDeltaMonthlyProjected: unknown; newSecurityFindingsCount: number; resolvedSecurityFindingsCount: number; highestSeverity: string | null; overallImpactLevel: string } | null;
  resourceChanges: Array<{ action: string }>;
  introducedFindings: Array<{ id: string }>;
  resolvedFindings: Array<{ id: string }>;
};
