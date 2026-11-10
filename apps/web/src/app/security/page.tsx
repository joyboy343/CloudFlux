import Link from "next/link";
import type { EnvironmentFilter, SecurityFindingsResponse } from "@cloudflux/contracts";

import { AppShell } from "../../components/app-shell/app-shell";

export const dynamic = "force-dynamic";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001/api";

export default async function SecurityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const findings = await getFindings(readParams(await searchParams));
  return (
    <AppShell workspace={findings.workspace} cloudAccount={findings.cloudAccount} selectedEnvironment={findings.filters.environment}>
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><Link href="/overview" className="text-sm font-semibold text-accent hover:underline">← Overview</Link><h1 className="mt-2 text-2xl font-semibold text-slate-950">Security findings</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Review detected misconfigurations, their affected resources, and remediation guidance.</p></div><div className="rounded-lg border border-line bg-white px-4 py-3 text-right shadow-panel"><div className="text-2xl font-semibold text-slate-950">{findings.total}</div><div className="text-xs text-muted">findings in this view</div></div></section>
        <SecurityFilterForm findings={findings} />
        <section className="space-y-3">{findings.findings.length === 0 ? <div className="rounded-lg border border-line bg-white p-6 text-sm text-muted shadow-panel">No security findings match these filters.</div> : findings.findings.map((finding) => <FindingRow key={finding.id} finding={finding} />)}</section>
      </div>
    </AppShell>
  );
}

async function getFindings(params: SecurityParams): Promise<SecurityFindingsResponse> {
  const query = new URLSearchParams({ environment: params.environment, severity: params.severity, status: params.status, category: params.category, resourceId: params.resourceId });
  const response = await fetch(`${apiBaseUrl}/security/findings?${query}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Security API returned ${response.status}.`);
  return (await response.json()) as SecurityFindingsResponse;
}

function SecurityFilterForm({ findings }: { findings: SecurityFindingsResponse }) {
  const { filters, filterOptions } = findings;
  return <form action="/security" method="get" className="grid gap-3 rounded-lg border border-line bg-white p-4 shadow-panel sm:grid-cols-2 lg:grid-cols-5"><SelectField label="Environment" name="environment" value={filters.environment}><option value="all">All</option>{findings.environments.map((item) => <option key={item.id} value={item.name}>{item.displayName}</option>)}</SelectField><SelectField label="Severity" name="severity" value={filters.severity}><option value="all">All</option>{filterOptions.severities.map((item) => <option key={item}>{item}</option>)}</SelectField><SelectField label="Status" name="status" value={filters.status}><option value="all">All</option>{filterOptions.statuses.map((item) => <option key={item}>{item}</option>)}</SelectField><SelectField label="Category" name="category" value={filters.category}><option value="all">All</option>{filterOptions.categories.map((item) => <option key={item}>{item}</option>)}</SelectField><div className="flex items-end"><button type="submit" className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700">Apply filters</button></div></form>;
}

function FindingRow({ finding }: { finding: SecurityFindingsResponse["findings"][number] }) {
  return <article className={`rounded-lg border bg-white p-5 shadow-panel ${finding.severity === "high" || finding.severity === "critical" ? "border-orange-200" : "border-line"}`}><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><SeverityBadge severity={finding.severity} /><StatusBadge status={finding.status} /><span className="text-xs text-muted">{formatLabel(finding.category)}</span></div><h2 className="mt-3 text-lg font-semibold text-slate-950"><Link href={`/security/${finding.id}`} className="hover:text-accent">{finding.title}</Link></h2><p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{finding.description}</p></div><div className="shrink-0 rounded-md bg-slate-50 px-3 py-2 text-right text-xs"><div className="text-muted">Affected resource</div><Link href={finding.resourceId ? `/resources/${finding.resourceId}` : "/resources"} className="mt-1 block font-semibold text-slate-900 hover:text-accent">{finding.resourceName ?? "Workspace-level"}</Link><div className="mt-1 text-muted">{formatLabel(finding.environment)}</div></div></div><div className="mt-4 flex flex-col gap-2 border-t border-line pt-3 text-sm text-slate-700 md:flex-row md:justify-between"><span><span className="font-semibold">Remediation:</span> {finding.remediation}</span><Link href={`/security/${finding.id}`} className="shrink-0 font-semibold text-accent hover:underline">Open finding →</Link></div></article>;
}

function SelectField({ label, name, value, children }: { label: string; name: string; value: string; children: React.ReactNode }) { return <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-slate-600">{label}<select name={name} defaultValue={value} className="rounded-md border border-line bg-white px-2 py-2 text-sm font-medium text-slate-800 outline-none focus:border-accent">{children}</select></label>; }
function SeverityBadge({ severity }: { severity: string }) { const styles: Record<string, string> = { critical: "bg-rose-100 text-rose-800", high: "bg-orange-100 text-orange-800", medium: "bg-amber-100 text-amber-800", low: "bg-slate-100 text-slate-700" }; return <span className={`rounded-md px-2 py-1 text-xs font-semibold ${styles[severity] ?? styles.low}`}>{formatLabel(severity)}</span>; }
function StatusBadge({ status }: { status: string }) { return <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{formatLabel(status)}</span>; }
function formatLabel(value: string | null) { if (!value) return "All environments"; return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase()); }

function readParams(raw: Record<string, string | string[] | undefined>): SecurityParams { const value = (key: string) => { const item = raw[key]; return Array.isArray(item) ? item[0] : item; }; const env = value("environment"); return { environment: env === "development" || env === "staging" || env === "production" ? env : "all", severity: value("severity") || "all", status: value("status") || "all", category: value("category") || "all", resourceId: value("resourceId") || "all" }; }

type SecurityParams = { environment: EnvironmentFilter; severity: string; status: string; category: string; resourceId: string };
