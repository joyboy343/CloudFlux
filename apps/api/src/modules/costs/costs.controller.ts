import { Controller, Get, Inject, Query } from "@nestjs/common";
import type { EnvironmentFilter, OverviewRangeDays, CostResponse } from "@cloudflux/contracts";

import { CostsService } from "./costs.service";

@Controller("costs")
export class CostsController {
  constructor(@Inject(CostsService) private readonly costsService: CostsService) {}

  @Get("summary")
  getSummary(@Query("environment") environment?: string, @Query("rangeDays") rangeDays?: string): Promise<CostResponse> {
    return this.costsService.getSummary(normalizeEnvironment(environment), normalizeRangeDays(rangeDays));
  }
}

function normalizeEnvironment(value?: string): EnvironmentFilter {
  if (value === "development" || value === "staging" || value === "production") return value;
  return "all";
}

function normalizeRangeDays(value?: string): OverviewRangeDays {
  if (value === "7") return 7;
  if (value === "90") return 90;
  return 30;
}
