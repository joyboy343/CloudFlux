import Link from "next/link";
import type { ResourceDetailResponse } from "@cloudflux/contracts";

import { AppShell } from "../../../components/app-shell/app-shell";
import { formatUsd } from "../../../lib/formatting/currency";

export const dynamic = "force-dynamic";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001/api";

export default async function ResourceDetailPage({ params }: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await params;
  const detail = await getResource(resourceId);

  return (
    <AppShell workspace={detail.workspace} cloudAccount={detail.cloudAccount} selectedEnvironment={detail.resource.environment}>
      <div className="mx-auto max-w-6xl space-y-6">
        <section>
          <Link href="/resources" className="text-sm font-semibold text-accent hover:underline">← Resource inventory</Link>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={detail.resource.status} /><span className="text-sm text-muted">{formatLabel(detail.resource.resourceType)} · {detail.resource.region}</span></div><h1 className="mt-3 text-3xl font-semibold text-slate-950">{detail.resource.name}</h1><p className="mt-2 text-sm text-slate-600">{detail.resource.externalResourceId} · {formatLabel(detail.resource.service)} · {formatLabel(detail.resource.environment)}</p></div>
            <div className="rounded-lg border border-line bg-white p-4 shadow-panel"><div className="text-xs text-muted">Projected monthly cost</div><div className="mt-1 text-2xl font-semibold text-slate-950">{formatUsd(detail.resource.estimatedMonthlyCost)}</div></div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Owner" value={detail.resource.owner ?? "Unassigned"} />
          <Metric label="Open findings" value={String(detail.resource.openFindingsCount)} />
          <Metric label="Last changed" value={detail.resource.lastChangedAt ? formatDate(detail.resource.lastChangedAt) : "Not recorded"} />
          <Metric label="Last seen" value={formatDate(detail.resource.lastSeenAt)} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <CostCard detail={detail} />
          <TagsCard tags={detail.resource.tags} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <FindingsCard detail={detail} />
          <SnapshotsCard detail={detail} />
        </section>

        <RelatedChangesCard detail={detail} />
      </div>
    </AppShell>
  );
}

async function getResource(resourceId: string): Promise<ResourceDetailResponse> {
  const response = await fetch(`${apiBaseUrl}/resources/${encodeURIComponent(resourceId)}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Resource API returned ${response.status}.`);
  return (await response.json()) as ResourceDetailResponse;
}

function CostCard({ detail }: { detail: ResourceDetailResponse }) {
  const maximum = Math.max(...detail.costTrend.map((point) => point.amount), 1);
  return <section className="rounded-lg border border-line bg-white p-5 shadow-panel"><h2 className="text-base font-semibold text-slate-950">Cost history</h2><p className="mt-1 text-sm text-muted">Daily estimated spend for this resource</p><div className="mt-6 flex h-36 items-end gap-1 border-b border-line">{detail.costTrend.map((point) => <div key={point.date} className="group flex h-full flex-1 items-end"><div className="w-full rounded-t-sm bg-blue-500 group-hover:bg-blue-700" style={{ height: `${Math.max((point.amount / maximum) * 100, 5)}%` }} title={`${point.date}: ${formatUsd(point.amount)}`} /></div>)}</div><div className="mt-3 flex justify-between text-xs text-slate-500"><span>{detail.costTrend[0]?.date ?? "No data"}</span><span>{detail.costTrend.at(-1)?.date ?? "No data"}</span></div></section>;
}

function TagsCard({ tags }: { tags: unknown }) {
  const entries = Object.entries((tags ?? {}) as Record<string, unknown>);
  return <section className="rounded-lg border border-line bg-white p-5 shadow-panel"><h2 className="text-base font-semibold text-slate-950">Resource tags</h2><div className="mt-4 space-y-3">{entries.length === 0 ? <p className="text-sm text-muted">No tags recorded.</p> : entries.map(([key, value]) => <div key={key} className="flex justify-between gap-4 border-b border-line pb-2 text-sm last:border-0"><span className="text-muted">{key}</span><span className="font-medium text-slate-950">{String(value)}</span></div>)}</div></section>;
}

function FindingsCard({ detail }: { detail: ResourceDetailResponse }) {
  return <section className="rounded-lg border border-line bg-white p-5 shadow-panel"><div className="flex items-baseline justify-between gap-4"><h2 className="text-base font-semibold text-slate-950">Security findings</h2><Link href={`/security?resourceId=${detail.resource.id}`} className="text-xs font-semibold text-accent hover:underline">Open findings view →</Link></div><div className="mt-4 space-y-3">{detail.findings.length === 0 ? <p className="text-sm text-muted">No findings recorded for this resource.</p> : detail.findings.map((finding) => <div key={finding.id} className="rounded-md border border-line p-3"><div className="flex items-start justify-between gap-3"><Link href={`/security/${finding.id}`} className="font-medium text-slate-950 hover:text-accent">{finding.title}</Link><SeverityBadge severity={finding.severity} /></div><p className="mt-2 text-sm text-slate-600">{finding.remediation}</p></div>)}</div></section>;
}

function SnapshotsCard({ detail }: { detail: ResourceDetailResponse }) {
  return <section className="rounded-lg border border-line bg-white p-5 shadow-panel"><h2 className="text-base font-semibold text-slate-950">Recent snapshots</h2><div className="mt-4 space-y-3">{detail.snapshots.slice(0, 5).map((snapshot) => <div key={snapshot.id} className="rounded-md bg-slate-50 p-3"><div className="flex justify-between gap-3 text-sm"><span className="font-medium text-slate-950">{formatLabel(snapshot.normalizedStatus)}</span><span className="text-xs text-muted">{formatDate(snapshot.capturedAt)}</span></div><div className="mt-2 truncate text-xs text-slate-500">{JSON.stringify(snapshot.configuration)}</div></div>)}</div></section>;
}

function RelatedChangesCard({ detail }: { detail: ResourceDetailResponse }) {
  return <section className="rounded-lg border border-line bg-white p-5 shadow-panel"><h2 className="text-base font-semibold text-slate-950">Related changes</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{detail.relatedChanges.map((event) => <div key={event.id} className="rounded-md border border-line p-3"><div className="flex items-start justify-between gap-3"><Link href={`/changes/${event.id}`} className="font-medium text-slate-950 hover:text-accent">{event.title}</Link><ImpactBadge level={event.impactLevel} /></div><div className="mt-2 text-xs text-muted">{formatDate(event.happenedAt)} · {formatLabel(event.source)}</div></div>)}</div></section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-line bg-white p-4 shadow-panel"><div className="text-xs text-muted">{label}</div><div className="mt-2 font-semibold text-slate-950">{value}</div></div>; }
function StatusBadge({ status }: { status: string }) { return <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{formatLabel(status)}</span>; }
function SeverityBadge({ severity }: { severity: string }) { const styles: Record<string, string> = { critical: "bg-rose-100 text-rose-800", high: "bg-orange-100 text-orange-800", medium: "bg-amber-100 text-amber-800", low: "bg-slate-100 text-slate-700" }; return <span className={`rounded-md px-2 py-1 text-xs font-semibold ${styles[severity] ?? styles.low}`}>{formatLabel(severity)}</span>; }
function ImpactBadge({ level }: { level: string }) { const styles: Record<string, string> = { high: "bg-orange-100 text-orange-800", medium: "bg-amber-100 text-amber-800", low: "bg-slate-100 text-slate-700", positive: "bg-emerald-100 text-emerald-800" }; return <span className={`rounded-md px-2 py-1 text-xs font-semibold ${styles[level] ?? styles.low}`}>{formatLabel(level)}</span>; }
function formatLabel(value: string | null) { if (!value) return "All environments"; return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase()); }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
