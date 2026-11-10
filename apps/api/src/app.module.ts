import { Module } from "@nestjs/common";

import { PrismaModule } from "./common/prisma/prisma.module";
import { HealthModule } from "./modules/health/health.module";
import { ImpactModule } from "./modules/impact/impact.module";
import { OverviewModule } from "./modules/overview/overview.module";
import { ResourcesModule } from "./modules/resources/resources.module";
import { SecurityModule } from "./modules/security/security.module";
import { TimelineModule } from "./modules/timeline/timeline.module";
import { WorkspacesModule } from "./modules/workspaces/workspaces.module";

@Module({
  imports: [PrismaModule, HealthModule, WorkspacesModule, OverviewModule, TimelineModule, ImpactModule, ResourcesModule, SecurityModule],
})
export class AppModule {}
