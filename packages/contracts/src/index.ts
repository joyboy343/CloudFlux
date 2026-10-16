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
