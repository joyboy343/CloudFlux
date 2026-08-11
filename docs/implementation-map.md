# CloudFlux Implementation Map

This document maps the approved CloudFlux product, domain model, MVP user experience, and MVP decisions into an implementation plan.

It is the final planning artifact before application code begins.

## Implementation Decision

Build the MVP as a TypeScript monorepo with a separate frontend app and backend API app.

Recommended shape:

- `apps/web`: Next.js frontend application
- `apps/api`: NestJS modular monolith API
- `packages/contracts`: shared API schemas, enums, and types
- `docs`: product, architecture, UX, and planning documentation

This gives the project a real backend architecture while keeping frontend and backend development in one repository.

## Why This Shape

CloudFlux is a portfolio project for cloud engineering and production-quality SaaS architecture. A frontend-only application would be faster, but it would hide too much of the backend, data modeling, API, testing, and DevOps work that this project is meant to demonstrate.

A separate API app also makes future integrations cleaner:

- AWS ingestion can run behind the API boundary.
- Background workers can share backend modules.
- PostgreSQL can remain the source of truth.
- Redis and queues can be added without changing the frontend.
- The API can later be deployed independently if scale requires it.

The project should still behave as a modular monolith. Do not begin with microservices.

## Chosen Stack

### Language

- TypeScript across frontend, backend, and shared contracts

### Frontend

- Next.js
- React
- Tailwind CSS
- Charting library selected during implementation, likely Recharts or a similar React chart library
- Playwright for browser-level verification later

### Backend

- NestJS API application
- Modular monolith structure
- Prisma for database schema, migrations, and seed scripts
- PostgreSQL as the primary database
- Redis and BullMQ later for background jobs, not required in the first code slice

### Shared Contracts

- Shared TypeScript package for enums, route response types, and validation schemas
- Zod can be used for shared runtime validation if it keeps the boundary clear

### DevOps And Tooling

- Docker Compose for local PostgreSQL and later Redis
- GitHub Actions for CI
- ESLint and Prettier for code quality
- Unit tests for backend domain logic
- API tests for core endpoints
- E2E tests for the core investigation workflow after the UI exists

## Initial Repository Structure

Recommended structure once code begins:

```text
CloudFlux/
  apps/
    api/
      prisma/
        schema.prisma
        seed.ts
      src/
        main.ts
        app.module.ts
        common/
        modules/
          identity/
          workspaces/
          cloud-accounts/
          environments/
          resources/
          costs/
          security/
          changes/
          impact/
          insights/
          audit/
          demo-data/
      test/
    web/
      src/
        app/
          overview/
          timeline/
          changes/[changeEventId]/
          resources/
          resources/[resourceId]/
          costs/
          security/
          security/[findingId]/
          insights/
        components/
          app-shell/
          dashboard/
          timeline/
          resources/
          costs/
          security/
          insights/
          ui/
        lib/
          api/
          formatting/
          filters/
  packages/
    contracts/
      src/
        enums/
        schemas/
        view-models/
  docs/
```

This structure can be simplified during implementation if the tooling cost is too high, but the boundaries should remain clear.

## Backend Module Map

### Identity Module

Responsibility:

- Represent the local demo user for MVP
- Leave room for real authentication later

MVP behavior:

- Return a fixed demo user
- No sign-up, login, password reset, or SSO

Future behavior:

- Real auth provider
- Sessions or JWT validation
- Workspace invitation flow

### Workspaces Module

Responsibility:

- Current workspace
- Workspace membership
- Workspace-level access boundary

MVP behavior:

- Return `Acme Cloud Demo`
- Treat the demo user as a member of that workspace

Future behavior:

- Multiple workspaces
- Role-based access control
- Workspace settings

### Cloud Accounts Module

Responsibility:

- AWS account records visible to CloudFlux
- Demo versus connected account status

MVP behavior:

- Return one demo AWS account
- Clearly identify it as simulated data

Future behavior:

- AWS connection lifecycle
- External account verification
- Integration health

### Environments Module

Responsibility:

- Deployment environments
- Environment filters
- Criticality weighting

MVP behavior:

- Use fixed environments: `development`, `staging`, `production`

Future behavior:

- Custom environments per workspace
- Environment-specific policies

### Resources Module

Responsibility:

- Cloud resources
- Resource snapshots
- Resource detail views
- Resource filters

MVP behavior:

- Read seeded AWS-style resources
- Show current state and related history
- Preserve deleted resources for historical detail pages

Future behavior:

- AWS Config ingestion
- Resource normalization
- Tag policy checks

### Costs Module

Responsibility:

- Cost snapshots
- Spend summaries
- Projections
- Service and environment breakdowns
- Cost anomaly markers

MVP behavior:

- Use seeded 30-day USD cost data
- Distinguish actual, estimated, and projected values
- Link major deltas to change events where possible

Future behavior:

- AWS Cost Explorer ingestion
- Forecasting
- Budgets and alerts

### Security Module

Responsibility:

- Security findings
- Severity and status model
- Remediation guidance
- Finding detail views

MVP behavior:

- Use seeded scenario findings
- Link findings to resources and change events

Future behavior:

- Deterministic rule engine
- AWS Security Hub ingestion
- Accepted risk and false positive workflows

### Changes Module

Responsibility:

- Change events
- Resource changes
- Timeline queries
- Event metadata

MVP behavior:

- Use seeded deployment, Terraform, manual, cost, and security events
- Drive the dashboard and investigation workflow

Future behavior:

- GitHub Actions ingestion
- Terraform plan/apply ingestion
- CloudTrail ingestion

### Impact Module

Responsibility:

- Correlate change events with resource, cost, and security impact
- Serve impact summaries to dashboard and detail pages

MVP behavior:

- Read precomputed seeded impact summaries first
- Keep logic shaped so generated summaries can replace seeded values later

Future behavior:

- Deterministic correlation engine
- Rebuild summaries when underlying facts change
- Impact scoring rules

### Insights Module

Responsibility:

- AI insight records
- AI explanation panels
- Generated summaries and remediation guidance

MVP behavior:

- Serve pre-generated AI-like insights from seeded records
- Keep insights attached to real domain objects

Future behavior:

- Live AI generation
- Prompt templates
- Input fingerprinting
- Regeneration workflow

### Audit Module

Responsibility:

- Internal user and system activity history

MVP behavior:

- Optional minimal audit records for seeded events and AI insight generation

Future behavior:

- Workspace audit log
- Security review support
- Integration event traceability

### Demo Data Module

Responsibility:

- Seed data orchestration
- Demo reset behavior if needed
- Scenario definitions

MVP behavior:

- Deterministically seed the demo workspace
- Keep data plausible and internally linked

Future behavior:

- Demo scenario switching
- Larger datasets for performance testing

## Database Schema Map

Use PostgreSQL as the source of truth. Use UUID primary keys and UTC timestamps. Use JSONB for flexible cloud configuration and metadata where appropriate.

Initial tables:

- `users`
- `workspaces`
- `workspace_memberships`
- `cloud_accounts`
- `environments`
- `cloud_resources`
- `resource_snapshots`
- `change_events`
- `resource_changes`
- `cost_snapshots`
- `security_findings`
- `impact_summaries`
- `ai_insights`
- `audit_events`

### Important Data Rules

- Every tenant-scoped table should include `workspace_id` unless it is only a join table where workspace scope is guaranteed elsewhere.
- Resource snapshots are immutable.
- Change events are append-only.
- Impact summaries are derived and should be reproducible.
- AI insights are explanatory and not authoritative.
- Costs use decimal values, not floating point values.
- Costs always include currency and period.
- Demo data uses stable identifiers where useful for tests and deep links.

### Important Indexes

Plan indexes around product queries:

- `cloud_resources.workspace_id`
- `cloud_resources.cloud_account_id`
- `cloud_resources.environment_id`
- `cloud_resources.service`
- `cloud_resources.resource_type`
- `cloud_resources.status`
- `resource_snapshots.cloud_resource_id`
- `resource_snapshots.captured_at`
- `change_events.workspace_id`
- `change_events.environment_id`
- `change_events.happened_at`
- `change_events.event_type`
- `change_events.source`
- `resource_changes.change_event_id`
- `resource_changes.cloud_resource_id`
- `cost_snapshots.workspace_id`
- `cost_snapshots.period_start`
- `cost_snapshots.service`
- `security_findings.workspace_id`
- `security_findings.severity`
- `security_findings.status`
- `security_findings.cloud_resource_id`
- `impact_summaries.change_event_id`
- `impact_summaries.overall_impact_level`
- `ai_insights.subject_type` and `ai_insights.subject_id`

## API Boundary Map

The frontend should not assemble core product meaning from raw tables. The API should provide read models shaped around screens.

### Current User And Workspace

- `GET /api/me`
- `GET /api/workspaces/current`

Purpose:

- Load demo user, workspace, account, environments, and current defaults.

### Overview

- `GET /api/overview?environment=&rangeDays=`

Purpose:

- Serve the overview dashboard in one request where practical.

Response should include:

- Workspace summary
- Latest high-impact summary
- Key metrics
- Cost trend
- Security summary
- Recent changes preview
- Resource distribution
- Primary AI insight

### Timeline

- `GET /api/timeline?environment=&rangeDays=&eventType=&source=&impactLevel=&hasSecurityFindings=&hasCostImpact=&manualOnly=`

Purpose:

- Serve the change timeline.

Response should include:

- Filtered change event list
- Compact impact summary per event
- Pagination metadata if needed later

### Change Impact Detail

- `GET /api/changes/:changeEventId`

Purpose:

- Serve the full impact detail page.

Response should include:

- Change event header
- Impact summary
- AI explanation
- Resource changes
- Cost impact
- Security impact
- Review actions
- Related events and resources
- Technical metadata

### Resources

- `GET /api/resources?environment=&service=&resourceType=&region=&status=&owner=&hasFindings=&changedRecently=&minMonthlyCost=`
- `GET /api/resources/:resourceId`

Purpose:

- Serve resource inventory and resource detail pages.

### Costs

- `GET /api/costs/summary?environment=&rangeDays=`

Purpose:

- Serve cost intelligence screen.

Response should include:

- Month-to-date cost
- Projected monthly cost
- Cost delta
- Daily trend
- Service breakdown
- Environment breakdown
- Related change events

### Security

- `GET /api/security/findings?environment=&severity=&status=&category=&resourceId=`
- `GET /api/security/findings/:findingId`

Purpose:

- Serve security findings list and detail pages.

### Insights

- `GET /api/insights?subjectType=&insightType=`
- `GET /api/insights/:insightId`

Purpose:

- Serve generated insight list and detail pages.

### Demo Controls

Optional later:

- `POST /api/demo/reset`

Purpose:

- Reset the local demo dataset during development.

This does not violate observe-only infrastructure behavior because it modifies local demo data, not cloud infrastructure.

## Frontend Route Map

Recommended routes:

- `/` redirects to `/overview`
- `/overview`
- `/timeline`
- `/changes/[changeEventId]`
- `/resources`
- `/resources/[resourceId]`
- `/costs`
- `/security`
- `/security/[findingId]`
- `/insights`
- `/insights/[insightId]` optional after the main screens work

## Frontend Data Flow

Use screen-level API calls first. Avoid premature client-side global state.

Recommended approach:

- App shell loads workspace context.
- Each page loads its own read model from the API.
- Filters are represented in URL query params.
- Shared formatting helpers handle cost, dates, severity, status, and resource names.
- Cross-links use stable IDs from the API.

Add richer client state later only when the UX needs it.

## Demo Seed Strategy

Demo data should be deterministic, realistic, and interconnected.

Recommended seed volume:

- 1 workspace
- 1 demo user
- 1 workspace membership
- 1 demo AWS account
- 3 environments
- 25 to 40 cloud resources
- 30 days of daily cost snapshots
- 8 to 12 change events
- 12 to 20 resource changes
- 6 to 10 security findings
- 5 to 8 impact summaries
- 5 to 8 AI insight records

### Seed Date Strategy

Use a configurable demo anchor date.

Recommended behavior:

- Tests use a fixed anchor date.
- Local demo can use a fixed anchor date at first for deterministic screenshots.
- Later, the app can optionally regenerate relative dates from the current day.

This avoids brittle tests while keeping the demo understandable.

### Required Scenarios

Seed these first:

1. Cost spike after production deployment
2. Security regression from exposed ingress
3. Resource cleanup that reduces cost
4. Manual production drift outside deployment pipeline
5. Healthy low-risk deployment

### Seed Quality Bar

Seed records must connect across the product:

- Every high-impact change has an impact summary.
- Every impact summary has related resource changes.
- Cost deltas are reflected in cost snapshots.
- Security findings link to affected resources.
- AI insights refer to facts visible on the page.
- Deleted resources remain visible through historical change detail pages.

## Read Model Strategy

Use database tables for source facts and API read models for screen composition.

Examples:

- `OverviewViewModel`
- `TimelineItemViewModel`
- `ImpactDetailViewModel`
- `ResourceListItemViewModel`
- `ResourceDetailViewModel`
- `CostSummaryViewModel`
- `SecurityFindingListItemViewModel`
- `SecurityFindingDetailViewModel`
- `InsightListItemViewModel`

This keeps the frontend focused on presentation and interaction rather than business correlation.

## First Implementation Milestones

### Milestone 0: Repository Scaffold

Goal:

- Create the monorepo, tooling, and empty apps.

Deliverables:

- Workspace package setup
- `apps/web`
- `apps/api`
- `packages/contracts`
- lint and formatting setup
- root README scripts

Acceptance criteria:

- Developer can install dependencies.
- Developer can run web and API apps locally.
- Empty health endpoint works.
- Empty frontend page renders.

### Milestone 1: API And Database Foundation

Goal:

- Establish PostgreSQL, Prisma, schema, and deterministic seed data.

Deliverables:

- Prisma schema for MVP tables
- Local Docker Compose for PostgreSQL
- Seed script for core demo dataset
- API health endpoint
- API endpoint for current workspace

Acceptance criteria:

- Database migrates locally.
- Seed script creates deterministic demo data.
- API returns demo workspace context.

### Milestone 2: Overview Vertical Slice

Goal:

- Build the first real product slice from database to API to UI.

Deliverables:

- Overview API read model
- App shell and navigation
- Demo workspace header
- Global filters
- Overview dashboard
- Latest high-impact summary panel

Acceptance criteria:

- User opens the app and sees `Acme Cloud Demo`.
- Latest high-impact change is visible immediately.
- Cost, resource, and security deltas are visible.
- Overview page uses API data, not hardcoded frontend-only data.

### Milestone 3: Timeline And Impact Detail

Goal:

- Complete the core investigation loop.

Deliverables:

- Timeline API
- Timeline page
- Impact detail API
- Impact detail page
- Cross-links from overview and timeline to detail

Acceptance criteria:

- User can start at overview, open the latest change, and understand the full impact.
- Impact detail shows resource changes, cost impact, security impact, review actions, and AI explanation.

### Milestone 4: Resource And Security Views

Goal:

- Add resource and finding investigation surfaces.

Deliverables:

- Resource inventory API and page
- Resource detail API and page
- Security findings API and page
- Finding detail API and page

Acceptance criteria:

- User can navigate from impact detail to affected resources and findings.
- Resource and finding detail pages link back to related changes.

### Milestone 5: Cost Intelligence View

Goal:

- Add the cost-specific investigation surface.

Deliverables:

- Cost summary API
- Cost intelligence page
- Service and environment breakdowns
- Cost trend with change markers

Acceptance criteria:

- User can identify cost drivers and link cost movement back to changes.

### Milestone 6: Insights And Polish

Goal:

- Make the AI insight experience coherent and finish MVP polish.

Deliverables:

- Insights API
- Insights page
- UI empty/loading/error states
- Responsive pass
- Accessibility pass

Acceptance criteria:

- AI insights are discoverable and tied to domain objects.
- App remains usable on desktop and mobile.
- Status, severity, and cost information is readable without relying on color alone.

### Milestone 7: Production Hardening

Goal:

- Prepare the app as a portfolio-quality system.

Deliverables:

- Unit tests for correlation and formatting logic
- API tests for core endpoints
- E2E test for main investigation workflow
- Docker Compose for local stack
- GitHub Actions CI
- Structured logging
- Basic deployment documentation

Acceptance criteria:

- Tests run in CI.
- Local setup is documented.
- The project can be reviewed as a production-minded system, not only a UI demo.

## What To Build First

When code begins, build Milestone 0 and Milestone 1 before designing the full UI.

The first useful code target should be:

1. Monorepo scaffold
2. API health endpoint
3. PostgreSQL schema
4. Deterministic seed data
5. Current workspace endpoint

Then build the overview vertical slice.

This order proves the architecture and data model before spending time on UI polish.

## What Not To Build First

Do not start with:

- Real AWS integration
- Live AI calls
- Authentication provider setup
- Kubernetes
- Terraform infrastructure
- Billing
- Global search
- Notification systems
- Complex RBAC
- Microservices

These features are valuable later, but they would distract from the core product proof.

## Technical Risks

### Risk: Too Much Upfront Architecture

Mitigation:

- Keep the first implementation to one web app, one API app, one database, and one shared contracts package.

### Risk: Demo Data Feels Fake

Mitigation:

- Seed connected scenarios, plausible resource names, realistic costs, and visible relationships between changes, resources, costs, findings, and insights.

### Risk: Frontend Becomes A Static Dashboard

Mitigation:

- Require the overview page to consume API read models from the seeded database.

### Risk: AI Feels Decorative

Mitigation:

- Attach every AI insight to a real impact summary, resource, or finding.
- Ensure generated text references facts visible on the page.

### Risk: Correlation Logic Gets Buried In UI

Mitigation:

- Keep impact summaries and screen read models in the backend API.
- Frontend displays the correlation; it should not invent it.

## Current Implementation Status

Milestone 0 is complete.

Implemented scaffold:

- Root npm workspace
- `apps/web` Next.js application
- `apps/api` NestJS API application
- `packages/contracts` shared TypeScript package
- API health endpoint
- Current demo workspace endpoint
- Overview dashboard placeholder route
- Typecheck, lint, build, and audit verification

Next target:

- Milestone 1: PostgreSQL, Prisma schema, and deterministic demo seed data

## First Code Session Goal

The first code session completed Milestone 0. The next code session should target Milestone 1.

Recommended first coding goal:

> Add PostgreSQL, Prisma schema, deterministic demo seed data, and the first database-backed workspace endpoint.

After that, move to the overview vertical slice backed by seeded data.
