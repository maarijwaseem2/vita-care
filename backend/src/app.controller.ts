import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  /** Simple liveness/health endpoint: GET /api/health */
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'vita-care-api',
      timestamp: new Date().toISOString(),
    };
  }
}
