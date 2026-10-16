import { Controller, Get, Inject, Query } from "@nestjs/common";
import type { EnvironmentFilter, OverviewRangeDays, OverviewResponse } from "@cloudflux/contracts";

import { OverviewService } from "./overview.service";

@Controller("overview")
export class OverviewController {
  constructor(@Inject(OverviewService) private readonly overviewService: OverviewService) {}

  @Get()
  getOverview(
    @Query("environment") environment?: string,
    @Query("rangeDays") rangeDays?: string,
  ): Promise<OverviewResponse> {
    return this.overviewService.getOverview(
      normalizeEnvironment(environment),
      normalizeRangeDays(rangeDays),
    );
  }
}

function normalizeEnvironment(value?: string): EnvironmentFilter {
  if (value === "development" || value === "staging" || value === "production") {
    return value;
  }

  return "all";
}

function normalizeRangeDays(value?: string): OverviewRangeDays {
  if (value === "7") {
    return 7;
  }

  if (value === "90") {
    return 90;
  }

  return 30;
}
