import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  ImpactDetailFinding,
  ImpactDetailResponse,
  ImpactDetailResourceChange,
  ImpactDetailSnapshot,
  TimelineEvent,
} from "@cloudflux/contracts";

import { PrismaService } from "../../common/prisma/prisma.service";

const DEMO_WORKSPACE_SLUG = "acme-cloud-demo";

@Injectable()
export class ImpactService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getImpactDetail(changeEventId: string): Promise<ImpactDetailResponse> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { slug: DEMO_WORKSPACE_SLUG },
      include: {
        cloudAccounts: { orderBy: { createdAt: "asc" }, take: 1 },
      },
    });
    const cloudAccount = workspace?.cloudAccounts[0];

    if (!workspace || !cloudAccount) {
      throw new NotFoundException("Demo workspace has not been seeded yet.");
    }

    const event = await this.prisma.changeEvent.findFirst({
      where: { id: changeEventId, workspaceId: workspace.id },
      include: {
        environment: { select: { name: true } },
        impactSummary: true,
        aiInsights: { orderBy: { generatedAt: "desc" }, take: 1 },
        resourceChanges: {
          orderBy: { createdAt: "asc" },
          include: {
            cloudResource: {
              include: { environment: { select: { name: true } } },
            },
            beforeSnapshot: true,
            afterSnapshot: true,
          },
        },
        introducedFindings: {
          orderBy: { detectedAt: "asc" },
          include: { cloudResource: { select: { name: true } } },
        },
        resolvedFindings: {
          orderBy: { detectedAt: "asc" },
          include: { cloudResource: { select: { name: true } } },
        },
      },
    });

    if (!event) {
      throw new NotFoundException("Change event not found.");
    }

    const relatedEvents = await this.prisma.changeEvent.findMany({
      where: {
        workspaceId: workspace.id,
        id: { not: event.id },
        ...(event.environmentId ? { environmentId: event.environmentId } : {}),
      },
      orderBy: { happenedAt: "desc" },
      take: 4,
      include: {
        environment: { select: { name: true } },
        impactSummary: true,
        resourceChanges: { select: { action: true } },
        introducedFindings: { select: { id: true } },
        resolvedFindings: { select: { id: true } },
      },
    });

    const resourceChanges = event.resourceChanges.map(toResourceChange);
    const introduced = event.introducedFindings.map(toFinding);
    const resolved = event.resolvedFindings.map(toFinding);
    const resourceDelta = resourceDeltaFor(event.resourceChanges);
    const securityDelta = {
      introduced: event.impactSummary?.newSecurityFindingsCount ?? introduced.length,
      resolved: event.impactSummary?.resolvedSecurityFindingsCount ?? resolved.length,
      highestSeverity: event.impactSummary?.highestSeverity ?? highestSeverity(introduced),
    };

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
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        eventType: event.eventType,
        source: event.source,
        environment: event.environment?.name ?? null,
        actorName: event.actorName,
        actorType: event.actorType,
        happenedAt: event.happenedAt.toISOString(),
        externalReference: event.externalReference,
        riskLevel: event.riskLevel,
      },
      impact: {
        summaryTitle: event.impactSummary?.summaryTitle ?? event.title,
        summaryText: event.impactSummary?.summaryText ?? event.description ?? "No impact summary available.",
        overallImpactLevel: event.impactSummary?.overallImpactLevel ?? event.riskLevel,
        costDeltaDaily: numberValue(event.impactSummary?.costDeltaDaily),
        costDeltaMonthlyProjected: numberValue(event.impactSummary?.costDeltaMonthlyProjected),
        currency: "USD",
        resourceDelta,
        securityDelta,
        generatedAt: (event.impactSummary?.generatedAt ?? event.happenedAt).toISOString(),
      },
      aiInsight: event.aiInsights[0]
        ? {
            id: event.aiInsights[0].id,
            title: event.aiInsights[0].title,
            content: event.aiInsights[0].content,
            generatedAt: event.aiInsights[0].generatedAt.toISOString(),
          }
        : null,
      resourceChanges,
      costImpact: {
        dailyDelta: numberValue(event.impactSummary?.costDeltaDaily),
        monthlyProjectedDelta: numberValue(event.impactSummary?.costDeltaMonthlyProjected),
        currency: "USD",
        source: "seeded-demo",
        affectedServices: [...new Set(resourceChanges.map((change) => change.resource.service))].sort(),
      },
      securityImpact: { introduced, resolved },
      reviewActions: buildReviewActions(event, introduced),
      relatedEvents: relatedEvents.map(toTimelineEvent),
      technicalDetails: {
        externalReference: event.externalReference,
        metadata: event.metadata,
        source: event.source,
        snapshotIds: resourceChanges.flatMap((change) =>
          [change.beforeSnapshot?.id, change.afterSnapshot?.id].filter(
            (value): value is string => Boolean(value),
          ),
        ),
      },
    };
  }
}

function toResourceChange(change: ResourceChangeRecord): ImpactDetailResourceChange {
  return {
    id: change.id,
    action: change.action,
    summary: change.summary,
    resource: {
      id: change.cloudResource.id,
      name: change.cloudResource.name,
      service: change.cloudResource.service,
      resourceType: change.cloudResource.resourceType,
      region: change.cloudResource.region,
      status: change.cloudResource.status,
      owner: change.cloudResource.owner,
      environment: change.cloudResource.environment.name,
    },
    beforeSnapshot: toSnapshot(change.beforeSnapshot),
    afterSnapshot: toSnapshot(change.afterSnapshot),
  };
}

function toSnapshot(snapshot: SnapshotRecord | null): ImpactDetailSnapshot | null {
  if (!snapshot) return null;
  return {
    id: snapshot.id,
    capturedAt: snapshot.capturedAt.toISOString(),
    configuration: snapshot.configuration,
    normalizedStatus: snapshot.normalizedStatus,
    tags: snapshot.tags,
  };
}

function toFinding(finding: FindingRecord): ImpactDetailFinding {
  return {
    id: finding.id,
    title: finding.title,
    description: finding.description,
    severity: finding.severity,
    category: finding.category,
    status: finding.status,
    detectedAt: finding.detectedAt.toISOString(),
    resolvedAt: finding.resolvedAt?.toISOString() ?? null,
    resourceName: finding.cloudResource?.name ?? null,
    remediation: finding.remediation,
    evidence: finding.evidence,
  };
}

function resourceDeltaFor(changes: Array<{ action: string }>) {
  const created = changes.filter((change) => change.action === "created").length;
  const updated = changes.filter((change) => change.action === "updated").length;
  const deleted = changes.filter((change) => change.action === "deleted").length;
  return { created, updated, deleted, total: changes.length };
}

function highestSeverity(findings: ImpactDetailFinding[]) {
  const order = ["critical", "high", "medium", "low"];
  return findings.map((finding) => finding.severity).sort((left, right) => order.indexOf(left) - order.indexOf(right))[0] ?? null;
}

function buildReviewActions(event: EventRecord, introduced: ImpactDetailFinding[]) {
  const actions: ImpactDetailResponse["reviewActions"] = [];

  if (introduced.length > 0) {
    actions.push({
      priority: "high",
      title: "Review introduced security findings",
      description: introduced[0]?.remediation ?? "Review the introduced finding and confirm its remediation path.",
    });
  }

  if (numberValue(event.impactSummary?.costDeltaMonthlyProjected) !== 0) {
    actions.push({
      priority: "medium",
      title: "Validate the projected cost change",
      description: "Confirm the additional capacity and network spend are expected for this change.",
    });
  }

  actions.push({
    priority: "low",
    title: "Confirm the change source and intent",
    description: event.externalReference
      ? `Review the deployment or event reference ${event.externalReference} against the intended release.`
      : "Compare this event with the intended deployment or infrastructure change.",
  });

  return actions;
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
    resourceDelta: resourceDeltaFor(event.resourceChanges),
    securityDelta: {
      introduced: event.impactSummary?.newSecurityFindingsCount ?? event.introducedFindings.length,
      resolved: event.impactSummary?.resolvedSecurityFindingsCount ?? event.resolvedFindings.length,
      highestSeverity: event.impactSummary?.highestSeverity ?? null,
    },
  };
}

function numberValue(value: unknown): number {
  return value === undefined || value === null ? 0 : Number(value);
}

type ResourceChangeRecord = {
  id: string;
  action: string;
  summary: string;
  cloudResource: {
    id: string;
    name: string;
    service: string;
    resourceType: string;
    region: string;
    status: string;
    owner: string | null;
    environment: { name: string };
  };
  beforeSnapshot: SnapshotRecord | null;
  afterSnapshot: SnapshotRecord | null;
};

type SnapshotRecord = {
  id: string;
  capturedAt: Date;
  configuration: unknown;
  normalizedStatus: string;
  tags: unknown;
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
  remediation: string;
  evidence: unknown;
  cloudResource: { name: string } | null;
};

type EventRecord = {
  externalReference: string | null;
  impactSummary: { costDeltaMonthlyProjected: unknown } | null;
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
  impactSummary: {
    summaryText: string;
    costDeltaMonthlyProjected: unknown;
    newSecurityFindingsCount: number;
    resolvedSecurityFindingsCount: number;
    highestSeverity: string | null;
    overallImpactLevel: string;
  } | null;
  resourceChanges: Array<{ action: string }>;
  introducedFindings: Array<{ id: string }>;
  resolvedFindings: Array<{ id: string }>;
};
