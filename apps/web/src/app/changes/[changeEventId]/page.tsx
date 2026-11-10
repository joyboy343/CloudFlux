import Link from "next/link";
import type { ImpactDetailResponse } from "@cloudflux/contracts";

import { AppShell } from "../../../components/app-shell/app-shell";
import { formatSignedUsd } from "../../../lib/formatting/currency";

export const dynamic = "force-dynamic";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001/api";

type ImpactPageProps = {
  params: Promise<{ changeEventId: string }>;
};

export default async function ImpactDetailPage({ params }: ImpactPageProps) {
  const { changeEventId } = await params;
  const detail = await getImpactDetail(changeEventId);

  return (
    <AppShell workspace={detail.workspace} cloudAccount={detail.cloudAccount}>
      <div className="mx-auto max-w-6xl space-y-6">
        <section>
          <Link href="/timeline" className="text-sm font-semibold text-accent hover:underline">← Change timeline</Link>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted">
                <ImpactBadge level={detail.impact.overallImpactLevel} />
                <span>{formatLabel(detail.event.environment)} · {formatLabel(detail.event.source)} · {formatDate(detail.event.happenedAt)}</span>
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">{detail.event.title}</h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{detail.event.description}</p>
              <p className="mt-3 text-xs text-slate-500">{detail.event.actorName} · {formatLabel(detail.event.actorType)} · {formatLabel(detail.event.eventType)}</p>
            </div>
            <div className="rounded-lg border border-line bg-white p-4 text-sm shadow-panel">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">External reference</div>
              <div className="mt-2 font-medium text-slate-950">{detail.event.externalReference ?? "Not provided"}</div>
            </div>
          </div>
        </section>

        <ImpactSummaryStrip detail={detail} />
        <InsightSection detail={detail} />

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <ResourceChangesSection detail={detail} />
          <CostSection detail={detail} />
        </section>

        <SecuritySection detail={detail} />
        <ReviewActionsSection detail={detail} />

        <section className="grid gap-6 lg:grid-cols-2">
          <RelatedEventsSection detail={detail} />
          <TechnicalDetailsSection detail={detail} />
        </section>
      </div>
    </AppShell>
  );
}

async function getImpactDetail(changeEventId: string): Promise<ImpactDetailResponse> {
  const response = await fetch(`${apiBaseUrl}/changes/${encodeURIComponent(changeEventId)}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Impact detail API returned ${response.status}.`);
  }
  return (await response.json()) as ImpactDetailResponse;
}

function ImpactSummaryStrip({ detail }: { detail: ImpactDetailResponse }) {
  const cards = [
    ["Monthly delta", formatSignedUsd(detail.impact.costDeltaMonthlyProjected)],
    ["Daily delta", formatSignedUsd(detail.impact.costDeltaDaily)],
    ["Resources", `${detail.impact.resourceDelta.total} (${detail.impact.resourceDelta.created} created)`],
    ["New findings", String(detail.impact.securityDelta.introduced)],
    ["Resolved findings", String(detail.impact.securityDelta.resolved)],
  ];
  return (
    <section className="grid gap-3 rounded-lg border border-line bg-white p-4 shadow-panel sm:grid-cols-2 lg:grid-cols-5">
      {cards.map(([label, value]) => (
        <div key={label} className="rounded-md bg-slate-50 p-3">
          <div className="text-xs text-muted">{label}</div>
          <div className="mt-1 text-lg font-semibold text-slate-950">{value}</div>
        </div>
      ))}
    </section>
  );
}

function InsightSection({ detail }: { detail: ImpactDetailResponse }) {
  if (!detail.aiInsight) return null;
  return (
    <section className="rounded-lg border border-blue-200 bg-blue-50 p-5 shadow-panel">
      <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">AI explanation</p>
      <h2 className="mt-1 text-lg font-semibold text-blue-950">{detail.aiInsight.title}</h2>
      <p className="mt-3 max-w-4xl text-sm leading-6 text-blue-950/80">{detail.aiInsight.content}</p>
      <p className="mt-4 text-xs text-blue-800">Generated guidance summarizes CloudFlux data and does not modify infrastructure.</p>
    </section>
  );
}

function ResourceChangesSection({ detail }: { detail: ImpactDetailResponse }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
      <SectionHeading title="Resource changes" detail={`${detail.resourceChanges.length} affected resources`} />
      <div className="mt-4 space-y-3">
        {detail.resourceChanges.map((change) => (
          <div key={change.id} className="rounded-md border border-line p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link href={`/resources/${change.resource.id}`} className="font-semibold text-slate-950 hover:text-accent">
                  {change.resource.name}
                </Link>
                <div className="mt-1 text-xs text-muted">{formatLabel(change.resource.resourceType)} · {change.resource.region} · {formatLabel(change.resource.environment)}</div>
              </div>
              <ActionBadge action={change.action} />
            </div>
            <p className="mt-3 text-sm text-slate-600">{change.summary}</p>
            <div className="mt-3 grid gap-3 text-xs text-slate-500 sm:grid-cols-2">
              <SnapshotSummary label="Before" snapshot={change.beforeSnapshot} />
              <SnapshotSummary label="After" snapshot={change.afterSnapshot} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SnapshotSummary({ label, snapshot }: { label: string; snapshot: ImpactDetailResponse["resourceChanges"][number]["beforeSnapshot"] }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <div className="font-semibold text-slate-600">{label}</div>
      {snapshot ? (
        <div className="mt-1 space-y-1">
          <div>Status: {formatLabel(snapshot.normalizedStatus)}</div>
          <div>{JSON.stringify(snapshot.configuration)}</div>
        </div>
      ) : <div className="mt-1">No snapshot</div>}
    </div>
  );
}

function CostSection({ detail }: { detail: ImpactDetailResponse }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
      <SectionHeading title="Cost impact" detail={`Source: ${formatLabel(detail.costImpact.source)}`} />
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Metric label="Before / after view" value={formatSignedUsd(detail.costImpact.monthlyProjectedDelta)} />
        <Metric label="Daily delta" value={formatSignedUsd(detail.costImpact.dailyDelta)} />
      </div>
      <div className="mt-5 border-t border-line pt-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Affected services</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {detail.costImpact.affectedServices.map((service) => <span key={service} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{formatLabel(service)}</span>)}
        </div>
      </div>
      <div className="mt-5 rounded-md bg-slate-50 p-3 text-sm text-slate-600">All MVP costs are estimated USD projections from seeded demo data.</div>
    </section>
  );
}

function SecuritySection({ detail }: { detail: ImpactDetailResponse }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
      <SectionHeading title="Security impact" detail={`${detail.securityImpact.introduced.length} introduced · ${detail.securityImpact.resolved.length} resolved`} />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <FindingList title="Introduced by this change" findings={detail.securityImpact.introduced} />
        <FindingList title="Resolved by this change" findings={detail.securityImpact.resolved} />
      </div>
    </section>
  );
}

function FindingList({ title, findings }: { title: string; findings: ImpactDetailResponse["securityImpact"]["introduced"] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {findings.length === 0 ? <p className="mt-3 text-sm text-muted">None recorded.</p> : (
        <div className="mt-3 space-y-3">
          {findings.map((finding) => (
            <div key={finding.id} className="rounded-md border border-line p-3">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/security/${finding.id}`} className="font-medium text-slate-950 hover:text-accent">{finding.title}</Link>
                <SeverityBadge severity={finding.severity} />
              </div>
              <p className="mt-2 text-sm text-slate-600">{finding.description}</p>
              <p className="mt-2 text-xs text-slate-500">Resource: {finding.resourceName ?? "Workspace-level"}</p>
              <p className="mt-2 text-sm text-slate-700"><span className="font-semibold">Remediation:</span> {finding.remediation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewActionsSection({ detail }: { detail: ImpactDetailResponse }) {
  return (
    <section className="rounded-lg border border-orange-200 bg-orange-50 p-5 shadow-panel">
      <SectionHeading title="Review actions" detail="Human investigation only; no automatic remediation" />
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {detail.reviewActions.map((action) => (
          <div key={action.title} className="rounded-md border border-orange-200 bg-white p-4">
            <div className="flex items-center gap-2"><PriorityBadge priority={action.priority} /><span className="font-semibold text-slate-950">{action.title}</span></div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function RelatedEventsSection({ detail }: { detail: ImpactDetailResponse }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
      <SectionHeading title="Related events" detail="Nearby events in the same environment" />
      <div className="mt-4 space-y-3">
        {detail.relatedEvents.map((event) => (
          <div key={event.id} className="flex items-start justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
            <div><Link href={`/changes/${event.id}`} className="font-medium text-slate-950 hover:text-accent">{event.title}</Link><div className="mt-1 text-xs text-muted">{formatDate(event.happenedAt)} · {formatLabel(event.source)}</div></div>
            <ImpactBadge level={event.impactLevel} />
          </div>
        ))}
      </div>
    </section>
  );
}

function TechnicalDetailsSection({ detail }: { detail: ImpactDetailResponse }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
      <SectionHeading title="Technical details" detail="Source metadata for investigation" />
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex justify-between gap-4"><dt className="text-muted">Source</dt><dd className="font-medium text-slate-950">{formatLabel(detail.technicalDetails.source)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted">Reference</dt><dd className="font-medium text-slate-950">{detail.technicalDetails.externalReference ?? "Not provided"}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted">Snapshots</dt><dd className="font-medium text-slate-950">{detail.technicalDetails.snapshotIds.length}</dd></div>
      </dl>
      <pre className="mt-4 max-h-56 overflow-auto rounded-md bg-slate-950 p-3 text-xs leading-5 text-slate-200">{JSON.stringify(detail.technicalDetails.metadata, null, 2)}</pre>
    </section>
  );
}

function SectionHeading({ title, detail }: { title: string; detail: string }) {
  return <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-base font-semibold text-slate-950">{title}</h2><span className="text-xs text-muted">{detail}</span></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-slate-50 p-3"><div className="text-xs text-muted">{label}</div><div className="mt-1 text-lg font-semibold text-slate-950">{value}</div></div>;
}

function ActionBadge({ action }: { action: string }) {
  const styles: Record<string, string> = { created: "bg-emerald-100 text-emerald-800", updated: "bg-blue-100 text-blue-800", deleted: "bg-slate-200 text-slate-700" };
  return <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${styles[action] ?? "bg-slate-100 text-slate-700"}`}>{formatLabel(action)}</span>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = { critical: "bg-rose-100 text-rose-800", high: "bg-orange-100 text-orange-800", medium: "bg-amber-100 text-amber-800", low: "bg-slate-100 text-slate-700" };
  return <span className={`rounded-md px-2 py-1 text-xs font-semibold ${styles[severity] ?? styles.low}`}>{formatLabel(severity)}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = { high: "bg-rose-100 text-rose-800", medium: "bg-amber-100 text-amber-800", low: "bg-slate-100 text-slate-700" };
  return <span className={`rounded-md px-2 py-1 text-[11px] font-semibold ${styles[priority] ?? styles.low}`}>{formatLabel(priority)}</span>;
}

function ImpactBadge({ level }: { level: string }) {
  const styles: Record<string, string> = { high: "bg-orange-100 text-orange-800", medium: "bg-amber-100 text-amber-800", low: "bg-slate-100 text-slate-700", positive: "bg-emerald-100 text-emerald-800" };
  return <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${styles[level] ?? styles.low}`}>{formatLabel(level)} impact</span>;
}

function formatLabel(value: string | null) {
  if (!value) return "All environments";
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}
