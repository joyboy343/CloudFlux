import Link from "next/link";
import type { EnvironmentFilter, ResourceInventoryResponse } from "@cloudflux/contracts";

import { AppShell } from "../../components/app-shell/app-shell";
import { formatUsd } from "../../lib/formatting/currency";

export const dynamic = "force-dynamic";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001/api";

type ResourcesPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ResourcesPage({ searchParams }: ResourcesPageProps) {
  const params = readParams(await searchParams);
  const inventory = await getResources(params);

  return (
    <AppShell workspace={inventory.workspace} cloudAccount={inventory.cloudAccount} selectedEnvironment={inventory.filters.environment}>
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/overview" className="text-sm font-semibold text-accent hover:underline">← Overview</Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">Resource inventory</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Inspect the AWS-style resources CloudFlux is tracking, their ownership, cost, and security context.</p>
          </div>
          <div className="rounded-lg border border-line bg-white px-4 py-3 text-right shadow-panel"><div className="text-2xl font-semibold text-slate-950">{inventory.total}</div><div className="text-xs text-muted">resources in this view</div></div>
        </section>

        <ResourceFilterForm inventory={inventory} />

        <section className="overflow-hidden rounded-lg border border-line bg-white shadow-panel">
          <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr_0.8fr] gap-4 border-b border-line bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 lg:grid">
            <span>Resource</span><span>Environment</span><span>Region</span><span>Owner</span><span>Cost</span><span>Findings</span>
          </div>
          <div className="divide-y divide-line">
            {inventory.resources.length === 0 ? <div className="p-6 text-sm text-muted">No resources match these filters.</div> : inventory.resources.map((resource) => (
              <ResourceRow key={resource.id} resource={resource} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

async function getResources(params: ResourceParams): Promise<ResourceInventoryResponse> {
  const query = new URLSearchParams({
    environment: params.environment,
    service: params.service,
    resourceType: params.resourceType,
    region: params.region,
    status: params.status,
    owner: params.owner,
    ...(params.hasFindings === null ? {} : { hasFindings: String(params.hasFindings) }),
    ...(params.changedRecently === null ? {} : { changedRecently: String(params.changedRecently) }),
    ...(params.minMonthlyCost === null ? {} : { minMonthlyCost: String(params.minMonthlyCost) }),
  });
  const response = await fetch(`${apiBaseUrl}/resources?${query}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Resource API returned ${response.status}.`);
  return (await response.json()) as ResourceInventoryResponse;
}

function ResourceFilterForm({ inventory }: { inventory: ResourceInventoryResponse }) {
  const { filters, filterOptions } = inventory;
  return (
    <form action="/resources" method="get" className="grid gap-3 rounded-lg border border-line bg-white p-4 shadow-panel sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      <SelectField label="Environment" name="environment" value={filters.environment}><option value="all">All</option>{inventory.environments.map((item) => <option key={item.id} value={item.name}>{item.displayName}</option>)}</SelectField>
      <SelectField label="Service" name="service" value={filters.service}><option value="all">All</option>{filterOptions.services.map((item) => <option key={item}>{item}</option>)}</SelectField>
      <SelectField label="Resource type" name="resourceType" value={filters.resourceType}><option value="all">All</option>{filterOptions.resourceTypes.map((item) => <option key={item}>{item}</option>)}</SelectField>
      <SelectField label="Region" name="region" value={filters.region}><option value="all">All</option>{filterOptions.regions.map((item) => <option key={item}>{item}</option>)}</SelectField>
      <SelectField label="Status" name="status" value={filters.status}><option value="all">All</option>{filterOptions.statuses.map((item) => <option key={item}>{item}</option>)}</SelectField>
      <SelectField label="Owner" name="owner" value={filters.owner}><option value="all">All</option>{filterOptions.owners.map((item) => <option key={item}>{item}</option>)}</SelectField>
      <SelectField label="Findings" name="hasFindings" value={booleanFilter(filters.hasFindings)}><option value="all">All</option><option value="true">With findings</option><option value="false">No findings</option></SelectField>
      <SelectField label="Recent change" name="changedRecently" value={booleanFilter(filters.changedRecently)}><option value="all">All</option><option value="true">Changed recently</option><option value="false">Not recently changed</option></SelectField>
      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">Min monthly cost<input name="minMonthlyCost" type="number" min="0" step="1" defaultValue={filters.minMonthlyCost ?? ""} placeholder="$0" className="rounded-md border border-line px-2 py-2 text-sm font-medium text-slate-800 outline-none focus:border-accent" /></label>
      <div className="flex items-end"><button type="submit" className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700">Apply filters</button></div>
    </form>
  );
}

function ResourceRow({ resource }: { resource: ResourceInventoryResponse["resources"][number] }) {
  return (
    <div className="grid gap-3 px-5 py-4 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_0.8fr] lg:items-center lg:gap-4">
      <div className="min-w-0"><Link href={`/resources/${resource.id}`} className="font-semibold text-slate-950 hover:text-accent">{resource.name}</Link><div className="mt-1 text-xs text-muted">{formatLabel(resource.resourceType)} · {formatLabel(resource.service)} · {resource.externalResourceId}</div><div className="mt-2 flex flex-wrap gap-1">{Object.entries(resource.tags as Record<string, string>).slice(0, 3).map(([key, value]) => <span key={key} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{key}: {value}</span>)}</div></div>
      <div className="text-sm text-slate-700"><span className="lg:hidden text-xs text-muted">Environment: </span>{formatLabel(resource.environment)}</div>
      <div className="text-sm text-slate-700"><span className="lg:hidden text-xs text-muted">Region: </span>{resource.region}</div>
      <div className="text-sm text-slate-700"><span className="lg:hidden text-xs text-muted">Owner: </span>{resource.owner ?? "Unassigned"}</div>
      <div className="text-sm font-semibold text-slate-900"><span className="lg:hidden text-xs font-normal text-muted">Cost: </span>{formatUsd(resource.estimatedMonthlyCost)}<div className="text-xs font-normal text-muted">projected</div></div>
      <div><span className={`rounded-md px-2 py-1 text-xs font-semibold ${resource.openFindingsCount > 0 ? "bg-orange-100 text-orange-800" : "bg-emerald-100 text-emerald-800"}`}>{resource.openFindingsCount > 0 ? `${resource.openFindingsCount} open` : "Clear"}</span></div>
    </div>
  );
}

function SelectField({ label, name, value, children }: { label: string; name: string; value: string | number; children: React.ReactNode }) {
  return <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-slate-600">{label}<select name={name} defaultValue={value} className="min-w-0 rounded-md border border-line bg-white px-2 py-2 text-sm font-medium text-slate-800 outline-none focus:border-accent">{children}</select></label>;
}

function readParams(raw: Record<string, string | string[] | undefined>): ResourceParams {
  const value = (key: string) => { const item = raw[key]; return Array.isArray(item) ? item[0] : item; };
  const env = value("environment"); const findings = value("hasFindings"); const recent = value("changedRecently"); const cost = value("minMonthlyCost");
  return {
    environment: env === "development" || env === "staging" || env === "production" ? env : "all",
    service: value("service") || "all", resourceType: value("resourceType") || "all", region: value("region") || "all", status: value("status") || "all", owner: value("owner") || "all",
    hasFindings: findings === "true" ? true : findings === "false" ? false : null,
    changedRecently: recent === "true" ? true : recent === "false" ? false : null,
    minMonthlyCost: cost && Number.isFinite(Number(cost)) ? Number(cost) : null,
  };
}

function booleanFilter(value: boolean | null) { return value === null ? "all" : String(value); }
function formatLabel(value: string | null) { if (!value) return "All environments"; return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase()); }

type ResourceParams = {
  environment: EnvironmentFilter; service: string; resourceType: string; region: string; status: string; owner: string; hasFindings: boolean | null; changedRecently: boolean | null; minMonthlyCost: number | null;
};
