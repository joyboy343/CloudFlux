import { Controller, Get } from "@nestjs/common";
import type { WorkspaceContextResponse } from "@cloudflux/contracts";

@Controller("workspaces")
export class WorkspacesController {
  @Get("current")
  getCurrentWorkspace(): WorkspaceContextResponse {
    return {
      user: {
        id: "user_demo_owner",
        email: "demo@cloudflux.local",
        displayName: "Demo Owner",
        role: "owner",
      },
      workspace: {
        id: "workspace_acme_demo",
        name: "Acme Cloud Demo",
        slug: "acme-cloud-demo",
        status: "active",
      },
      cloudAccount: {
        id: "cloud_account_acme_prod",
        name: "Acme Production AWS",
        provider: "aws",
        mode: "demo",
        connectionStatus: "demo",
      },
      environments: [
        {
          id: "env_development",
          name: "development",
          displayName: "Development",
          criticality: "low",
        },
        {
          id: "env_staging",
          name: "staging",
          displayName: "Staging",
          criticality: "medium",
        },
        {
          id: "env_production",
          name: "production",
          displayName: "Production",
          criticality: "high",
        },
      ],
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
