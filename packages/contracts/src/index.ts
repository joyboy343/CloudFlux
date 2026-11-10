export const CLOUD_PROVIDER = {
  AWS: "aws",
} as const;

export const MVP_ENVIRONMENTS = ["development", "staging", "production"] as const;

export const DEFAULT_DEMO_WORKSPACE = {
  id: "workspace_acme_demo",
  name: "Acme Cloud Demo",
  slug: "acme-cloud-demo",
} as const;

export const DEFAULT_DEMO_CLOUD_ACCOUNT = {
  id: "cloud_account_acme_prod",
  name: "Acme Production AWS",
  provider: CLOUD_PROVIDER.AWS,
  mode: "demo",
} as const;

export type CloudProvider = (typeof CLOUD_PROVIDER)[keyof typeof CLOUD_PROVIDER];
export type MvpEnvironmentName = (typeof MVP_ENVIRONMENTS)[number];
export type EnvironmentFilter = "all" | MvpEnvironmentName;
export type OverviewRangeDays = 7 | 30 | 90;
export type ServiceHealth = "ok" | "degraded";
export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";
export type EnvironmentCriticality = "low" | "medium" | "high";

export interface HealthResponse {
  status: ServiceHealth;
  service: "cloudflux-api";
  version: string;
  timestamp: string;
}

export interface DemoUserContext {
  id: string;
  email: string;
  displayName: string;
  role: WorkspaceRole;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  status: "active";
}

export interface CloudAccountSummary {
  id: string;
  name: string;
  provider: CloudProvider;
  mode: "demo" | "connected";
  connectionStatus: "demo" | "pending" | "active" | "error" | "disabled";
}

export interface EnvironmentSummary {
  id: string;
  name: MvpEnvironmentName;
  displayName: string;
  criticality: EnvironmentCriticality;
}

export interface WorkspaceContextResponse {
  user: DemoUserContext;
  workspace: WorkspaceSummary;
  cloudAccount: CloudAccountSummary;
  environments: EnvironmentSummary[];
  defaults: {
    environment: EnvironmentFilter;
    rangeDays: 30;
    currency: "USD";
  };
  demoMode: {
    enabled: true;
    label: "Demo workspace";
    dataSource: "Simulated AWS data";
    observeOnly: true;
  };
}

export interface OverviewFilters {
  environment: EnvironmentFilter;
  rangeDays: OverviewRangeDays;
  currency: "USD";
}

export interface OverviewResourceDelta {
  created: number;
  updated: number;
  deleted: number;
  total: number;
}

export interface OverviewSecurityDelta {
  introduced: number;
  resolved: number;
  highestSeverity: string | null;
}

export interface OverviewLatestImpact {
  id: string;
  title: string;
  description: string | null;
  source: string;
  eventType: string;
  environment: string | null;
  actorName: string;
  happenedAt: string;
  impactLevel: string;
  costDeltaMonthlyProjected: number;
  resourceDelta: OverviewResourceDelta;
  securityDelta: OverviewSecurityDelta;
  reviewAction: string;
}

export interface OverviewMetrics {
  projectedMonthlyCost: number;
  latestChangeCostDelta: number;
  activeResourceCount: number;
  recentChangeCount: number;
  openFindings: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface OverviewSecuritySummary {
  newFindings: number;
  resolvedFindings: number;
  highestRiskEnvironment: string | null;
  openBySeverity: OverviewMetrics["openFindings"];
}

export interface OverviewRecentChange {
  id: string;
  title: string;
  source: string;
  eventType: string;
  environment: string | null;
  happenedAt: string;
  impactLevel: string;
  costDeltaMonthlyProjected: number;
  resourceDelta: OverviewResourceDelta;
  securityDelta: OverviewSecurityDelta;
}

export interface OverviewCostTrendPoint {
  date: string;
  amount: number;
}

export interface OverviewDistributionItem {
  label: string;
  count: number;
}

export interface OverviewPrimaryInsight {
  id: string;
  title: string;
  content: string;
  generatedAt: string;
}

export interface OverviewResponse {
  workspace: WorkspaceSummary;
  cloudAccount: CloudAccountSummary;
  environments: EnvironmentSummary[];
  filters: OverviewFilters;
  generatedAt: string;
  latestImpact: OverviewLatestImpact | null;
  metrics: OverviewMetrics;
  costTrend: OverviewCostTrendPoint[];
  securitySummary: OverviewSecuritySummary;
  recentChanges: OverviewRecentChange[];
  resourceDistribution: {
    byService: OverviewDistributionItem[];
    byEnvironment: OverviewDistributionItem[];
  };
  primaryInsight: OverviewPrimaryInsight | null;
}

export interface TimelineFilters {
  environment: EnvironmentFilter;
  rangeDays: OverviewRangeDays;
  eventType: string | "all";
  source: string | "all";
  impactLevel: string | "all";
  hasSecurityFindings: boolean | null;
  hasCostImpact: boolean | null;
  manualOnly: boolean;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  source: string;
  environment: string | null;
  actorName: string;
  actorType: string;
  happenedAt: string;
  impactLevel: string;
  summary: string | null;
  costDeltaMonthlyProjected: number;
  resourceDelta: OverviewResourceDelta;
  securityDelta: OverviewSecurityDelta;
}

export interface TimelineResponse {
  workspace: WorkspaceSummary;
  cloudAccount: CloudAccountSummary;
  environments: EnvironmentSummary[];
  filters: TimelineFilters;
  filterOptions: {
    eventTypes: string[];
    sources: string[];
    impactLevels: string[];
  };
  events: TimelineEvent[];
  total: number;
  generatedAt: string;
}

export interface ImpactDetailSnapshot {
  id: string;
  capturedAt: string;
  configuration: unknown;
  normalizedStatus: string;
  tags: unknown;
}

export interface ImpactDetailResourceChange {
  id: string;
  action: string;
  summary: string;
  resource: {
    id: string;
    name: string;
    service: string;
    resourceType: string;
    region: string;
    status: string;
    owner: string | null;
    environment: string;
  };
  beforeSnapshot: ImpactDetailSnapshot | null;
  afterSnapshot: ImpactDetailSnapshot | null;
}

export interface ImpactDetailFinding {
  id: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  status: string;
  detectedAt: string;
  resolvedAt: string | null;
  resourceName: string | null;
  remediation: string;
  evidence: unknown;
}

export interface ImpactDetailResponse {
  workspace: WorkspaceSummary;
  cloudAccount: CloudAccountSummary;
  event: {
    id: string;
    title: string;
    description: string | null;
    eventType: string;
    source: string;
    environment: string | null;
    actorName: string;
    actorType: string;
    happenedAt: string;
    externalReference: string | null;
    riskLevel: string;
  };
  impact: {
    summaryTitle: string;
    summaryText: string;
    overallImpactLevel: string;
    costDeltaDaily: number;
    costDeltaMonthlyProjected: number;
    currency: "USD";
    resourceDelta: OverviewResourceDelta;
    securityDelta: OverviewSecurityDelta;
    generatedAt: string;
  };
  aiInsight: OverviewPrimaryInsight | null;
  resourceChanges: ImpactDetailResourceChange[];
  costImpact: {
    dailyDelta: number;
    monthlyProjectedDelta: number;
    currency: "USD";
    source: string;
    affectedServices: string[];
  };
  securityImpact: {
    introduced: ImpactDetailFinding[];
    resolved: ImpactDetailFinding[];
  };
  reviewActions: Array<{
    priority: "high" | "medium" | "low";
    title: string;
    description: string;
  }>;
  relatedEvents: TimelineEvent[];
  technicalDetails: {
    externalReference: string | null;
    metadata: unknown;
    source: string;
    snapshotIds: string[];
  };
}

export interface ResourceSummary {
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
  environment: string;
  estimatedMonthlyCost: number;
  openFindingsCount: number;
  changedRecently: boolean;
  lastChangedAt: string | null;
  lastSeenAt: string;
}

export interface ResourceFilters {
  environment: EnvironmentFilter;
  service: string | "all";
  resourceType: string | "all";
  region: string | "all";
  status: string | "all";
  owner: string | "all";
  hasFindings: boolean | null;
  changedRecently: boolean | null;
  minMonthlyCost: number | null;
}

export interface ResourceInventoryResponse {
  workspace: WorkspaceSummary;
  cloudAccount: CloudAccountSummary;
  environments: EnvironmentSummary[];
  filters: ResourceFilters;
  filterOptions: {
    services: string[];
    resourceTypes: string[];
    regions: string[];
    statuses: string[];
    owners: string[];
  };
  resources: ResourceSummary[];
  total: number;
  generatedAt: string;
}

export interface ResourceSnapshotSummary {
  id: string;
  capturedAt: string;
  normalizedStatus: string;
  configuration: unknown;
  tags: unknown;
}

export interface ResourceCostPoint {
  date: string;
  amount: number;
}

export interface ResourceDetailResponse {
  workspace: WorkspaceSummary;
  cloudAccount: CloudAccountSummary;
  resource: ResourceSummary;
  snapshots: ResourceSnapshotSummary[];
  costTrend: ResourceCostPoint[];
  findings: FindingSummary[];
  relatedChanges: TimelineEvent[];
}

export interface FindingSummary {
  id: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  status: string;
  detectedAt: string;
  resolvedAt: string | null;
  resourceId: string | null;
  resourceName: string | null;
  environment: string | null;
  remediation: string;
  introducedByChangeEventId: string | null;
  resolvedByChangeEventId: string | null;
}

export interface SecurityFilters {
  environment: EnvironmentFilter;
  severity: string | "all";
  status: string | "all";
  category: string | "all";
  resourceId: string | "all";
}

export interface SecurityFindingsResponse {
  workspace: WorkspaceSummary;
  cloudAccount: CloudAccountSummary;
  environments: EnvironmentSummary[];
  filters: SecurityFilters;
  filterOptions: {
    severities: string[];
    statuses: string[];
    categories: string[];
  };
  findings: FindingSummary[];
  total: number;
  generatedAt: string;
}

export interface SecurityFindingDetailResponse {
  workspace: WorkspaceSummary;
  cloudAccount: CloudAccountSummary;
  finding: FindingSummary & {
    evidence: unknown;
  };
  introducedByChange: TimelineEvent | null;
  resolvedByChange: TimelineEvent | null;
  relatedFindings: FindingSummary[];
}
