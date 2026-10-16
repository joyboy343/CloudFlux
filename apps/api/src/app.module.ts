import { Module } from "@nestjs/common";

import { PrismaModule } from "./common/prisma/prisma.module";
import { HealthModule } from "./modules/health/health.module";
import { OverviewModule } from "./modules/overview/overview.module";
import { WorkspacesModule } from "./modules/workspaces/workspaces.module";

@Module({
  imports: [PrismaModule, HealthModule, WorkspacesModule, OverviewModule],
})
export class AppModule {}
