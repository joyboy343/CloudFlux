import type {
  EnvironmentFilter,
  OverviewRangeDays,
  OverviewResponse,
} from "@cloudflux/contracts";

import { AppShell } from "../../components/app-shell/app-shell";
import { formatSignedUsd, formatUsd } from "../../lib/formatting/currency";

export const dynamic = "force-dynamic";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001/api";

type OverviewPageProps = {
  searchParams: Promise<{
    environment?: string;
    rangeDays?: string;
  }>;
};

export default async function OverviewPage({ searchParams }: OverviewPageProps) {
  const params = await searchParams;
  const environment = normalizeEnvironment(params.environment);
  const rangeDays = normalizeRangeDays(params.rangeDays);
  const overview = await getOverview(environment, rangeDays);

  return (
    <AppShell
      workspace={overview.workspace}
      cloudAccount={overview.cloudAccount}
      selectedEnvironment={overview.filters.environment}
      rangeDays={overview.filters.rangeDays}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-accent">Overview</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
              Latest cloud change impact
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              See what changed in the workspace, how it affected cost and security, and what deserves
              review next.
            </p>
          </div>
          <FilterForm overview={overview} />
        </section>

        {overview.latestImpact ? (
          <LatestImpactCard overview={overview} />
        ) : (
          <section className="rounded-lg border border-line bg-white p-6 shadow-panel">
            <p className="text-sm font-semibold text-slate-950">No high-impact changes in this view</p>
            <p className="mt-2 text-sm text-muted">
              Try a wider time range or reset the environment filter to continue investigating.
            </p>
          </section>
        )}

        <MetricsGrid overview={overview} />

        <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <CostTrendCard overview={overview} />
          <SecuritySummaryCard overview={overview} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <RecentChangesCard overview={overview} />
          <ResourceDistributionCard overview={overview} />
        </section>

        <InsightCard overview={overview} />
      </div>
    </AppShell>
  );
}

async function getOverview(
  environment: EnvironmentFilter,
  rangeDays: OverviewRangeDays,
): Promise<OverviewResponse> {
  const response = await fetch(
    `${apiBaseUrl}/overview?environment=${environment}&rangeDays=${rangeDays}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(`Overview API returned ${response.status}. Start the CloudFlux API first.`);
  }

  return (await response.json()) as OverviewResponse;
}

function FilterForm({ overview }: { overview: OverviewResponse }) {
  return (
    <form
      action="/overview"
      method="get"
      className="flex flex-wrap items-end gap-2 rounded-lg border border-line bg-white p-3 shadow-panel"
    >
      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
        Environment
        <select
          name="environment"
          defaultValue={overview.filters.environment}
          className="rounded-md border border-line bg-white px-2.5 py-2 text-sm font-medium text-slate-800 outline-none focus:border-accent"
        >
          <option value="all">All environments</option>
          {overview.environments.map((environment) => (
            <option key={environment.id} value={environment.name}>
              {environment.displayName}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
        Time range
        <select
          name="rangeDays"
          defaultValue={overview.filters.rangeDays}
          className="rounded-md border border-line bg-white px-2.5 py-2 text-sm font-medium text-slate-800 outline-none focus:border-accent"
        >
          <option value="7">7 days</option>
          <option value="30">30 days</option>
          <option value="90">90 days</option>
        </select>
      </label>
      <button
        type="submit"
        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
      >
        Apply
      </button>
    </form>
  );
}

function LatestImpactCard({ overview }: { overview: OverviewResponse }) {
  const impact = overview.latestImpact;
  if (!impact) return null;

  return (
    <section className="rounded-lg border border-orange-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <ImpactBadge level={impact.impactLevel} />
            <span className="text-sm text-muted">
              {formatLabel(impact.environment)} · {formatLabel(impact.source)} · {formatDate(impact.happenedAt)}
            </span>
          </div>
          <h2 className="mt-3 text-xl font-semibold tracking-normal text-slate-950">
            {impact.title}
          </h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{impact.description}</p>
          <div className="mt-4 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-950">
            <span className="font-semibold">Review next: </span>{impact.reviewAction}
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-3 gap-3 text-center lg:min-w-96">
          <ImpactStat label="monthly" value={formatSignedUsd(impact.costDeltaMonthlyProjected)} />
          <ImpactStat label="resources" value={String(impact.resourceDelta.total)} />
          <ImpactStat label="findings" value={String(impact.securityDelta.introduced)} />
        </div>
      </div>
    </section>
  );
}

function MetricsGrid({ overview }: { overview: OverviewResponse }) {
  const { metrics } = overview;
  const cards = [
    {
      label: "Projected monthly cost",
      value: formatUsd(metrics.projectedMonthlyCost),
      detail: `Latest change ${formatSignedUsd(metrics.latestChangeCostDelta)}`,
    },
    {
      label: "Open security findings",
      value: String(metrics.openFindings.total),
      detail: `${metrics.openFindings.high} high · ${metrics.openFindings.medium} medium`,
    },
    {
      label: "Active resources",
      value: String(metrics.activeResourceCount),
      detail: "Across the selected environments",
    },
    {
      label: "Recent changes",
      value: String(metrics.recentChangeCount),
      detail: `${overview.filters.rangeDays}-day investigation window`,
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-line bg-white p-4 shadow-panel">
          <div className="text-sm text-muted">{card.label}</div>
          <div className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">{card.value}</div>
          <div className="mt-2 text-xs text-slate-500">{card.detail}</div>
        </div>
      ))}
    </section>
  );
}

function CostTrendCard({ overview }: { overview: OverviewResponse }) {
  const maximum = Math.max(...overview.costTrend.map((point) => point.amount), 1);

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-normal text-slate-950">Daily cost trend</h2>
          <p className="mt-1 text-sm text-muted">Estimated spend in the selected view</p>
        </div>
        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">USD</span>
      </div>
      <div className="mt-6 flex h-40 items-end gap-1 border-b border-line pb-0">
        {overview.costTrend.map((point) => (
          <div key={point.date} className="group relative flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t-sm bg-blue-500 transition-colors group-hover:bg-blue-700"
              style={{ height: `${Math.max((point.amount / maximum) * 100, 5)}%` }}
              title={`${point.date}: ${formatUsd(point.amount)}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-xs text-slate-500">
        <span>{overview.costTrend[0]?.date ?? "No data"}</span>
        <span>{overview.costTrend.at(-1)?.date ?? "No data"}</span>
      </div>
    </section>
  );
}

function SecuritySummaryCard({ overview }: { overview: OverviewResponse }) {
  const summary = overview.securitySummary;
  const rows = [
    ["Critical", summary.openBySeverity.critical, "text-rose-700"],
    ["High", summary.openBySeverity.high, "text-orange-700"],
    ["Medium", summary.openBySeverity.medium, "text-amber-700"],
    ["Low", summary.openBySeverity.low, "text-slate-700"],
  ] as const;

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
      <h2 className="text-base font-semibold tracking-normal text-slate-950">Security posture</h2>
      <p className="mt-1 text-sm text-muted">Open findings and movement in this time range</p>
      <div className="mt-5 space-y-3">
        {rows.map(([label, count, color]) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-slate-600">{label}</span>
            <span className={`font-semibold ${color}`}>{count}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
        <div>
          <div className="text-xs text-muted">New findings</div>
          <div className="mt-1 font-semibold text-slate-950">{summary.newFindings}</div>
        </div>
        <div>
          <div className="text-xs text-muted">Resolved</div>
          <div className="mt-1 font-semibold text-slate-950">{summary.resolvedFindings}</div>
        </div>
      </div>
      <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
        Highest-risk environment: <span className="font-semibold">{formatLabel(summary.highestRiskEnvironment)}</span>
      </div>
    </section>
  );
}

function RecentChangesCard({ overview }: { overview: OverviewResponse }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-normal text-slate-950">Recent changes</h2>
          <p className="mt-1 text-sm text-muted">The latest events in the selected view</p>
        </div>
        <span className="text-xs font-medium text-slate-500">Newest first</span>
      </div>
      <div className="mt-4 divide-y divide-line">
        {overview.recentChanges.map((change) => (
          <div key={change.id} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <div className="font-medium text-slate-900">{change.title}</div>
              <div className="mt-1 text-sm text-muted">
                {formatLabel(change.environment)} · {formatLabel(change.source)} · {formatDate(change.happenedAt)}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                {formatSignedUsd(change.costDeltaMonthlyProjected)} monthly · {change.resourceDelta.total} resources · {change.securityDelta.introduced} new findings
              </div>
            </div>
            <ImpactBadge level={change.impactLevel} />
          </div>
        ))}
      </div>
    </section>
  );
}

function ResourceDistributionCard({ overview }: { overview: OverviewResponse }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
      <h2 className="text-base font-semibold tracking-normal text-slate-950">Resource distribution</h2>
      <p className="mt-1 text-sm text-muted">Active resources in the selected view</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
        <DistributionList title="By service" items={overview.resourceDistribution.byService} />
        <DistributionList title="By environment" items={overview.resourceDistribution.byEnvironment} />
      </div>
    </section>
  );
}

function DistributionList({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; count: number }>;
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</div>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-sm">
            <span className="text-slate-700">{formatLabel(item.label)}</span>
            <span className="font-semibold text-slate-950">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightCard({ overview }: { overview: OverviewResponse }) {
  if (!overview.primaryInsight) return null;

  return (
    <section className="rounded-lg border border-blue-200 bg-blue-50 p-5 shadow-panel">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Primary AI insight</p>
          <h2 className="mt-1 text-base font-semibold text-blue-950">{overview.primaryInsight.title}</h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-blue-950/80">
            {overview.primaryInsight.content}
          </p>
        </div>
        <span className="shrink-0 rounded-md border border-blue-200 bg-white/70 px-2.5 py-1 text-xs font-medium text-blue-800">
          Generated guidance
        </span>
      </div>
      <p className="mt-4 text-xs text-blue-800">
        CloudFlux explains seeded domain facts and does not modify infrastructure.
      </p>
    </section>
  );
}

function ImpactStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-slate-50 p-3">
      <div className="text-lg font-semibold text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  );
}

function ImpactBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    high: "bg-orange-100 text-orange-800",
    medium: "bg-amber-100 text-amber-800",
    low: "bg-slate-100 text-slate-700",
    positive: "bg-emerald-100 text-emerald-800",
  };

  return (
    <span className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${styles[level] ?? styles.low}`}>
      {formatLabel(level)} impact
    </span>
  );
}

function normalizeEnvironment(value?: string): EnvironmentFilter {
  if (value === "development" || value === "staging" || value === "production") {
    return value;
  }

  return "all";
}

function normalizeRangeDays(value?: string): OverviewRangeDays {
  if (value === "7") return 7;
  if (value === "90") return 90;
  return 30;
}

function formatLabel(value: string | null) {
  if (!value) return "All environments";
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
