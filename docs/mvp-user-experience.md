# CloudFlux MVP User Experience

This document defines the first MVP user experience for CloudFlux. It translates the product vision and domain model into screens, navigation, user flows, content requirements, and interaction rules.

CloudFlux should feel like a serious operational tool for small AWS engineering teams. The first screen should be the actual working dashboard, not a marketing page.

## UX Goal

The MVP experience should help a user answer this question quickly:

> What changed in our cloud environment, what did it cost, what risks did it introduce, and what should we review next?

The core user experience is not browsing unrelated dashboards. It is investigating the impact of a cloud or deployment change.

## Primary User Journey

The main journey should be short and direct:

1. User opens CloudFlux.
2. User lands in the demo workspace.
3. User sees the latest important impact summary.
4. User understands the cost, resource, and security impact at a glance.
5. User opens the impact detail page.
6. User reviews changed resources, cost delta, security findings, and AI explanation.
7. User navigates to related inventory, cost, or security pages for more detail.

The first strong product moment should happen on the overview dashboard within a few seconds.

## Information Architecture

Recommended MVP navigation:

- Overview
- Timeline
- Resources
- Costs
- Security
- Insights

Recommended supporting areas for later:

- Reports
- Integrations
- Settings
- Audit Log

MVP route shape, conceptually:

- `/` or `/overview`
- `/timeline`
- `/changes/:changeEventId`
- `/resources`
- `/resources/:resourceId`
- `/costs`
- `/security`
- `/security/:findingId`
- `/insights`

These routes are conceptual. They should guide UX and application structure later, but this document does not require any framework-specific implementation.

## Global Layout

The application should use a restrained operational layout:

- Persistent left navigation on desktop
- Collapsible or bottom navigation on mobile
- Top bar with workspace, environment filter, time range, and demo mode indicator
- Main content area optimized for scanning
- Detail pages with clear sections and related links

The product should avoid oversized hero sections, decorative cards, and marketing-style layouts. It should feel like a tool engineers can use repeatedly.

## Global Filters

The MVP should support a small set of global filters:

- Workspace: seeded demo workspace only at first
- Cloud account: seeded demo AWS account only at first
- Environment: all, development, staging, production
- Time range: 7 days, 30 days, 90 days

Recommended defaults:

- Workspace: `Acme Cloud Demo`
- Cloud account: `Acme Production AWS`
- Environment: all
- Time range: 30 days

Filtering should preserve context across screens where practical.

## Screen 1: Overview Dashboard

### Purpose

The overview dashboard is the main entry point. It should summarize workspace health and make the latest meaningful change impossible to miss.

### Primary Questions

The overview should answer:

- What is the latest important change?
- Did cost increase or decrease?
- Did security risk increase or decrease?
- Which resources were affected?
- What should be reviewed first?

### Information Hierarchy

Recommended order:

1. Workspace status header
2. Latest impact summary
3. Key metrics row
4. Cost trend
5. Security risk summary
6. Recent change timeline preview
7. Resource distribution summary
8. AI insight panel

### Required Content

Workspace status header:

- Workspace name
- Demo mode indicator
- Selected environment
- Selected time range
- Last data refresh timestamp

Latest impact summary:

- Change title
- Change source
- Environment
- Happened time
- Overall impact level
- Cost delta
- Resource delta
- Security delta
- Primary recommended review action
- Link to impact detail page

Key metrics:

- Current monthly projected cost
- Cost change over selected period
- Open security findings by severity
- Total active resources
- Recent change count

Cost trend:

- Daily spend over selected time range
- Anomaly markers
- Deployment or change markers

Security risk summary:

- Open findings grouped by severity
- New findings in selected time range
- Resolved findings in selected time range
- Highest-risk affected environment

Recent changes preview:

- Last 5 change events
- Source icon or label
- Impact level
- Cost/security/resource deltas

Resource distribution:

- Count by service
- Count by environment
- Optional region breakdown

AI insight panel:

- Plain-English summary of the latest impact
- Short list of recommended review actions
- Clear label that this is generated guidance

### Empty State

The MVP uses demo data, so this screen should not be empty by default.

If filters remove all visible data, show:

- Clear explanation of the active filters
- Button or control to reset filters
- No fake loading or generic error language

## Screen 2: Change Timeline

### Purpose

The timeline shows cloud and delivery events over time. It is the main investigation surface for understanding change history.

### Primary Questions

The timeline should answer:

- What changed recently?
- Which changes had the highest impact?
- Which changes were deployments, Terraform applies, manual changes, or findings?
- Which changes affected production?
- Which changes need review?

### Required Content

Each timeline item should show:

- Event title
- Event type
- Source
- Environment
- Actor name or system source
- Happened time
- Overall impact level
- Cost delta
- Resource delta
- Security delta
- Short summary
- Link to impact detail page when available

### Filters

Timeline-specific filters:

- Event type
- Source
- Impact level
- Environment
- Has security findings
- Has cost impact
- Manual changes only

### Sorting

Default sort:

- Newest first

Optional later sort:

- Highest impact first
- Largest cost delta first
- Highest severity first

### Interaction Rules

- Selecting a timeline item should open the impact detail page.
- Manual production drift should be visually distinct.
- Positive changes should be visible, not hidden behind only negative risk language.
- Timeline items should avoid vague labels like `Update` without context.

## Screen 3: Impact Detail

### Purpose

The impact detail page is the most important MVP screen. It explains one change event and its consequences.

### Primary Questions

The page should answer:

- What happened?
- Who or what caused it?
- Which resources changed?
- How did cost change?
- What security findings were introduced or resolved?
- What should be reviewed next?
- What related data should the user inspect?

### Information Hierarchy

Recommended order:

1. Change event header
2. Impact summary strip
3. AI explanation
4. Resource changes
5. Cost impact
6. Security impact
7. Review actions
8. Related events and resources
9. Raw metadata or technical details

### Required Content

Change event header:

- Title
- Event type
- Source
- Environment
- Actor
- Timestamp
- External reference if available

Impact summary strip:

- Overall impact level
- Monthly projected cost delta
- Daily cost delta if useful
- Resources created, updated, deleted
- New security findings
- Resolved security findings
- Highest severity

AI explanation:

- Plain-English explanation
- Why the change matters
- Recommended next steps
- Explicit note that AI summarizes CloudFlux data and does not modify infrastructure

Resource changes:

- Resource name
- Resource type
- Region
- Action: created, updated, deleted, impacted
- Before and after summary where applicable
- Link to resource detail

Cost impact:

- Cost before
- Cost after
- Delta
- Services responsible for the delta
- Projection confidence or source label

Security impact:

- Finding title
- Severity
- Affected resource
- Status
- Introduced or resolved by this change
- Remediation summary
- Link to finding detail

Review actions:

- Prioritized list of human review steps
- No automatic remediation in MVP
- Actions should be framed as review or investigation tasks

Technical details:

- Event source metadata
- Related resource snapshot identifiers
- Demo data source label

### Interaction Rules

- This page should connect sideways to resources, costs, and security findings.
- It should not bury the AI summary at the bottom.
- It should separate facts from generated interpretation.
- It should make cost and security deltas visible without requiring the user to compare raw tables.

## Screen 4: Resource Inventory

### Purpose

The resource inventory shows the current and historical AWS-style resources known to CloudFlux.

### Primary Questions

The screen should answer:

- What resources exist?
- Which environment do they belong to?
- Which resources are risky or expensive?
- Which resources changed recently?
- Which resources lack ownership or expected tags?

### Required Table Columns

Recommended columns:

- Resource name
- Resource type
- Service
- Environment
- Region
- Status
- Owner
- Estimated monthly cost
- Open findings
- Last changed

### Filters

Resource filters:

- Service
- Resource type
- Environment
- Region
- Status
- Owner
- Has open findings
- Changed recently
- Cost threshold

### Resource Detail Page

The MVP can include either a full detail page or a detail drawer. A full page is cleaner for long-term growth.

Resource detail should show:

- Resource identity
- Current status
- Environment and region
- Tags
- Estimated cost
- Open security findings
- Recent resource snapshots
- Related change events
- AI risk or cost explanation if available

### Interaction Rules

- Resource rows should link to resource detail.
- Resource detail should link back to the change events that affected it.
- Deleted resources should remain visible in historical contexts but should not be counted as active resources.

## Screen 5: Cost Intelligence

### Purpose

The cost intelligence screen shows spend trends and explains cost movement.

### Primary Questions

The screen should answer:

- How much are we spending?
- What is the projected monthly cost?
- Which services drive spend?
- What changed cost recently?
- Which change events are linked to cost movement?

### Required Content

Top metrics:

- Current month-to-date cost
- Projected monthly cost
- Cost delta over selected time range
- Largest service cost driver
- Largest recent increase

Charts and breakdowns:

- Daily spend trend
- Service breakdown
- Environment breakdown
- Cost anomaly markers
- Related change events

Cost table:

- Service
- Environment
- Current period cost
- Previous period cost
- Delta
- Linked resources
- Linked change events

### Interaction Rules

- Cost anomalies should link to related change events when known.
- Cost deltas should show absolute and percentage change where useful.
- Demo costs should be realistic and stable.
- The UI should clearly distinguish actual, estimated, and projected cost.

## Screen 6: Security Findings

### Purpose

The security findings screen shows current and historical security risks detected by CloudFlux.

### Primary Questions

The screen should answer:

- What risks are currently open?
- Which risks are severe?
- Which resources are affected?
- Which change introduced a finding?
- What should be reviewed or fixed first?

### Required Content

Summary metrics:

- Open critical findings
- Open high findings
- New findings in selected time range
- Resolved findings in selected time range
- Most affected service or environment

Findings table:

- Finding title
- Severity
- Status
- Category
- Affected resource
- Environment
- Detected time
- Introduced by change
- Remediation summary

Finding detail:

- Full description
- Evidence
- Affected resource
- Introduced by change event
- Resolution status
- Remediation guidance
- Related resource snapshots if useful

### Interaction Rules

- Findings should link to affected resources.
- Findings introduced by a change should link to the impact detail page.
- Severity should be visually clear but not theatrical.
- Accepted risk and false positive states can be modeled later, but the UX should leave room for them.

## Screen 7: Insights

### Purpose

The insights screen collects generated explanations, summaries, and reports.

This is lower priority than the six core product screens, but it gives AI a clear home instead of scattering generated text without context.

### Required Content

Insight list:

- Title
- Insight type
- Subject type
- Related change, resource, finding, or workspace
- Generated time
- Short preview

Insight detail:

- Full generated content
- Source data summary
- Related domain objects
- Generated timestamp
- Model name if useful

### MVP Rule

AI insights should be attached to real domain objects. Avoid a generic chatbot as the first AI experience.

A chatbot may come later, but the MVP should prioritize structured explanations tied to impact summaries.

## Demo Workspace Experience

The first MVP can avoid full onboarding by opening directly into the seeded demo workspace.

Recommended entry behavior:

1. User opens the app.
2. App displays `Acme Cloud Demo` in demo mode.
3. Dashboard shows the highest-impact recent change.
4. A demo mode indicator makes it clear no real AWS account is connected.

The UX should make demo mode feel intentional, not unfinished.

Recommended demo mode text:

- `Demo workspace`
- `Simulated AWS data`
- `No infrastructure changes can be made from CloudFlux`

Avoid language like:

- `Mock data`
- `Fake account`
- `Placeholder dashboard`

## Navigation Model

Primary navigation should be stable and shallow.

Recommended order:

1. Overview
2. Timeline
3. Resources
4. Costs
5. Security
6. Insights

The navigation should reflect how users investigate:

- Start at overview
- Open a change
- Inspect affected resources, cost, and findings
- Return to timeline or dashboard

## Cross-Linking Rules

CloudFlux becomes useful when data connects across screens.

Required links:

- Dashboard latest impact summary links to impact detail
- Timeline item links to impact detail
- Impact detail resource rows link to resource detail
- Impact detail security rows link to finding detail
- Cost anomalies link to related change events
- Security findings link to affected resources
- Resource detail links to related change events and findings

Without cross-linking, CloudFlux becomes a set of unrelated dashboards. Cross-linking is part of the product value.

## Visual Design Direction

The visual language should be calm, dense, and operational.

Recommended traits:

- Clear hierarchy
- Compact but readable tables
- Strong alignment
- Minimal decoration
- Professional color usage
- Status colors used consistently
- Data-first layout
- No marketing hero on the app screen

Status color guidance:

- Positive: green
- Low or neutral: gray or blue
- Medium: amber
- High: orange
- Critical: red

Avoid letting the entire app become a single-color theme. Cost, security, resources, and changes should have distinct but restrained visual treatment.

## Component Inventory

The MVP will likely need these reusable UI components later:

- App shell
- Sidebar navigation
- Top filter bar
- Metric tile
- Impact summary panel
- Timeline item
- Status badge
- Severity badge
- Environment badge
- Cost delta indicator
- Resource type badge
- Data table
- Filter bar
- Empty state
- Detail header
- Related object list
- AI insight panel
- Review action list

This is a design inventory, not a command to build a component library immediately.

## Content Rules

CloudFlux should use precise operational language.

Prefer:

- `Projected monthly cost increased by $420`
- `2 high findings introduced`
- `3 resources created in production`
- `Manual production change detected`

Avoid:

- `Something changed`
- `Your cloud looks risky`
- `Optimization opportunity`
- `AI-powered magic`

Generated explanations should be concise and grounded in visible facts.

## Loading, Empty, And Error States

Even in demo mode, the UX should define application states.

Loading state:

- Show stable skeletons for dashboard metrics, tables, and charts.
- Avoid layout shift after loading completes.

Empty state:

- Explain which filter caused no results.
- Provide a reset filters action.
- Do not suggest connecting AWS in the MVP unless that flow exists.

Error state:

- Explain that data could not be loaded.
- Preserve navigation.
- Provide retry.
- For demo data, errors should be rare and actionable.

## Accessibility Requirements

MVP UI should be designed with accessibility from the beginning:

- Text must have sufficient contrast.
- Status must not rely on color alone.
- Tables need readable headers.
- Interactive controls need clear labels.
- Keyboard navigation should work for navigation, filters, and table rows.
- Charts should have textual summaries.
- AI-generated content should be readable as plain text.

## Mobile Behavior

CloudFlux is primarily a desktop operational tool, but the MVP should not break on mobile.

Mobile priorities:

- Overview summary remains readable.
- Navigation collapses cleanly.
- Tables become stacked rows or horizontally scrollable only where acceptable.
- Impact detail remains usable.
- Filters do not cover the whole experience awkwardly.

Desktop should be the primary design target for the first version.

## UX Acceptance Criteria

The MVP UX is successful when a first-time user can:

1. Understand that CloudFlux uses simulated AWS data.
2. Identify the latest important cloud change.
3. See whether the change affected cost.
4. See whether the change introduced or resolved security findings.
5. See which resources changed.
6. Open a detail view for the change.
7. Follow links to related resources and findings.
8. Read an AI explanation that summarizes visible facts.
9. Understand that CloudFlux is observe-only.
10. Explain the product purpose without reading the README.

## Recommended Build Order

Recommended UX implementation order later:

1. App shell and navigation
2. Demo workspace header and global filters
3. Overview dashboard with seeded summaries
4. Change timeline
5. Impact detail page
6. Resource inventory
7. Security findings
8. Cost intelligence
9. Resource and finding detail pages
10. Insights collection

This order keeps the core product workflow visible from the beginning.

## Open UX Decisions

These should be resolved before application implementation:

1. Should the app open directly to the dashboard, or show a lightweight demo workspace selector first?
2. Should the latest impact summary dominate the dashboard, or should workspace health metrics be visually equal?
3. Should the impact detail page use tabs, sections, or a split layout?
4. Should resource detail and finding detail be full pages or side drawers?
5. Should AI insights be pre-generated for demo data first, or generated live through an API?
6. Should the MVP include a global search box?
7. Should users be able to acknowledge findings in the MVP, or should that wait until after observe-only browsing is complete?

## Mentoring Recommendation

Start the product UI with the investigation loop, not the dashboard widgets.

The most important screen is the impact detail page because it proves CloudFlux is more than a collection of charts. The dashboard and timeline should constantly lead users back to impact summaries.