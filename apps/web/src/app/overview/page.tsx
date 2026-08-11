import { AppShell } from "../../components/app-shell/app-shell";

const metrics = [
  { label: "Projected monthly cost", value: "$12,840", delta: "+$420 from latest change" },
  { label: "Open high findings", value: "3", delta: "+1 introduced yesterday" },
  { label: "Active resources", value: "34", delta: "+3 in production" },
  { label: "Recent changes", value: "9", delta: "30 day window" },
];

const recentChanges = [
  { title: "Production checkout deployment", impact: "High", detail: "+$420 monthly · 3 resources · 1 high finding" },
  { title: "Manual security group update", impact: "High", detail: "0 cost change · 1 exposed ingress rule" },
  { title: "Unused compute cleanup", impact: "Positive", detail: "-$180 monthly · 4 resources removed" },
];

export default function OverviewPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <section>
          <p className="text-sm font-medium text-accent">Overview</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
            Latest cloud change impact
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            CloudFlux is showing seeded demo data for an AWS workspace. The first implementation
            slice will connect these panels to API read models backed by PostgreSQL.
          </p>
        </section>

        <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800">
                  High impact
                </span>
                <span className="text-sm text-muted">Production · Deployment · Yesterday</span>
              </div>
              <h2 className="mt-3 text-xl font-semibold tracking-normal text-slate-950">
                Production checkout deployment increased projected monthly cost
              </h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                The deployment added an RDS instance and two NAT gateways, increasing projected
                monthly cost by $420 and introducing one high-risk security group exposure.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center lg:min-w-96">
              <div className="rounded-md border border-line bg-slate-50 p-3">
                <div className="text-lg font-semibold text-slate-950">+$420</div>
                <div className="mt-1 text-xs text-muted">monthly</div>
              </div>
              <div className="rounded-md border border-line bg-slate-50 p-3">
                <div className="text-lg font-semibold text-slate-950">3</div>
                <div className="mt-1 text-xs text-muted">resources</div>
              </div>
              <div className="rounded-md border border-line bg-slate-50 p-3">
                <div className="text-lg font-semibold text-slate-950">1 high</div>
                <div className="mt-1 text-xs text-muted">finding</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border border-line bg-white p-4 shadow-panel">
              <div className="text-sm text-muted">{metric.label}</div>
              <div className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">
                {metric.value}
              </div>
              <div className="mt-2 text-xs text-slate-500">{metric.delta}</div>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
            <h2 className="text-base font-semibold tracking-normal text-slate-950">Recent changes</h2>
            <div className="mt-4 divide-y divide-line">
              {recentChanges.map((change) => (
                <div key={change.title} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div>
                    <div className="font-medium text-slate-900">{change.title}</div>
                    <div className="mt-1 text-sm text-muted">{change.detail}</div>
                  </div>
                  <span className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {change.impact}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
            <h2 className="text-base font-semibold tracking-normal text-slate-950">AI explanation</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              The latest deployment likely increased spend because persistent database capacity and
              managed network egress were added in production. Review the new security group ingress
              before treating this change as healthy.
            </p>
            <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              Generated guidance from seeded demo data. CloudFlux does not modify infrastructure.
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
