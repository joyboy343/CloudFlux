import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const workspaceId = "workspace_acme_demo";
const cloudAccountId = "cloud_account_acme_prod";
const userId = "user_demo_owner";
const anchor = new Date("2026-08-01T12:00:00.000Z");

function daysAgo(days: number) {
  const date = new Date(anchor);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function dayWindow(days: number) {
  const start = daysAgo(days);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

async function clearDemoData() {
  await prisma.auditEvent.deleteMany();
  await prisma.aIInsight.deleteMany();
  await prisma.impactSummary.deleteMany();
  await prisma.securityFinding.deleteMany();
  await prisma.costSnapshot.deleteMany();
  await prisma.resourceChange.deleteMany();
  await prisma.changeEvent.deleteMany();
  await prisma.resourceSnapshot.deleteMany();
  await prisma.cloudResource.deleteMany();
  await prisma.environment.deleteMany();
  await prisma.cloudAccount.deleteMany();
  await prisma.workspaceMembership.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
}

async function seed() {
  await clearDemoData();

  await prisma.user.create({
    data: {
      id: userId,
      email: "demo@cloudflux.local",
      displayName: "Demo Owner",
    },
  });

  await prisma.workspace.create({
    data: {
      id: workspaceId,
      name: "Acme Cloud Demo",
      slug: "acme-cloud-demo",
      status: "active",
    },
  });

  await prisma.workspaceMembership.create({
    data: {
      id: "membership_demo_owner",
      workspaceId,
      userId,
      role: "owner",
      status: "active",
    },
  });

  await prisma.cloudAccount.create({
    data: {
      id: cloudAccountId,
      workspaceId,
      provider: "aws",
      accountName: "Acme Production AWS",
      externalAccountId: "123456789012",
      mode: "demo",
      connectionStatus: "demo",
    },
  });

  await prisma.environment.createMany({
    data: [
      {
        id: "env_development",
        workspaceId,
        name: "development",
        description: "Developer sandbox resources",
        criticality: "low",
      },
      {
        id: "env_staging",
        workspaceId,
        name: "staging",
        description: "Pre-production validation resources",
        criticality: "medium",
      },
      {
        id: "env_production",
        workspaceId,
        name: "production",
        description: "Customer-facing production resources",
        criticality: "high",
      },
    ],
  });

  const resources = [
    {
      id: "resource_rds_checkout_prod",
      environmentId: "env_production",
      externalResourceId: "rds:checkout-primary",
      arn: "arn:aws:rds:us-east-1:123456789012:db:checkout-primary",
      name: "checkout-primary",
      service: "rds",
      resourceType: "rds.instance",
      region: "us-east-1",
      status: "active",
      owner: "payments-team",
      tags: { service: "checkout", owner: "payments-team", environment: "production" },
      firstSeenAt: daysAgo(1),
      lastSeenAt: daysAgo(0),
    },
    {
      id: "resource_nat_gateway_a_prod",
      environmentId: "env_production",
      externalResourceId: "nat:nat-0a123",
      arn: "arn:aws:ec2:us-east-1:123456789012:natgateway/nat-0a123",
      name: "prod-nat-a",
      service: "ec2",
      resourceType: "ec2.nat_gateway",
      region: "us-east-1",
      status: "active",
      owner: "platform-team",
      tags: { service: "networking", owner: "platform-team", environment: "production" },
      firstSeenAt: daysAgo(1),
      lastSeenAt: daysAgo(0),
    },
    {
      id: "resource_nat_gateway_b_prod",
      environmentId: "env_production",
      externalResourceId: "nat:nat-0b456",
      arn: "arn:aws:ec2:us-east-1:123456789012:natgateway/nat-0b456",
      name: "prod-nat-b",
      service: "ec2",
      resourceType: "ec2.nat_gateway",
      region: "us-east-1",
      status: "active",
      owner: "platform-team",
      tags: { service: "networking", owner: "platform-team", environment: "production" },
      firstSeenAt: daysAgo(1),
      lastSeenAt: daysAgo(0),
    },
    {
      id: "resource_checkout_sg_prod",
      environmentId: "env_production",
      externalResourceId: "sg:sg-0checkout",
      arn: "arn:aws:ec2:us-east-1:123456789012:security-group/sg-0checkout",
      name: "checkout-db-access",
      service: "ec2",
      resourceType: "ec2.security_group",
      region: "us-east-1",
      status: "active",
      owner: "payments-team",
      tags: { service: "checkout", owner: "payments-team", environment: "production" },
      firstSeenAt: daysAgo(20),
      lastSeenAt: daysAgo(0),
    },
    {
      id: "resource_billing_lambda_prod",
      environmentId: "env_production",
      externalResourceId: "lambda:billing-worker",
      arn: "arn:aws:lambda:us-east-1:123456789012:function:billing-worker",
      name: "billing-worker",
      service: "lambda",
      resourceType: "lambda.function",
      region: "us-east-1",
      status: "active",
      owner: "billing-team",
      tags: { service: "billing", owner: "billing-team", environment: "production" },
      firstSeenAt: daysAgo(30),
      lastSeenAt: daysAgo(0),
    },
    {
      id: "resource_assets_bucket_prod",
      environmentId: "env_production",
      externalResourceId: "s3:acme-prod-assets",
      arn: "arn:aws:s3:::acme-prod-assets",
      name: "acme-prod-assets",
      service: "s3",
      resourceType: "s3.bucket",
      region: "us-east-1",
      status: "active",
      owner: "platform-team",
      tags: { service: "assets", owner: "platform-team", environment: "production" },
      firstSeenAt: daysAgo(28),
      lastSeenAt: daysAgo(0),
    },
    {
      id: "resource_api_instance_staging",
      environmentId: "env_staging",
      externalResourceId: "ec2:i-0stagingapi",
      arn: "arn:aws:ec2:us-east-1:123456789012:instance/i-0stagingapi",
      name: "staging-api-01",
      service: "ec2",
      resourceType: "ec2.instance",
      region: "us-east-1",
      status: "active",
      owner: "platform-team",
      tags: { service: "api", owner: "platform-team", environment: "staging" },
      firstSeenAt: daysAgo(18),
      lastSeenAt: daysAgo(0),
    },
    {
      id: "resource_dev_cache",
      environmentId: "env_development",
      externalResourceId: "elasticache:dev-cache",
      arn: "arn:aws:elasticache:us-east-1:123456789012:cluster:dev-cache",
      name: "dev-cache",
      service: "elasticache",
      resourceType: "elasticache.cluster",
      region: "us-east-1",
      status: "active",
      owner: "platform-team",
      tags: { service: "cache", owner: "platform-team", environment: "development" },
      firstSeenAt: daysAgo(16),
      lastSeenAt: daysAgo(0),
    },
    {
      id: "resource_unused_worker_old",
      environmentId: "env_staging",
      externalResourceId: "ec2:i-0unusedworker",
      arn: "arn:aws:ec2:us-east-1:123456789012:instance/i-0unusedworker",
      name: "old-worker-staging",
      service: "ec2",
      resourceType: "ec2.instance",
      region: "us-east-1",
      status: "deleted",
      owner: "platform-team",
      tags: { service: "worker", owner: "platform-team", environment: "staging" },
      firstSeenAt: daysAgo(25),
      lastSeenAt: daysAgo(8),
      deletedAt: daysAgo(8),
    },
  ];

  for (const resource of resources) {
    await prisma.cloudResource.create({
      data: {
        ...resource,
        workspaceId,
        cloudAccountId,
      },
    });

    await prisma.resourceSnapshot.create({
      data: {
        id: `snapshot_${resource.id}_current`,
        workspaceId,
        cloudResourceId: resource.id,
        capturedAt: resource.lastSeenAt,
        configuration: {
          name: resource.name,
          service: resource.service,
          resourceType: resource.resourceType,
          region: resource.region,
          status: resource.status,
        },
        normalizedStatus: resource.status,
        tags: resource.tags,
        source: "demo_seed",
      },
    });
  }

  const changeEvents = [
    {
      id: "change_checkout_deploy_cost_spike",
      environmentId: "env_production",
      source: "deployment",
      eventType: "deployment_completed",
      title: "Production checkout deployment",
      description: "Checkout deployment added database and network capacity for a new payment flow.",
      actorName: "github-actions[bot]",
      actorType: "system",
      happenedAt: daysAgo(1),
      externalReference: "deploy-2026-08-01-001",
      riskLevel: "high",
      metadata: { repository: "acme/checkout", workflow: "production-deploy" },
    },
    {
      id: "change_manual_sg_opened",
      environmentId: "env_production",
      source: "aws_console",
      eventType: "manual_change_detected",
      title: "Manual security group ingress change",
      description: "A production security group was changed outside the deployment pipeline.",
      actorName: "platform-admin",
      actorType: "user",
      happenedAt: daysAgo(3),
      externalReference: "cloudtrail-event-7788",
      riskLevel: "high",
      metadata: { detection: "demo-cloudtrail" },
    },
    {
      id: "change_cleanup_unused_compute",
      environmentId: "env_staging",
      source: "terraform",
      eventType: "terraform_apply",
      title: "Unused staging worker cleanup",
      description: "Terraform removed an unused staging worker instance.",
      actorName: "terraform-cloud",
      actorType: "system",
      happenedAt: daysAgo(8),
      externalReference: "tf-apply-4412",
      riskLevel: "positive",
      metadata: { workspace: "acme-staging" },
    },
    {
      id: "change_billing_lambda_healthy",
      environmentId: "env_production",
      source: "deployment",
      eventType: "deployment_completed",
      title: "Billing worker deployment",
      description: "Routine Lambda deployment with no new security findings.",
      actorName: "github-actions[bot]",
      actorType: "system",
      happenedAt: daysAgo(12),
      externalReference: "deploy-2026-07-20-003",
      riskLevel: "low",
      metadata: { repository: "acme/billing", workflow: "production-deploy" },
    },
    {
      id: "change_dev_cache_created",
      environmentId: "env_development",
      source: "terraform",
      eventType: "resource_created",
      title: "Development cache created",
      description: "A development cache cluster was added for feature testing.",
      actorName: "terraform-cloud",
      actorType: "system",
      happenedAt: daysAgo(16),
      externalReference: "tf-apply-3988",
      riskLevel: "low",
      metadata: { workspace: "acme-development" },
    },
  ];

  for (const event of changeEvents) {
    await prisma.changeEvent.create({
      data: {
        ...event,
        workspaceId,
        cloudAccountId,
      },
    });
  }

  await prisma.resourceChange.createMany({
    data: [
      {
        id: "resource_change_checkout_rds_created",
        workspaceId,
        changeEventId: "change_checkout_deploy_cost_spike",
        cloudResourceId: "resource_rds_checkout_prod",
        action: "created",
        afterSnapshotId: "snapshot_resource_rds_checkout_prod_current",
        summary: "Created production checkout RDS instance.",
      },
      {
        id: "resource_change_nat_a_created",
        workspaceId,
        changeEventId: "change_checkout_deploy_cost_spike",
        cloudResourceId: "resource_nat_gateway_a_prod",
        action: "created",
        afterSnapshotId: "snapshot_resource_nat_gateway_a_prod_current",
        summary: "Created NAT gateway in production availability zone A.",
      },
      {
        id: "resource_change_nat_b_created",
        workspaceId,
        changeEventId: "change_checkout_deploy_cost_spike",
        cloudResourceId: "resource_nat_gateway_b_prod",
        action: "created",
        afterSnapshotId: "snapshot_resource_nat_gateway_b_prod_current",
        summary: "Created NAT gateway in production availability zone B.",
      },
      {
        id: "resource_change_checkout_sg_updated",
        workspaceId,
        changeEventId: "change_manual_sg_opened",
        cloudResourceId: "resource_checkout_sg_prod",
        action: "updated",
        afterSnapshotId: "snapshot_resource_checkout_sg_prod_current",
        summary: "Updated ingress rules on checkout database security group.",
      },
      {
        id: "resource_change_unused_worker_deleted",
        workspaceId,
        changeEventId: "change_cleanup_unused_compute",
        cloudResourceId: "resource_unused_worker_old",
        action: "deleted",
        afterSnapshotId: "snapshot_resource_unused_worker_old_current",
        summary: "Deleted unused staging worker instance.",
      },
      {
        id: "resource_change_billing_lambda_updated",
        workspaceId,
        changeEventId: "change_billing_lambda_healthy",
        cloudResourceId: "resource_billing_lambda_prod",
        action: "updated",
        afterSnapshotId: "snapshot_resource_billing_lambda_prod_current",
        summary: "Updated billing worker Lambda code package.",
      },
      {
        id: "resource_change_dev_cache_created",
        workspaceId,
        changeEventId: "change_dev_cache_created",
        cloudResourceId: "resource_dev_cache",
        action: "created",
        afterSnapshotId: "snapshot_resource_dev_cache_current",
        summary: "Created development cache cluster.",
      },
    ],
  });

  for (let i = 29; i >= 0; i -= 1) {
    const { start, end } = dayWindow(i);
    const costBoost = i <= 1 ? 14 : 0;
    await prisma.costSnapshot.createMany({
      data: [
        {
          id: `cost_rds_${i}`,
          workspaceId,
          cloudAccountId,
          environmentId: "env_production",
          cloudResourceId: "resource_rds_checkout_prod",
          service: "rds",
          periodStart: start,
          periodEnd: end,
          granularity: "daily",
          amount: (62 + costBoost).toFixed(2),
          currency: "USD",
          costType: "estimated",
          source: "demo_seed",
        },
        {
          id: `cost_ec2_${i}`,
          workspaceId,
          cloudAccountId,
          environmentId: "env_production",
          service: "ec2",
          periodStart: start,
          periodEnd: end,
          granularity: "daily",
          amount: (118 + (i <= 1 ? 18 : 0)).toFixed(2),
          currency: "USD",
          costType: "estimated",
          source: "demo_seed",
        },
        {
          id: `cost_lambda_${i}`,
          workspaceId,
          cloudAccountId,
          environmentId: "env_production",
          cloudResourceId: "resource_billing_lambda_prod",
          service: "lambda",
          periodStart: start,
          periodEnd: end,
          granularity: "daily",
          amount: "12.00",
          currency: "USD",
          costType: "estimated",
          source: "demo_seed",
        },
        {
          id: `cost_s3_${i}`,
          workspaceId,
          cloudAccountId,
          environmentId: "env_production",
          cloudResourceId: "resource_assets_bucket_prod",
          service: "s3",
          periodStart: start,
          periodEnd: end,
          granularity: "daily",
          amount: "9.50",
          currency: "USD",
          costType: "estimated",
          source: "demo_seed",
        },
      ],
    });
  }

  await prisma.securityFinding.createMany({
    data: [
      {
        id: "finding_checkout_sg_public_postgres",
        workspaceId,
        cloudAccountId,
        environmentId: "env_production",
        cloudResourceId: "resource_checkout_sg_prod",
        title: "PostgreSQL ingress exposed to the internet",
        description: "The checkout database security group allows inbound PostgreSQL traffic from 0.0.0.0/0.",
        severity: "high",
        category: "network_exposure",
        status: "open",
        detectedAt: daysAgo(1),
        introducedByChangeEventId: "change_checkout_deploy_cost_spike",
        evidence: { port: 5432, cidr: "0.0.0.0/0", protocol: "tcp" },
        remediation: "Restrict ingress to application security groups or approved private CIDR ranges.",
      },
      {
        id: "finding_manual_ssh_public",
        workspaceId,
        cloudAccountId,
        environmentId: "env_production",
        cloudResourceId: "resource_checkout_sg_prod",
        title: "SSH ingress opened on production security group",
        description: "A manual console change opened SSH access to a production security group.",
        severity: "high",
        category: "network_exposure",
        status: "open",
        detectedAt: daysAgo(3),
        introducedByChangeEventId: "change_manual_sg_opened",
        evidence: { port: 22, cidr: "0.0.0.0/0", source: "aws_console" },
        remediation: "Remove public SSH access and use SSM Session Manager or a private bastion workflow.",
      },
      {
        id: "finding_assets_bucket_logging",
        workspaceId,
        cloudAccountId,
        environmentId: "env_production",
        cloudResourceId: "resource_assets_bucket_prod",
        title: "S3 access logging disabled",
        description: "The production assets bucket does not have server access logging enabled.",
        severity: "medium",
        category: "logging_disabled",
        status: "open",
        detectedAt: daysAgo(7),
        evidence: { bucket: "acme-prod-assets", logging: false },
        remediation: "Enable access logging or CloudTrail data events for the production assets bucket.",
      },
    ],
  });

  await prisma.impactSummary.createMany({
    data: [
      {
        id: "impact_checkout_deploy_cost_spike",
        workspaceId,
        changeEventId: "change_checkout_deploy_cost_spike",
        summaryTitle: "Production deployment increased projected monthly cost",
        summaryText: "The checkout deployment added an RDS instance and two NAT gateways, increasing projected monthly cost by $420 and introducing one high-risk security finding.",
        environmentId: "env_production",
        resourceCreatedCount: 3,
        resourceUpdatedCount: 0,
        resourceDeletedCount: 0,
        costDeltaDaily: "14.00",
        costDeltaMonthlyProjected: "420.00",
        currency: "USD",
        newSecurityFindingsCount: 1,
        resolvedSecurityFindingsCount: 0,
        highestSeverity: "high",
        overallImpactLevel: "high",
        generatedAt: daysAgo(1),
      },
      {
        id: "impact_manual_sg_opened",
        workspaceId,
        changeEventId: "change_manual_sg_opened",
        summaryTitle: "Manual production drift introduced network exposure",
        summaryText: "A production security group was changed outside the deployment pipeline and now allows public SSH ingress.",
        environmentId: "env_production",
        resourceCreatedCount: 0,
        resourceUpdatedCount: 1,
        resourceDeletedCount: 0,
        costDeltaDaily: "0.00",
        costDeltaMonthlyProjected: "0.00",
        currency: "USD",
        newSecurityFindingsCount: 1,
        resolvedSecurityFindingsCount: 0,
        highestSeverity: "high",
        overallImpactLevel: "high",
        generatedAt: daysAgo(3),
      },
      {
        id: "impact_cleanup_unused_compute",
        workspaceId,
        changeEventId: "change_cleanup_unused_compute",
        summaryTitle: "Cleanup reduced projected monthly compute cost",
        summaryText: "Terraform removed an unused staging worker instance, reducing projected monthly cost without introducing new findings.",
        environmentId: "env_staging",
        resourceCreatedCount: 0,
        resourceUpdatedCount: 0,
        resourceDeletedCount: 1,
        costDeltaDaily: "-6.00",
        costDeltaMonthlyProjected: "-180.00",
        currency: "USD",
        newSecurityFindingsCount: 0,
        resolvedSecurityFindingsCount: 0,
        highestSeverity: null,
        overallImpactLevel: "positive",
        generatedAt: daysAgo(8),
      },
    ],
  });

  await prisma.aIInsight.createMany({
    data: [
      {
        id: "insight_checkout_deploy_cost_spike",
        workspaceId,
        changeEventId: "change_checkout_deploy_cost_spike",
        impactSummaryId: "impact_checkout_deploy_cost_spike",
        subjectType: "impact_summary",
        subjectId: "impact_checkout_deploy_cost_spike",
        insightType: "plain_english_summary",
        title: "Checkout deployment impact explanation",
        content: "The latest production deployment likely increased spend because it added persistent database capacity and managed network egress. Review the public PostgreSQL ingress before treating the change as healthy.",
        modelName: "seeded-demo-insight",
        inputFingerprint: "seed-checkout-impact-v1",
        generatedAt: daysAgo(1),
      },
      {
        id: "insight_manual_sg_opened",
        workspaceId,
        changeEventId: "change_manual_sg_opened",
        impactSummaryId: "impact_manual_sg_opened",
        subjectType: "impact_summary",
        subjectId: "impact_manual_sg_opened",
        insightType: "risk_explanation",
        title: "Manual drift explanation",
        content: "This change should be reviewed because it happened outside the normal deployment path and opened administrative network access in production.",
        modelName: "seeded-demo-insight",
        inputFingerprint: "seed-manual-drift-v1",
        generatedAt: daysAgo(3),
      },
    ],
  });

  await prisma.auditEvent.create({
    data: {
      id: "audit_demo_data_loaded",
      workspaceId,
      actorUserId: userId,
      actorType: "system",
      action: "demo_data_loaded",
      targetType: "workspace",
      targetId: workspaceId,
      happenedAt: anchor,
      metadata: { seedVersion: "milestone-1" },
    },
  });
}

seed()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seeded CloudFlux demo data.");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
