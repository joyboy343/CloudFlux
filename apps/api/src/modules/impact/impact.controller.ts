import { Controller, Get, Inject, Param } from "@nestjs/common";
import type { ImpactDetailResponse } from "@cloudflux/contracts";

import { ImpactService } from "./impact.service";

@Controller("changes")
export class ImpactController {
  constructor(@Inject(ImpactService) private readonly impactService: ImpactService) {}

  @Get(":changeEventId")
  getImpactDetail(@Param("changeEventId") changeEventId: string): Promise<ImpactDetailResponse> {
    return this.impactService.getImpactDetail(changeEventId);
  }
}
