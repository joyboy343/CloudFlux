import { Controller, Get } from "@nestjs/common";
import type { HealthResponse } from "@cloudflux/contracts";

@Controller("health")
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return {
      status: "ok",
      service: "cloudflux-api",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
    };
  }
}
