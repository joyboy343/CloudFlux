import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  CloudProvider,
  EnvironmentCriticality,
  MvpEnvironmentName,
  WorkspaceContextResponse,
  WorkspaceRole,
} from "@cloudflux/contracts";

import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentWorkspace(): Promise<WorkspaceContextResponse> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { slug: "acme-cloud-demo" },
      include: {
        memberships: {
          include: { user: true },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
        cloudAccounts: {
          orderBy: { createdAt: "asc" },
          take: 1,
        },
        environments: {
          orderBy: { name: "asc" },
        },
      },
    });

    const membership = workspace?.memberships[0];
    const cloudAccount = workspace?.cloudAccounts[0];

    if (!workspace || !membership || !cloudAccount) {
      throw new NotFoundException("Demo workspace has not been seeded yet.");
    }

    return {
      user: {
        id: membership.user.id,
        email: membership.user.email,
        displayName: membership.user.displayName,
        role: membership.role as WorkspaceRole,
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        status: "active",
      },
      cloudAccount: {
        id: cloudAccount.id,
        name: cloudAccount.accountName,
        provider: cloudAccount.provider as CloudProvider,
        mode: cloudAccount.mode as "demo" | "connected",
        connectionStatus: cloudAccount.connectionStatus as
          | "demo"
          | "pending"
          | "active"
          | "error"
          | "disabled",
      },
      environments: workspace.environments.map((environment) => ({
        id: environment.id,
        name: environment.name as MvpEnvironmentName,
        displayName: toDisplayName(environment.name),
        criticality: environment.criticality as EnvironmentCriticality,
      })),
      defaults: {
        environment: "all",
        rangeDays: 30,
        currency: "USD",
      },
      demoMode: {
        enabled: true,
        label: "Demo workspace",
        dataSource: "Simulated AWS data",
        observeOnly: true,
      },
    };
  }
}

function toDisplayName(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
