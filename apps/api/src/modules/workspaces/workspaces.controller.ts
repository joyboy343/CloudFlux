import { Controller, Get, Inject } from "@nestjs/common";
import type { WorkspaceContextResponse } from "@cloudflux/contracts";

import { WorkspacesService } from "./workspaces.service";

@Controller("workspaces")
export class WorkspacesController {
  constructor(
    @Inject(WorkspacesService)
    private readonly workspacesService: WorkspacesService,
  ) {}

  @Get("current")
  getCurrentWorkspace(): Promise<WorkspaceContextResponse> {
    return this.workspacesService.getCurrentWorkspace();
  }
}
