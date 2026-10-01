import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ChatbotService } from './chatbot.service';
import { ChatDto, ReportDto } from './dto/chat.dto';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { AiClient } from './ai-client';

@Controller('chatbot')
export class ChatbotController {
  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly ai: AiClient,
  ) {}

  /** Whether the AI is live (the UI shows "Offline mode" if not). Provider and model stay private. */
  @Get('status')
  status() {
    return { aiEnabled: this.ai.configured };
  }

  /**
   * POST /chatbot/consult
   * Body: { messages, language?, sessionToken? }
   * Works for guests; a signed-in patient's medical record is used as context.
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(200)
  @Post('consult')
  consult(@Body() dto: ChatDto, @Req() req: { user?: AuthUser | null }) {
    return this.chatbotService.consult(dto, req.user);
  }

  /** POST /chatbot/report — explain a photo of a lab report or prescription. */
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @HttpCode(200)
  @Post('report')
  report(@Body() dto: ReportDto, @Req() req: { user?: AuthUser | null }) {
    return this.chatbotService.explainReport(dto, req.user);
  }

  /** GET /chatbot/sessions/:token — the saved summary, for the booking page. */
  @UseGuards(OptionalJwtAuthGuard)
  @Get('sessions/:token')
  session(@Param('token', new ParseUUIDPipe()) token: string, @Req() req: { user?: AuthUser | null }) {
    return this.chatbotService.getSessionByToken(token, req.user);
  }
}
