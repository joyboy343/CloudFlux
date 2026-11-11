import type {
  CostResponse,
  EnvironmentFilter,
  OverviewRangeDays,
} from "@cloudflux/contracts";
import Link from "next/link";

import { AppShell } from "../../components/app-shell/app-shell";
import { formatSignedUsd, formatUsd } from "../../lib/formatting/currency";

export const dynamic = "force-dynamic";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001/api";

type CostsPageProps = {
  searchParams: Promise<{
    environment?: string;
    rangeDays?: string;
  }>;
};

export default async function CostsPage({ searchParams }: CostsPageProps) {
  const params = await searchParams;
  const environment = normalizeEnvironment(params.environment);
  const rangeDays = normalizeRangeDays(params.rangeDays);
  const costs = await getCosts(environment, rangeDays);

  return (
    <AppShell
      workspace={costs.workspace}
      cloudAccount={costs.cloudAccount}
      selectedEnvironment={costs.filters.environment}
      rangeDays={costs.filters.rangeDays}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-accent">Cost intelligence</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
              Find what moved cloud spend
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Compare spend across the selected window, isolate the biggest drivers, and follow cost movement back to the change events that explain it.
            </p>
          </div>
          <FilterForm costs={costs} />
        </section>

        <MetricsGrid costs={costs} />

        <TrendCard costs={costs} />

        <section className="grid gap-6 xl:grid-cols-2">
          <BreakdownCard title="Spend by service" rows={costs.serviceBreakdown} />
          <BreakdownCard title="Spend by environment" rows={costs.environmentBreakdown} />
        </section>

        <RelatedChangesCard costs={costs} />
      </div>
    </AppShell>
  );
}

async function getCosts(
  environment: EnvironmentFilter,
  rangeDays: OverviewRangeDays,
): Promise<CostResponse> {
  const response = await fetch(
    `${apiBaseUrl}/costs/summary?environment=${environment}&rangeDays=${rangeDays}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(`Cost API returned ${response.status}. Start the CloudFlux API first.`);
  }

  return (await response.json()) as CostResponse;
}

function FilterForm({ costs }: { costs: CostResponse }) {
  return (
    <form
      action="/costs"
      method="get"
      className="flex flex-wrap items-end gap-2 rounded-lg border border-line bg-white p-3 shadow-panel"
    >
      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
        Environment
        <select
          name="environment"
          defaultValue={costs.filters.environment}
          className="rounded-md border border-line bg-white px-2.5 py-2 text-sm font-medium text-slate-800 outline-none focus:border-accent"
        >
          <option value="all">All environments</option>
          {costs.environments.map((environment) => (
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
          defaultValue={costs.filters.rangeDays}
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

function MetricsGrid({ costs }: { costs: CostResponse }) {
  const cards = [
    {
      label: `${costs.filters.rangeDays}-day spend`,
      value: formatUsd(costs.metrics.currentPeriodCost),
      detail: "Recorded cost in the selected view",
    },
    {
      label: "Projected monthly cost",
      value: formatUsd(costs.metrics.projectedMonthlyCost),
      detail: "Based on the latest daily run rate",
    },
    {
      label: "Cost movement",
      value: formatSignedUsd(costs.metrics.costDeltaOverRange),
      detail: costs.metrics.costDeltaPercent === null
        ? "Linked impact summaries in this window"
        : `${formatSignedPercent(costs.metrics.costDeltaPercent)} of selected spend`,
    },
    {
      label: "Largest recent increase",
      value: formatSignedUsd(costs.metrics.largestRecentIncrease),
      detail: costs.metrics.largestServiceCostDriver
        ? `${formatLabel(costs.metrics.largestServiceCostDriver)} is the largest service bucket`
        : "No linked cost increase",
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

function TrendCard({ costs }: { costs: CostResponse }) {
  const maximum = Math.max(...costs.trend.map((point) => point.amount), 1);

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-normal text-slate-950">Daily spend trend</h2>
          <p className="mt-1 text-sm text-muted">Anomaly markers highlight days above the earlier-window baseline.</p>
        </div>
        <div className="flex gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" />Daily spend</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-500" />Anomaly</span>
        </div>
      </div>
      {costs.trend.length > 0 ? (
        <>
          <div className="mt-6 flex h-48 items-end gap-1 border-b border-line pb-0" aria-label="Daily spend trend">
            {costs.trend.map((point) => (
              <div key={point.date} className="group relative flex h-full flex-1 items-end">
                {point.isAnomaly ? <span className="absolute bottom-full left-1/2 mb-1 h-2 w-2 -translate-x-1/2 rounded-full bg-orange-500" title="Above baseline" /> : null}
                <div
                  className={`w-full rounded-t-sm transition-colors group-hover:bg-blue-700 ${point.isAnomaly ? "bg-orange-400" : "bg-blue-500"}`}
                  style={{ height: `${Math.max((point.amount / maximum) * 100, 5)}%` }}
                  title={`${point.date}: ${formatUsd(point.amount)}${point.relatedChangeIds.length > 0 ? ` · ${point.relatedChangeIds.length} linked change${point.relatedChangeIds.length === 1 ? "" : "s"}` : ""}`}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between text-xs text-slate-500">
            <span>{costs.trend[0]?.date}</span>
            <span>{costs.trend.at(-1)?.date}</span>
          </div>
        </>
      ) : (
        <p className="mt-6 rounded-md bg-slate-50 p-4 text-sm text-muted">No cost data is available for this filter.</p>
      )}
    </section>
  );
}

function BreakdownCard({ title, rows }: { title: string; rows: CostResponse["serviceBreakdown"] }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-normal text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-muted">Current spend compared with the earlier half of the window.</p>
        </div>
        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">USD</span>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[30rem] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="pb-2 font-semibold">Bucket</th>
              <th className="pb-2 text-right font-semibold">Current</th>
              <th className="pb-2 text-right font-semibold">Delta</th>
              <th className="pb-2 text-right font-semibold">Changes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="py-3 font-medium text-slate-800">{formatLabel(row.label)}</td>
                <td className="py-3 text-right text-slate-700">{formatUsd(row.currentPeriodCost)}</td>
                <td className={`py-3 text-right font-semibold ${row.delta > 0 ? "text-orange-700" : row.delta < 0 ? "text-emerald-700" : "text-slate-500"}`}>
                  {formatSignedUsd(row.delta)}
                </td>
                <td className="py-3 text-right">
                  {row.relatedChangeIds.length > 0 ? (
                    <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{row.relatedChangeIds.length} linked</span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RelatedChangesCard({ costs }: { costs: CostResponse }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-normal text-slate-950">Related change events</h2>
          <p className="mt-1 text-sm text-muted">Cost movements with a linked impact summary in this window.</p>
        </div>
        <Link href={`/timeline?environment=${costs.filters.environment}&rangeDays=${costs.filters.rangeDays}&hasCostImpact=true`} className="text-sm font-semibold text-accent hover:underline">
          View timeline
        </Link>
      </div>
      {costs.relatedChanges.length > 0 ? (
        <div className="mt-4 divide-y divide-line">
          {costs.relatedChanges.map((change) => (
            <div key={change.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <Link href={`/changes/${change.id}`} className="font-medium text-slate-900 hover:text-accent">
                  {change.title}
                </Link>
                <div className="mt-1 text-sm text-muted">
                  {formatLabel(change.environment)} · {formatDate(change.happenedAt)}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{change.summary}</p>
              </div>
              <div className={`shrink-0 text-sm font-semibold ${change.costDeltaMonthlyProjected > 0 ? "text-orange-700" : "text-emerald-700"}`}>
                {formatSignedUsd(change.costDeltaMonthlyProjected)} monthly
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-md bg-slate-50 p-4 text-sm text-muted">No linked cost-impact changes were found.</p>
      )}
    </section>
  );
}

function normalizeEnvironment(value?: string): EnvironmentFilter {
  if (value === "development" || value === "staging" || value === "production") return value;
  return "all";
}

function normalizeRangeDays(value?: string): OverviewRangeDays {
  if (value === "7") return 7;
  if (value === "90") return 90;
  return 30;
}

function formatLabel(value: string | null) {
  if (!value) return "All environments";
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatSignedPercent(value: number) {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${value.toFixed(1)}%`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}
