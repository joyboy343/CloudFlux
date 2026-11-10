import { Controller, Get, Inject, Param, Query } from "@nestjs/common";
import type {
  EnvironmentFilter,
  ResourceDetailResponse,
  ResourceInventoryResponse,
} from "@cloudflux/contracts";

import { ResourcesService } from "./resources.service";

@Controller("resources")
export class ResourcesController {
  constructor(@Inject(ResourcesService) private readonly resourcesService: ResourcesService) {}

  @Get()
  getResources(
    @Query("environment") environment?: string,
    @Query("service") service?: string,
    @Query("resourceType") resourceType?: string,
    @Query("region") region?: string,
    @Query("status") status?: string,
    @Query("owner") owner?: string,
    @Query("hasFindings") hasFindings?: string,
    @Query("changedRecently") changedRecently?: string,
    @Query("minMonthlyCost") minMonthlyCost?: string,
  ): Promise<ResourceInventoryResponse> {
    return this.resourcesService.getResources({
      environment: normalizeEnvironment(environment),
      service: service || "all",
      resourceType: resourceType || "all",
      region: region || "all",
      status: status || "all",
      owner: owner || "all",
      hasFindings: normalizeBoolean(hasFindings),
      changedRecently: normalizeBoolean(changedRecently),
      minMonthlyCost: normalizeNumber(minMonthlyCost),
    });
  }

  @Get(":resourceId")
  getResourceDetail(@Param("resourceId") resourceId: string): Promise<ResourceDetailResponse> {
    return this.resourcesService.getResourceDetail(resourceId);
  }
}

function normalizeEnvironment(value?: string): EnvironmentFilter {
  if (value === "development" || value === "staging" || value === "production") return value;
  return "all";
}

function normalizeBoolean(value?: string): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function normalizeNumber(value?: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
