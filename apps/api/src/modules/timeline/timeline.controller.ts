import { Controller, Get, Inject, Query } from "@nestjs/common";
import type {
  EnvironmentFilter,
  OverviewRangeDays,
  TimelineResponse,
} from "@cloudflux/contracts";

import { TimelineService } from "./timeline.service";

@Controller("timeline")
export class TimelineController {
  constructor(@Inject(TimelineService) private readonly timelineService: TimelineService) {}

  @Get()
  getTimeline(
    @Query("environment") environment?: string,
    @Query("rangeDays") rangeDays?: string,
    @Query("eventType") eventType?: string,
    @Query("source") source?: string,
    @Query("impactLevel") impactLevel?: string,
    @Query("hasSecurityFindings") hasSecurityFindings?: string,
    @Query("hasCostImpact") hasCostImpact?: string,
    @Query("manualOnly") manualOnly?: string,
  ): Promise<TimelineResponse> {
    return this.timelineService.getTimeline({
      environment: normalizeEnvironment(environment),
      rangeDays: normalizeRangeDays(rangeDays),
      eventType: eventType || "all",
      source: source || "all",
      impactLevel: impactLevel || "all",
      hasSecurityFindings: normalizeBoolean(hasSecurityFindings),
      hasCostImpact: normalizeBoolean(hasCostImpact),
      manualOnly: manualOnly === "true",
    });
  }
}

function normalizeEnvironment(value?: string): EnvironmentFilter {
  if (value === "development" || value === "staging" || value === "production") {
    return value;
  }

  return "all";
}

function normalizeRangeDays(value?: string): OverviewRangeDays {
  if (value === "7") return 7;
  if (value === "90") return 90;
  return 30;
}

function normalizeBoolean(value?: string): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}
