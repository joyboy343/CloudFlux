import { Module } from "@nestjs/common";

import { HealthModule } from "./modules/health/health.module";
import { WorkspacesModule } from "./modules/workspaces/workspaces.module";

@Module({
  imports: [HealthModule, WorkspacesModule],
})
export class AppModule {}
