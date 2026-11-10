import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  FindingSummary,
  SecurityFindingDetailResponse,
  SecurityFilters,
  SecurityFindingsResponse,
  TimelineEvent,
} from "@cloudflux/contracts";

import { PrismaService } from "../../common/prisma/prisma.service";

const DEMO_WORKSPACE_SLUG = "acme-cloud-demo";

@Injectable()
export class SecurityService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getFindings(filters: SecurityFilters): Promise<SecurityFindingsResponse> {
    const workspace = await this.getWorkspace();
    const environmentId = filters.environment === "all" ? undefined : workspace.environments.find((item) => item.name === filters.environment)?.id;
    const findings = await this.prisma.securityFinding.findMany({
      where: { workspaceId: workspace.id, ...(environmentId ? { environmentId } : {}) },
      orderBy: [{ severity: "asc" }, { detectedAt: "desc" }],
      include: { environment: { select: { name: true } }, cloudResource: { select: { name: true } } },
    });
    const filtered = findings.filter((finding) =>
      (filters.severity === "all" || finding.severity === filters.severity) &&
      (filters.status === "all" || finding.status === filters.status) &&
      (filters.category === "all" || finding.category === filters.category) &&
      (filters.resourceId === "all" || finding.cloudResourceId === filters.resourceId),
    );

    return {
      ...this.context(workspace),
      filters,
      filterOptions: {
        severities: unique(findings.map((item) => item.severity)),
        statuses: unique(findings.map((item) => item.status)),
        categories: unique(findings.map((item) => item.category)),
      },
      findings: filtered.map(toFindingSummary),
      total: filtered.length,
      generatedAt: new Date().toISOString(),
    };
  }

  async getFindingDetail(findingId: string): Promise<SecurityFindingDetailResponse> {
    const workspace = await this.getWorkspace();
    const finding = await this.prisma.securityFinding.findFirst({
      where: { id: findingId, workspaceId: workspace.id },
      include: {
        environment: { select: { name: true } },
        cloudResource: { select: { id: true, name: true } },
        introducedByChangeEvent: { include: eventInclude() },
        resolvedByChangeEvent: { include: eventInclude() },
      },
    });
    if (!finding) throw new NotFoundException("Security finding not found.");

    const relatedFindings = finding.cloudResourceId
      ? await this.prisma.securityFinding.findMany({
          where: { workspaceId: workspace.id, cloudResourceId: finding.cloudResourceId, id: { not: finding.id } },
          take: 5,
          orderBy: { detectedAt: "desc" },
          include: { environment: { select: { name: true } }, cloudResource: { select: { name: true } } },
        })
      : [];

    return {
      ...this.context(workspace),
      finding: { ...toFindingSummary(finding), evidence: finding.evidence },
      introducedByChange: finding.introducedByChangeEvent ? toTimelineEvent(finding.introducedByChangeEvent) : null,
      resolvedByChange: finding.resolvedByChangeEvent ? toTimelineEvent(finding.resolvedByChangeEvent) : null,
      relatedFindings: relatedFindings.map(toFindingSummary),
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
}

function eventInclude() {
  return {
    environment: { select: { name: true } },
    impactSummary: true,
    resourceChanges: { select: { action: true } },
    introducedFindings: { select: { id: true } },
    resolvedFindings: { select: { id: true } },
  } as const;
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

function unique(values: string[]) { return [...new Set(values)].sort(); }
function numberValue(value: unknown): number { return value === undefined || value === null ? 0 : Number(value); }
function toDisplayName(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }

type WorkspaceRecord = {
  id: string;
  name: string;
  slug: string;
  cloudAccounts: Array<{ id: string; accountName: string; provider: string; mode: string; connectionStatus: string }>;
  environments: Array<{ id: string; name: string; criticality: string }>;
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
  cloudResource: { id?: string; name: string } | null;
  environment: { name: string } | null;
  remediation: string;
  introducedByChangeEventId: string | null;
  resolvedByChangeEventId: string | null;
};

type EventRecord = {
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
