import { Controller, Get, Inject, Param, Query } from "@nestjs/common";
import type { EnvironmentFilter, SecurityFindingDetailResponse, SecurityFindingsResponse } from "@cloudflux/contracts";

import { SecurityService } from "./security.service";

@Controller("security")
export class SecurityController {
  constructor(@Inject(SecurityService) private readonly securityService: SecurityService) {}

  @Get("findings")
  getFindings(
    @Query("environment") environment?: string,
    @Query("severity") severity?: string,
    @Query("status") status?: string,
    @Query("category") category?: string,
    @Query("resourceId") resourceId?: string,
  ): Promise<SecurityFindingsResponse> {
    return this.securityService.getFindings({
      environment: normalizeEnvironment(environment),
      severity: severity || "all",
      status: status || "all",
      category: category || "all",
      resourceId: resourceId || "all",
    });
  }

  @Get("findings/:findingId")
  getFindingDetail(@Param("findingId") findingId: string): Promise<SecurityFindingDetailResponse> {
    return this.securityService.getFindingDetail(findingId);
  }
}

function normalizeEnvironment(value?: string): EnvironmentFilter {
  if (value === "development" || value === "staging" || value === "production") return value;
  return "all";
}
