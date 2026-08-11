# CloudFlux

CloudFlux is an observe-only AWS cloud intelligence platform for small startup engineering teams.

It helps teams understand how infrastructure and deployment changes affect cloud cost, security posture, and operational risk.

## Product Vision

Small engineering teams often deploy infrastructure changes without having a clear, connected view of what changed, how much it costs, and whether it introduced risk.

CloudFlux exists to answer one practical question:

> What changed in our cloud environment, what did it cost, what risks did it introduce, and what should we review next?

The product is not intended to be a generic SaaS dashboard. Its core value is correlation: connecting infrastructure changes, resource state, cost impact, and security findings into a single operational view.

## Target Users

Primary users:

- Small startup engineering teams using AWS
- Backend engineers responsible for services and infrastructure
- DevOps or platform engineers who need quick visibility across environments
- Technical founders who need cloud visibility without enterprise tooling

Secondary users:

- Solo developers learning cloud architecture
- Cloud learners exploring realistic AWS scenarios
- Hiring managers reviewing the project as a portfolio system

## Core MVP Workflow

The MVP should prove one strong workflow:

> A deployment or infrastructure change happened. CloudFlux shows what changed, what it costs, what risks appeared, and what should be reviewed next.

Example scenario:

> A production deployment added an RDS instance and two NAT gateways, increasing projected monthly cost by $420 and introducing one high-risk security group exposure.

The user should be able to:

1. Open a demo workspace.
2. Review the latest infrastructure or deployment change.
3. See affected AWS resources.
4. Understand cost impact.
5. Review new or resolved security findings.
6. Read an AI-generated explanation and recommended next steps.

## MVP Scope

The first version of CloudFlux will include:

- Demo AWS data only
- One primary dashboard
- Resource inventory
- Cost intelligence
- Security findings
- Change timeline
- Correlated impact summaries
- AI-generated explanations

The MVP is observe-only. It provides insights, summaries, recommendations, and reports, but it does not modify infrastructure.

## MVP Non-Goals

The following are intentionally out of scope for the first version:

- Real AWS account connection
- Multi-cloud support
- Automatic remediation
- Terraform generation
- GitHub pull request automation
- Billing and subscription management
- Enterprise role-based access control
- Compliance reporting
- Kubernetes cluster monitoring
- Full incident management workflows

These may become future expansion areas after the core product workflow is proven.

## Product Modules

### Overview Dashboard

Shows the current state of the workspace:

- Latest impact summary
- Cost trend
- Security risk summary
- Recent changes
- Resource counts by service and environment

### Change Timeline

Shows important cloud and delivery events over time:

- Deployments
- Terraform applies
- Simulated AWS changes
- Cost anomalies
- Security regressions
- Resource cleanup events

### Impact Detail

Explains the effect of a specific change:

- Resources added, removed, or modified
- Estimated cost delta
- Security findings introduced or resolved
- Affected environment
- AI-generated explanation
- Recommended review actions

### Resource Inventory

Shows AWS-style resources such as:

- EC2 instances
- RDS databases
- S3 buckets
- Lambda functions
- IAM roles
- VPCs
- Security groups
- NAT gateways

Resources should be filterable by service, region, environment, status, owner, and tags.

### Cost Intelligence

Shows cloud spend and cost movement:

- Daily spend
- Monthly projection
- Service-level breakdown
- Resource-level estimates
- Cost anomalies
- Cost deltas linked to change events

### Security Posture

Shows detected risks and misconfigurations:

- Finding severity
- Affected resource
- Explanation
- Recommended remediation
- Relationship to recent changes

## Demo Data Scenarios

The MVP should include realistic seeded scenarios:

1. Cost spike after deployment
2. Security regression from an exposed security group
3. Resource cleanup that reduces projected cost
4. Manual production drift outside the deployment pipeline
5. Healthy deployment with minimal cost and no new risks

Demo data allows the product to feel complete before real AWS integrations are introduced.

## Core Domain Concepts

CloudFlux should model cloud state over time, not only current state.

Important domain entities:

- Workspace
- User
- Cloud account
- Environment
- Cloud resource
- Resource snapshot
- Cost snapshot
- Security finding
- Change event
- Impact summary
- AI insight
- Audit event

The most important relationship is between change events and their impact on resources, cost, and security.

## Architecture Direction

CloudFlux should start as a modular monolith.

This keeps the system understandable while still allowing professional architecture boundaries and future growth.

Recommended high-level architecture:

- Frontend: Next.js or React
- Backend: modular API application
- Database: PostgreSQL
- Queue/cache: Redis
- Background workers: ingestion, correlation, reporting
- AI module: isolated behind a dedicated service boundary
- Infrastructure: Docker first, then AWS deployment
- Infrastructure as code: Terraform
- CI/CD: GitHub Actions

Recommended backend modules:

- Identity and workspaces
- Demo cloud data
- Resource inventory
- Cost intelligence
- Security posture
- Change timeline
- Correlation engine
- AI insights
- Audit and events

The architecture should allow modules to become separate services later, but CloudFlux should not begin as a microservices system.

## Engineering Principles

- Product clarity before implementation
- Clean architecture where it reduces complexity
- Strong domain boundaries
- Security-first design
- Maintainable code over premature abstraction
- Test-driven where practical
- Observable background jobs
- Documentation as part of the product
- Infrastructure automation through Terraform
- Deployment discipline through CI/CD

## Roadmap

### Phase 1: Product Foundation

- Finalize product spec
- Define domain model
- Define UX flows
- Seed realistic demo data scenarios
- Establish architecture decisions

### Phase 2: MVP Application

- Build workspace and demo account flow
- Build overview dashboard
- Build resource inventory
- Build cost intelligence views
- Build security findings views
- Build change timeline

### Phase 3: Correlation Engine

- Link change events to resource deltas
- Link resource changes to cost deltas
- Link resource changes to security findings
- Generate impact summaries

### Phase 4: AI Insights

- Generate plain-English change explanations
- Generate remediation recommendations
- Generate cloud health summaries
- Keep AI output separate from core business rules

### Phase 5: Production Hardening

- Add tests
- Add Docker setup
- Add CI/CD pipeline
- Add structured logging
- Add monitoring and health checks
- Add security review
- Prepare AWS deployment

### Phase 6: Real Integrations

Future integrations may include:

- AWS Cost Explorer
- AWS Config
- AWS CloudTrail
- AWS Security Hub
- GitHub Actions
- Terraform plan ingestion
- Slack or email alerts

## Local Development

CloudFlux is scaffolded as a TypeScript monorepo.

Install dependencies:

```bash
npm install
```

Run the API:

```bash
npm run dev:api
```

Run the web app:

```bash
npm run dev:web
```

Local URLs:

- Web app: `http://localhost:3000/overview`
- API health: `http://localhost:3001/api/health`
- Current workspace API: `http://localhost:3001/api/workspaces/current`

Verification commands:

```bash
npm run typecheck
npm run lint
npm run build
npm audit --audit-level=high
```

## Planning Documents

- [Domain Model](docs/domain-model.md)
- [MVP User Experience](docs/mvp-user-experience.md)
- [MVP Decisions](docs/mvp-decisions.md)
- [Implementation Map](docs/implementation-map.md)

## Current Status

Milestone 0 scaffold complete.

The TypeScript monorepo scaffold is in place with a Next.js web app, NestJS API, shared contracts package, API health endpoint, and demo workspace endpoint. The next step is Milestone 1: PostgreSQL, Prisma schema, and deterministic demo seed data.
