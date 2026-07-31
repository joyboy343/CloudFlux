# CloudFlux Domain Model

This document defines the first version of the CloudFlux domain model. It is intentionally conceptual. It should guide future database schema, API design, demo data, and UI flows without committing to implementation details too early.

## Product Anchor

CloudFlux explains how infrastructure and deployment changes affect cloud cost, security posture, and operational risk.

The central domain question is:

> A change happened. What resources changed, what did it cost, what risks appeared, and what should be reviewed next?

Because of that, CloudFlux should model state over time instead of only modeling the current state of an AWS account.

## Modeling Principles

- Every business entity is scoped to a workspace unless it is a global reference value.
- Cloud state is captured as immutable snapshots over time.
- Change events are the center of the product experience.
- Impact summaries are derived from resources, costs, security findings, and change events.
- AI insights explain domain data but are not the source of truth.
- Demo data should use the same domain model as future real AWS integrations.
- The model should support AWS first and avoid premature multi-cloud abstraction.

## High-Level Relationship Model

```text
Workspace
  owns Users through WorkspaceMembership
  owns CloudAccounts
  owns Environments
  owns ChangeEvents
  owns ImpactSummaries

CloudAccount
  owns CloudResources
  owns CostSnapshots
  receives ChangeEvents

CloudResource
  has many ResourceSnapshots
  has many SecurityFindings
  can be affected by many ChangeEvents through ResourceChanges

ChangeEvent
  has many ResourceChanges
  can introduce or resolve SecurityFindings
  can be linked to CostSnapshots through an ImpactSummary
  has one or more AIInsights

ImpactSummary
  belongs to one ChangeEvent
  summarizes resource delta, cost delta, and security delta
  can have AIInsights
```

## Core Entities

### Workspace

A workspace represents the team, organization, or demo tenant using CloudFlux.

Typical fields:

- `id`
- `name`
- `slug`
- `status`
- `created_at`
- `updated_at`

Relationships:

- Has many workspace memberships
- Has many cloud accounts
- Has many environments
- Has many change events
- Has many impact summaries

MVP notes:

- The first MVP can use one seeded demo workspace.
- The model should still be multi-tenant from the beginning so the architecture does not need to be rewritten later.

### User

A user represents a person who can access CloudFlux.

Typical fields:

- `id`
- `email`
- `display_name`
- `created_at`
- `updated_at`

Relationships:

- Has many workspace memberships
- Can create audit events
- Can be associated with manual comments or acknowledgements later

MVP notes:

- Full authentication can be basic at first.
- The domain should not assume one user equals one workspace.

### Workspace Membership

A workspace membership connects a user to a workspace.

Typical fields:

- `id`
- `workspace_id`
- `user_id`
- `role`
- `status`
- `created_at`

Recommended roles for later:

- `owner`
- `admin`
- `member`
- `viewer`

MVP notes:

- The MVP can start with one effective role, but the model should leave room for role-based access control.

### Cloud Account

A cloud account represents an AWS account visible to CloudFlux.

Typical fields:

- `id`
- `workspace_id`
- `provider`
- `account_name`
- `external_account_id`
- `mode`
- `connection_status`
- `created_at`
- `updated_at`

Recommended values:

- `provider`: `aws`
- `mode`: `demo`, later `connected`
- `connection_status`: `demo`, later `pending`, `active`, `error`, `disabled`

Relationships:

- Belongs to one workspace
- Has many cloud resources
- Has many cost snapshots
- Has many change events

MVP notes:

- Use demo AWS account identifiers that look realistic but are clearly fake.
- Avoid modeling Azure or GCP until the AWS product is strong.

### Environment

An environment groups resources and changes by deployment context.

Typical fields:

- `id`
- `workspace_id`
- `name`
- `description`
- `criticality`
- `created_at`

Recommended initial environments:

- `development`
- `staging`
- `production`

Relationships:

- Belongs to one workspace
- Has many resources
- Has many change events
- Can be used in cost and security filtering

MVP notes:

- Production should carry higher risk weight in impact summaries.

### Cloud Resource

A cloud resource represents the long-lived identity of an AWS resource.

Typical fields:

- `id`
- `workspace_id`
- `cloud_account_id`
- `environment_id`
- `external_resource_id`
- `arn`
- `name`
- `service`
- `resource_type`
- `region`
- `status`
- `owner`
- `tags`
- `first_seen_at`
- `last_seen_at`
- `deleted_at`

Example services and resource types:

- `ec2.instance`
- `rds.instance`
- `s3.bucket`
- `lambda.function`
- `iam.role`
- `vpc.vpc`
- `ec2.security_group`
- `ec2.nat_gateway`

Relationships:

- Belongs to one workspace
- Belongs to one cloud account
- Belongs to one environment
- Has many resource snapshots
- Has many security findings
- Has many resource changes

MVP notes:

- The resource entity should represent identity.
- The mutable configuration should live in resource snapshots.

### Resource Snapshot

A resource snapshot captures the state of a cloud resource at a specific point in time.

Typical fields:

- `id`
- `workspace_id`
- `cloud_resource_id`
- `captured_at`
- `configuration`
- `normalized_status`
- `tags`
- `source`
- `source_event_id`
- `created_at`

Relationships:

- Belongs to one cloud resource
- Can be referenced by resource changes as the before or after state

MVP notes:

- Snapshots should be immutable.
- Do not overwrite historical resource state.
- Store both normalized fields and raw/demo configuration where useful.

### Change Event

A change event represents something that happened in the cloud or delivery pipeline.

Typical fields:

- `id`
- `workspace_id`
- `cloud_account_id`
- `environment_id`
- `source`
- `event_type`
- `title`
- `description`
- `actor_name`
- `actor_type`
- `happened_at`
- `external_reference`
- `risk_level`
- `metadata`
- `created_at`

Recommended sources:

- `deployment`
- `terraform`
- `aws_console`
- `aws_api`
- `scheduled_scan`
- `demo_seed`

Recommended event types:

- `deployment_completed`
- `terraform_apply`
- `resource_created`
- `resource_modified`
- `resource_deleted`
- `manual_change_detected`
- `cost_anomaly_detected`
- `security_finding_detected`
- `security_finding_resolved`

Relationships:

- Belongs to one workspace
- Belongs to one cloud account
- Usually belongs to one environment
- Has many resource changes
- Can have one impact summary
- Can have many AI insights

MVP notes:

- Change events should drive the dashboard and timeline.
- The UI should treat this as the entry point into the product.

### Resource Change

A resource change links a change event to a specific resource delta.

Typical fields:

- `id`
- `workspace_id`
- `change_event_id`
- `cloud_resource_id`
- `action`
- `before_snapshot_id`
- `after_snapshot_id`
- `summary`
- `created_at`

Recommended actions:

- `created`
- `updated`
- `deleted`
- `unchanged_but_impacted`

Relationships:

- Belongs to one change event
- Belongs to one cloud resource
- Optionally references before and after resource snapshots

MVP notes:

- This entity makes it possible to explain exactly what changed.
- It also gives the correlation engine a clean input.

### Cost Snapshot

A cost snapshot represents cost over a time period.

Typical fields:

- `id`
- `workspace_id`
- `cloud_account_id`
- `environment_id`
- `cloud_resource_id`
- `service`
- `period_start`
- `period_end`
- `granularity`
- `amount`
- `currency`
- `cost_type`
- `source`
- `created_at`

Recommended values:

- `granularity`: `hourly`, `daily`, `monthly`
- `currency`: `USD`
- `cost_type`: `actual`, `estimated`, `projected`

Relationships:

- Belongs to one workspace
- Belongs to one cloud account
- May belong to one environment
- May belong to one resource

MVP notes:

- Use decimal money values, not floating point values, when this becomes implementation work.
- Demo cost data should be plausible, not random.
- Cost should be attributable by service first, then resource where possible.

### Security Finding

A security finding represents a detected risk, misconfiguration, or policy violation.

Typical fields:

- `id`
- `workspace_id`
- `cloud_account_id`
- `environment_id`
- `cloud_resource_id`
- `title`
- `description`
- `severity`
- `category`
- `status`
- `detected_at`
- `resolved_at`
- `introduced_by_change_event_id`
- `resolved_by_change_event_id`
- `evidence`
- `remediation`
- `created_at`
- `updated_at`

Recommended severities:

- `critical`
- `high`
- `medium`
- `low`
- `informational`

Recommended statuses:

- `open`
- `resolved`
- `accepted_risk`
- `false_positive`

Example categories:

- `network_exposure`
- `public_storage`
- `over_permissive_iam`
- `missing_encryption`
- `missing_backup`
- `logging_disabled`

Relationships:

- Belongs to one workspace
- Belongs to one cloud account
- Usually belongs to one cloud resource
- Can be introduced by a change event
- Can be resolved by a change event

MVP notes:

- Security findings should be explainable and tied to specific resources.
- A finding should not be only a generic warning.

### Impact Summary

An impact summary is the correlated result of a change event.

Typical fields:

- `id`
- `workspace_id`
- `change_event_id`
- `summary_title`
- `summary_text`
- `environment_id`
- `resource_created_count`
- `resource_updated_count`
- `resource_deleted_count`
- `cost_delta_daily`
- `cost_delta_monthly_projected`
- `currency`
- `new_security_findings_count`
- `resolved_security_findings_count`
- `highest_severity`
- `overall_impact_level`
- `generated_at`
- `created_at`

Recommended impact levels:

- `positive`
- `low`
- `medium`
- `high`
- `critical`

Relationships:

- Belongs to one workspace
- Belongs to one change event
- Can have many AI insights

MVP notes:

- This is a derived entity.
- It should be reproducible from the underlying resource changes, cost snapshots, and security findings.
- It is the most important entity for the product experience.

### AI Insight

An AI insight is a generated explanation or recommendation based on CloudFlux domain data.

Typical fields:

- `id`
- `workspace_id`
- `subject_type`
- `subject_id`
- `insight_type`
- `title`
- `content`
- `model_name`
- `input_fingerprint`
- `generated_at`
- `created_at`

Recommended subject types:

- `change_event`
- `impact_summary`
- `cloud_resource`
- `security_finding`
- `workspace_report`

Recommended insight types:

- `plain_english_summary`
- `remediation_guidance`
- `executive_summary`
- `weekly_report`
- `risk_explanation`

MVP notes:

- AI should explain known facts and recommend review actions.
- AI output should not create authoritative costs, findings, or resource records.
- Store enough metadata to know which input produced the insight.

### Audit Event

An audit event records important user or system activity inside CloudFlux.

Typical fields:

- `id`
- `workspace_id`
- `actor_user_id`
- `actor_type`
- `action`
- `target_type`
- `target_id`
- `happened_at`
- `metadata`

Example actions:

- `workspace_created`
- `demo_data_loaded`
- `impact_summary_viewed`
- `security_finding_acknowledged`
- `ai_insight_generated`

MVP notes:

- Audit events do not need to dominate the first UI.
- They are valuable for professional architecture and future security posture.

## Derived Concepts

These may be modeled as separate entities later, but can begin as calculated views or fields.

### Cost Anomaly

A cost anomaly represents unusual cost movement for a service, resource, account, or environment.

Possible fields:

- baseline cost
- observed cost
- absolute delta
- percentage delta
- detection window
- confidence
- related change event

### Review Action

A review action is a recommended next step for a human.

Examples:

- Review public ingress on a security group.
- Confirm whether the new RDS instance needs Multi-AZ.
- Check whether NAT Gateway cost is expected.
- Validate that the manual production change was authorized.

For MVP, review actions can live inside impact summaries or AI insights.

### Policy Rule

A policy rule defines what CloudFlux considers risky.

Examples:

- S3 bucket allows public access.
- Security group exposes SSH to the internet.
- RDS instance has storage encryption disabled.
- Production resource has no owner tag.

For MVP, policy rules can be hardcoded in documentation and demo data. Later they can become configurable.

## Lifecycle Models

### Resource Lifecycle

1. Resource is discovered or seeded.
2. Initial resource snapshot is created.
3. Later scans or events create new snapshots.
4. Resource changes compare before and after snapshots.
5. Deleted resources remain historically visible with `deleted_at` set.

Important rule:

- Do not delete historical resource records just because a cloud resource no longer exists.

### Change Impact Lifecycle

1. A change event is created.
2. Resource changes are attached to the change event.
3. Cost movement is calculated for the relevant window.
4. Security findings introduced or resolved by the change are identified.
5. An impact summary is generated.
6. Optional AI insights are generated from the impact summary.
7. The dashboard and timeline display the result.

### Security Finding Lifecycle

1. A finding is detected.
2. It is linked to a resource and optionally a change event.
3. It remains open until resolved, accepted, or marked as false positive.
4. If resolved, it can be linked to the resolving change event.
5. Historical findings remain visible for trend and audit purposes.

### AI Insight Lifecycle

1. Domain data is selected as input.
2. An AI prompt is generated from trusted structured data.
3. The insight is stored with its subject and input fingerprint.
4. The UI displays the insight as explanatory guidance.
5. If the underlying input changes, a new insight can be generated.

Important rule:

- AI insights should never silently overwrite facts from the core domain model.

## Product Invariants

These rules should hold across the system.

- Every cloud account belongs to exactly one workspace.
- Every cloud resource belongs to exactly one workspace and one cloud account.
- Every resource snapshot belongs to exactly one cloud resource.
- Resource snapshots are immutable once created.
- Change events are append-only historical records.
- Impact summaries are derived from domain data.
- AI insights are explanatory, not authoritative.
- Costs must always have a currency and time period.
- Security findings must always have severity, status, and affected scope.
- Demo data must be deterministic so tests and screenshots are stable.
- All timestamps should be stored in UTC in the future implementation.

## MVP Demo Dataset Shape

The MVP should include one realistic workspace with one demo AWS account and three environments.

Recommended workspace:

- Workspace: `Acme Cloud Demo`
- Cloud account: `Acme Production AWS`
- Environments: `development`, `staging`, `production`

Recommended seeded scenarios:

### Scenario 1: Cost Spike After Deployment

A production deployment creates:

- One RDS instance
- Two NAT gateways
- One security group update

Expected impact:

- Projected monthly cost increases by about `$420`
- One high-severity security finding appears
- AI explains that database and network egress costs are the likely drivers

### Scenario 2: Security Regression

A manual change opens inbound access on a sensitive port.

Expected impact:

- No major cost change
- One critical or high security finding appears
- Timeline marks the event as a manual production drift

### Scenario 3: Resource Cleanup Win

A cleanup change removes unused compute or storage resources.

Expected impact:

- Projected monthly cost decreases
- No new findings
- Impact level is positive

### Scenario 4: Production Drift

A change appears without a matching deployment or Terraform event.

Expected impact:

- Resource configuration changed outside the expected workflow
- Risk level is medium or high depending on environment
- AI recommends verifying ownership and approval

### Scenario 5: Healthy Deployment

A normal application deployment updates Lambda functions or service configuration.

Expected impact:

- Minimal cost delta
- No new security findings
- Impact level is low

## Boundaries For The MVP

Include:

- Demo workspace
- Demo AWS account
- Environments
- Resources
- Resource snapshots
- Change events
- Resource changes
- Cost snapshots
- Security findings
- Impact summaries
- AI insights

Do not include yet:

- Real AWS credentials
- Real AWS ingestion
- Automatic remediation
- Terraform generation
- Pull request creation
- Multi-cloud data model
- Billing plans
- Enterprise permissions

## Open Product Decisions

These should be answered before implementation begins:

1. Should the MVP include authentication immediately, or start with a single local demo user?
2. Should environments be fixed values or configurable per workspace?
3. Should cost data use only USD in the MVP?
4. Should security findings be generated only from seeded scenarios at first, or should there be a simple deterministic rule engine?
5. Should AI insights be generated live through an API, or should the first demo use pre-generated AI-like summaries?
6. Should the dashboard default to the latest high-impact change or a broader workspace health overview?
7. What level of historical data should the demo workspace include: 7 days, 30 days, or 90 days?

## Recommended Next Step

Before writing application code, define the MVP user experience around the entities in this document:

1. Overview dashboard
2. Change timeline
3. Impact detail page
4. Resource inventory
5. Cost intelligence view
6. Security findings view

The domain model should remain stable enough that the frontend, backend, database schema, and demo data can all be designed around the same product language.
