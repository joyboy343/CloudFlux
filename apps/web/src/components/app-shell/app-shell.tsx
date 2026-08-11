import Link from "next/link";

const navItems = [
  { href: "/overview", label: "Overview" },
  { href: "/timeline", label: "Timeline" },
  { href: "/resources", label: "Resources" },
  { href: "/costs", label: "Costs" },
  { href: "/security", label: "Security" },
  { href: "/insights", label: "Insights" },
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-white px-5 py-6 lg:block">
        <div className="mb-8">
          <div className="text-lg font-semibold tracking-normal">CloudFlux</div>
          <div className="mt-1 text-sm text-muted">Simulated AWS data</div>
        </div>

        <nav className="space-y-1" aria-label="Primary navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-line bg-white/95 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Acme Cloud Demo</div>
              <div className="text-xs text-muted">Demo workspace · No infrastructure changes enabled</div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-700">
              <span className="rounded-md border border-line bg-white px-2.5 py-1">All environments</span>
              <span className="rounded-md border border-line bg-white px-2.5 py-1">30 days</span>
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-800">
                Observe-only
              </span>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
