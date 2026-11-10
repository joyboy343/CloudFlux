import Link from "next/link";
import type {
  EnvironmentFilter,
  OverviewRangeDays,
  TimelineResponse,
} from "@cloudflux/contracts";

import { AppShell } from "../../components/app-shell/app-shell";
import { formatSignedUsd } from "../../lib/formatting/currency";

export const dynamic = "force-dynamic";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001/api";

type TimelinePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TimelinePage({ searchParams }: TimelinePageProps) {
  const rawParams = await searchParams;
  const params = readParams(rawParams);
  const timeline = await getTimeline(params);

  return (
    <AppShell
      workspace={timeline.workspace}
      cloudAccount={timeline.cloudAccount}
      selectedEnvironment={timeline.filters.environment}
      rangeDays={timeline.filters.rangeDays}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/overview" className="text-sm font-semibold text-accent hover:underline">
              ← Overview
            </Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">Change timeline</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Follow deployments, infrastructure changes, cost movement, and security regressions through time.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-white px-4 py-3 text-right shadow-panel">
            <div className="text-2xl font-semibold text-slate-950">{timeline.total}</div>
            <div className="text-xs text-muted">events in this view</div>
          </div>
        </section>

        <TimelineFilterForm timeline={timeline} />

        <section className="space-y-4">
          {timeline.events.length === 0 ? (
            <div className="rounded-lg border border-line bg-white p-6 shadow-panel">
              <p className="font-semibold text-slate-950">No changes match these filters.</p>
              <p className="mt-2 text-sm text-muted">Reset one or more filters to widen the investigation.</p>
            </div>
          ) : (
            timeline.events.map((event) => <TimelineEventCard key={event.id} event={event} />)
          )}
        </section>
      </div>
    </AppShell>
  );
}

async function getTimeline(params: TimelineParams): Promise<TimelineResponse> {
  const query = new URLSearchParams({
    environment: params.environment,
    rangeDays: String(params.rangeDays),
    eventType: params.eventType,
    source: params.source,
    impactLevel: params.impactLevel,
    ...(params.hasSecurityFindings === null ? {} : { hasSecurityFindings: String(params.hasSecurityFindings) }),
    ...(params.hasCostImpact === null ? {} : { hasCostImpact: String(params.hasCostImpact) }),
    ...(params.manualOnly ? { manualOnly: "true" } : {}),
  });
  const response = await fetch(`${apiBaseUrl}/timeline?${query.toString()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Timeline API returned ${response.status}. Start the CloudFlux API first.`);
  }
  return (await response.json()) as TimelineResponse;
}

function TimelineFilterForm({ timeline }: { timeline: TimelineResponse }) {
  const { filters, filterOptions } = timeline;
  return (
    <form
      action="/timeline"
      method="get"
      className="grid gap-3 rounded-lg border border-line bg-white p-4 shadow-panel sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8"
    >
      <SelectField label="Environment" name="environment" value={filters.environment}>
        <option value="all">All</option>
        {timeline.environments.map((item) => (
          <option key={item.id} value={item.name}>{item.displayName}</option>
        ))}
      </SelectField>
      <SelectField label="Range" name="rangeDays" value={filters.rangeDays}>
        <option value="7">7 days</option>
        <option value="30">30 days</option>
        <option value="90">90 days</option>
      </SelectField>
      <SelectField label="Event type" name="eventType" value={filters.eventType}>
        <option value="all">All</option>
        {filterOptions.eventTypes.map((item) => <option key={item}>{item}</option>)}
      </SelectField>
      <SelectField label="Source" name="source" value={filters.source}>
        <option value="all">All</option>
        {filterOptions.sources.map((item) => <option key={item}>{item}</option>)}
      </SelectField>
      <SelectField label="Impact" name="impactLevel" value={filters.impactLevel}>
        <option value="all">All</option>
        {filterOptions.impactLevels.map((item) => <option key={item}>{item}</option>)}
      </SelectField>
      <SelectField label="Security" name="hasSecurityFindings" value={toFilterValue(filters.hasSecurityFindings)}>
        <option value="all">All</option>
        <option value="true">With findings</option>
        <option value="false">No findings</option>
      </SelectField>
      <SelectField label="Cost" name="hasCostImpact" value={toFilterValue(filters.hasCostImpact)}>
        <option value="all">All</option>
        <option value="true">With cost impact</option>
        <option value="false">No cost impact</option>
      </SelectField>
      <div className="flex flex-col justify-end gap-2">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input type="checkbox" name="manualOnly" value="true" defaultChecked={filters.manualOnly} />
          Manual only
        </label>
        <button type="submit" className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700">
          Apply
        </button>
      </div>
    </form>
  );
}

function SelectField({
  label,
  name,
  value,
  children,
}: {
  label: string;
  name: string;
  value: string | number;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-slate-600">
      {label}
      <select name={name} defaultValue={value} className="min-w-0 rounded-md border border-line bg-white px-2 py-2 text-sm font-medium text-slate-800 outline-none focus:border-accent">
        {children}
      </select>
    </label>
  );
}

function TimelineEventCard({ event }: { event: TimelineResponse["events"][number] }) {
  const manual = event.source === "aws_console" || event.actorType === "user" || event.eventType.includes("manual");
  return (
    <article className={`rounded-lg border bg-white p-5 shadow-panel ${manual ? "border-orange-300" : "border-line"}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted">
            <ImpactBadge level={event.impactLevel} />
            {manual && <span className="rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-orange-800">Manual drift</span>}
            <span>{formatLabel(event.environment)} · {formatLabel(event.source)} · {formatDate(event.happenedAt)}</span>
          </div>
          <h2 className="mt-3 text-lg font-semibold text-slate-950">
            <Link href={`/changes/${event.id}`} className="hover:text-accent">{event.title}</Link>
          </h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{event.summary}</p>
          <p className="mt-3 text-xs text-slate-500">{event.actorName} · {formatLabel(event.eventType)}</p>
        </div>
        <div className="grid shrink-0 grid-cols-3 gap-2 text-center">
          <CompactStat value={formatSignedUsd(event.costDeltaMonthlyProjected)} label="monthly" />
          <CompactStat value={String(event.resourceDelta.total)} label="resources" />
          <CompactStat value={String(event.securityDelta.introduced)} label="new findings" />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Link href={`/changes/${event.id}`} className="text-sm font-semibold text-accent hover:underline">Open impact detail →</Link>
      </div>
    </article>
  );
}

function CompactStat({ value, label }: { value: string; label: string }) {
  return <div className="rounded-md border border-line bg-slate-50 px-3 py-2"><div className="font-semibold text-slate-950">{value}</div><div className="mt-1 text-[11px] text-muted">{label}</div></div>;
}

function ImpactBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    high: "bg-orange-100 text-orange-800",
    medium: "bg-amber-100 text-amber-800",
    low: "bg-slate-100 text-slate-700",
    positive: "bg-emerald-100 text-emerald-800",
  };
  return <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${styles[level] ?? styles.low}`}>{formatLabel(level)} impact</span>;
}

function readParams(raw: Record<string, string | string[] | undefined>): TimelineParams {
  const value = (key: string) => {
    const item = raw[key];
    return Array.isArray(item) ? item[0] : item;
  };
  const environment = value("environment");
  const rangeDays = value("rangeDays");
  const security = value("hasSecurityFindings");
  const cost = value("hasCostImpact");
  return {
    environment: environment === "development" || environment === "staging" || environment === "production" ? environment : "all",
    rangeDays: rangeDays === "7" ? 7 : rangeDays === "90" ? 90 : 30,
    eventType: value("eventType") || "all",
    source: value("source") || "all",
    impactLevel: value("impactLevel") || "all",
    hasSecurityFindings: security === "true" ? true : security === "false" ? false : null,
    hasCostImpact: cost === "true" ? true : cost === "false" ? false : null,
    manualOnly: value("manualOnly") === "true",
  };
}

function toFilterValue(value: boolean | null) {
  return value === null ? "all" : String(value);
}

function formatLabel(value: string | null) {
  if (!value) return "All environments";
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

type TimelineParams = {
  environment: EnvironmentFilter;
  rangeDays: OverviewRangeDays;
  eventType: string;
  source: string;
  impactLevel: string;
  hasSecurityFindings: boolean | null;
  hasCostImpact: boolean | null;
  manualOnly: boolean;
};
