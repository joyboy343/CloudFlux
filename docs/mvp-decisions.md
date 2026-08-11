# CloudFlux MVP Decisions

This document records the approved product and UX decisions for the first CloudFlux MVP. These decisions are intended to prevent scope drift before implementation begins.

## Decision Summary

CloudFlux MVP will be an observe-only demo experience using simulated AWS data, a single local demo user, fixed environments, USD costs, seeded security findings, pre-generated AI-like insights, and full-page detail views.

The first version should prove the investigation workflow before adding real integrations or automation.

## Approved Decisions

### 1. Authentication

Decision:

- Start with a single local demo user.

Rationale:

- Authentication is not the core product risk yet.
- The MVP needs to prove the cloud change investigation workflow first.
- The domain model still keeps `User` and `WorkspaceMembership` so real auth can be added later without redesigning the product.

Implications:

- The app can open directly into the seeded demo workspace.
- Real sign-up, login, password reset, SSO, and invitation flows are out of scope for MVP.

### 2. Environments

Decision:

- Use fixed MVP environments: `development`, `staging`, and `production`.

Rationale:

- These are familiar to engineering teams.
- Fixed environments keep demo data, filters, and risk scoring simpler.
- Production can carry higher risk weight in impact summaries.

Implications:

- Custom environments are deferred.
- UX filters can be simple and predictable.

### 3. Currency

Decision:

- Use USD only for the MVP.

Rationale:

- AWS cost examples are easiest to understand in USD.
- Multi-currency support would add formatting, conversion, and reporting complexity before it is needed.

Implications:

- All cost snapshots, deltas, and projections use `USD`.
- Currency conversion is out of scope for MVP.

### 4. Security Findings

Decision:

- Start with seeded scenario findings.
- Add a simple deterministic rule engine later.

Rationale:

- The MVP needs realistic findings tied to change events, not a complete security scanner.
- Seeded findings allow the UX and correlation model to be built against stable data.
- A deterministic rule engine is a good follow-up once the data model is proven.

Implications:

- Security findings are demo-driven in the first build.
- Findings should still use the same domain model expected for future real scanning.

### 5. AI Insights

Decision:

- Start with pre-generated AI-like summaries tied to demo data.
- Add live AI generation after the app workflow is stable.

Rationale:

- Live AI adds API keys, cost, latency, error handling, and prompt quality concerns.
- Pre-generated summaries let the product demonstrate the intended AI experience while keeping the first build deterministic.
- AI should explain CloudFlux domain facts, not create the source-of-truth facts.

Implications:

- The MVP can store AI insights as seeded content.
- The AI module boundary should still exist conceptually so live generation can be added later.

### 6. Dashboard Default

Decision:

- Open the dashboard on the latest high-impact change, with workspace health metrics around it.

Rationale:

- The product's strongest value is explaining change impact.
- A generic health dashboard would weaken the product identity.
- The latest high-impact change gives users an immediate investigation path.

Implications:

- The latest impact summary should dominate the overview dashboard.
- Health metrics should support the investigation, not compete with it.

### 7. Detail Views

Decision:

- Use full pages for impact detail, resource detail, and finding detail.
- Use a section-based layout for impact detail instead of tabs for the first version.

Rationale:

- Full pages support deep links, portfolio review, and future expansion.
- Section-based pages keep the MVP simpler than tabbed state management.
- Side drawers are useful later, but they make the first product workflow easier to lose on small screens.

Implications:

- Routes should exist conceptually for change, resource, and finding detail pages.
- Detail pages should link clearly back to related objects.

### 8. Global Search

Decision:

- Skip global search for MVP.

Rationale:

- Filters and cross-links are enough for the first seeded dataset.
- Global search is useful later when real account data increases volume.

Implications:

- UX should prioritize navigation, filters, and cross-linking.
- Search can be revisited after resource and finding counts grow.

### 9. Finding Acknowledgement

Decision:

- Skip finding acknowledgement in MVP.

Rationale:

- The first version is observe-only.
- Acknowledgement introduces workflow ownership, state transitions, audit requirements, and permissions.
- The MVP should first prove that findings are understandable and tied to changes.

Implications:

- Findings can show status such as `open` or `resolved` from demo data.
- User-driven acknowledgement, accepted risk, and false positive workflows are deferred.

### 10. Historical Data Window

Decision:

- Seed 30 days of demo history by default.
- Support filters for 7, 30, and 90 days in the UX, but 30 days is the default working dataset.

Rationale:

- 30 days is enough to show trends, anomalies, deployments, and cleanup events.
- 7 days can feel too thin for cost analysis.
- 90 days can be added later without changing the core model.

Implications:

- Demo cost trends and timeline events should be designed around a 30-day window first.
- The UI can expose 90 days only when enough demo data exists to make it meaningful.

## MVP Defaults

The first implementation plan should assume:

- App opens directly to the overview dashboard.
- Workspace is `Acme Cloud Demo`.
- Cloud account is `Acme Production AWS`.
- User is a local demo user.
- Data mode is simulated AWS data.
- Time range defaults to 30 days.
- Environment filter defaults to all environments.
- Dashboard prioritizes the latest high-impact change.
- Details are full pages.
- AI insights are pre-generated seeded records.
- Security findings are seeded records.
- No write actions affect infrastructure.

## Deferred Decisions

These should not block the first implementation plan:

- Real authentication provider
- Real AWS connection flow
- Live AI model/provider selection
- Configurable security policy rules
- Custom environments
- Global search
- Finding acknowledgement workflow
- Billing and plan limits
- Notification channels
- Multi-cloud support

## Mentoring Note

These decisions deliberately reduce early product surface area. The MVP should feel complete because the investigation loop is coherent, not because every future SaaS feature exists.