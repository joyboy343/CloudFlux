import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { TimelineEvent, TimelineFilters, TimelineResponse } from "@cloudflux/contracts";

import { PrismaService } from "../../common/prisma/prisma.service";

const DEMO_WORKSPACE_SLUG = "acme-cloud-demo";

@Injectable()
export class TimelineService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getTimeline(filters: TimelineFilters): Promise<TimelineResponse> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { slug: DEMO_WORKSPACE_SLUG },
      include: {
        cloudAccounts: { orderBy: { createdAt: "asc" }, take: 1 },
        environments: { orderBy: { name: "asc" } },
      },
    });

    const cloudAccount = workspace?.cloudAccounts[0];
    if (!workspace || !cloudAccount) {
      throw new NotFoundException("Demo workspace has not been seeded yet.");
    }

    const environmentId =
      filters.environment === "all"
        ? undefined
        : workspace.environments.find((item) => item.name === filters.environment)?.id;

    const latestEvent = await this.prisma.changeEvent.findFirst({
      where: { workspaceId: workspace.id, ...(environmentId ? { environmentId } : {}) },
      orderBy: { happenedAt: "desc" },
      select: { happenedAt: true },
    });
    const latestDataAt = latestEvent?.happenedAt ?? new Date();
    const rangeStart = new Date(latestDataAt);
    rangeStart.setUTCDate(rangeStart.getUTCDate() - filters.rangeDays + 1);

    const events = await this.prisma.changeEvent.findMany({
      where: {
        workspaceId: workspace.id,
        happenedAt: { gte: rangeStart },
        ...(environmentId ? { environmentId } : {}),
      },
      orderBy: { happenedAt: "desc" },
      include: {
        environment: { select: { name: true } },
        impactSummary: true,
        resourceChanges: { select: { action: true } },
        introducedFindings: { select: { id: true } },
        resolvedFindings: { select: { id: true } },
      },
    });

    const filteredEvents = events.filter((event) => matchesFilters(event, filters));
    const eventTypes = unique(events.map((event) => event.eventType));
    const sources = unique(events.map((event) => event.source));
    const impactLevels = unique(events.map((event) => impactLevel(event)));

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
      filters,
      filterOptions: { eventTypes, sources, impactLevels },
      events: filteredEvents.map(toTimelineEvent),
      total: filteredEvents.length,
      generatedAt: new Date().toISOString(),
    };
  }
}

function matchesFilters(event: TimelineEventRecord, filters: TimelineFilters) {
  const eventImpact = impactLevel(event);
  const hasSecurity = event.introducedFindings.length + event.resolvedFindings.length > 0;
  const hasCost = Math.abs(numberValue(event.impactSummary?.costDeltaMonthlyProjected)) > 0;
  const isManual = event.source === "aws_console" || event.actorType === "user" || event.eventType.includes("manual");

  return (
    (filters.eventType === "all" || event.eventType === filters.eventType) &&
    (filters.source === "all" || event.source === filters.source) &&
    (filters.impactLevel === "all" || eventImpact === filters.impactLevel) &&
    (filters.hasSecurityFindings === null || hasSecurity === filters.hasSecurityFindings) &&
    (filters.hasCostImpact === null || hasCost === filters.hasCostImpact) &&
    (!filters.manualOnly || isManual)
  );
}

function toTimelineEvent(event: TimelineEventRecord): TimelineEvent {
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
    impactLevel: impactLevel(event),
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

function impactLevel(event: TimelineEventRecord) {
  return event.impactSummary?.overallImpactLevel ?? event.riskLevel;
}

function unique(values: string[]) {
  return [...new Set(values)].sort();
}

function numberValue(value: unknown): number {
  return value === undefined || value === null ? 0 : Number(value);
}

function toDisplayName(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

type TimelineEventRecord = {
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
