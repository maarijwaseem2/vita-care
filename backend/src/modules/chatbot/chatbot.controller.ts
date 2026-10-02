import { Body, Controller, HttpException, HttpStatus, Get, HttpCode, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ChatbotService } from './chatbot.service';
import { ChatDto, ReportDto } from './dto/chat.dto';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { AiClient } from './ai-client';
import { UsageInfo, UsageService } from './usage.service';
import { detectRedFlags } from './safety';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { VerifiedEmailGuard } from '../../common/guards/verified-email.guard';

@Controller('chatbot')
export class ChatbotController {
  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly ai: AiClient,
    private readonly usage: UsageService,
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
  @UseGuards(JwtAuthGuard, VerifiedEmailGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(200)
  @Post('consult')
  async consult(@Body() dto: ChatDto, @Req() req: { user: AuthUser }) {
    // Signed-in users only, with a daily allowance (offline mode uses no tokens, so it is not counted).
    let usage: UsageInfo | null = null;
    try {
      usage = this.ai.configured ? await this.usage.consume(req.user, 'message') : null;
    } catch (err) {
      // Limit reached: an emergency must still get the emergency answer (rules only, no tokens).
      const said = dto.messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n');
      const isLimit = err instanceof HttpException && err.getStatus() === HttpStatus.TOO_MANY_REQUESTS;
      if (!isLimit || !detectRedFlags(said).some((f) => f.urgency === 'emergency')) throw err;
      const result = await this.chatbotService.consult(dto, req.user, { offline: true });
      const limit = this.usage.limitFor('message');
      return { ...result, usage: { kind: 'message', used: limit, limit, remaining: 0 }, limitReached: true };
    }
    const result = await this.chatbotService.consult(dto, req.user);
    return { ...result, usage };
  }

  /** GET /chatbot/usage — today's remaining AI allowance for the signed-in user. */
  @UseGuards(JwtAuthGuard)
  @Get('usage')
  usageToday(@Req() req: { user: AuthUser }) {
    return this.usage.today(req.user);
  }

  /** POST /chatbot/report — explain a photo of a lab report or prescription. */
  @UseGuards(JwtAuthGuard, VerifiedEmailGuard)
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @HttpCode(200)
  @Post('report')
  async report(@Body() dto: ReportDto, @Req() req: { user: AuthUser }) {
    const usage = this.ai.configured ? await this.usage.consume(req.user, 'report') : null;
    const result = await this.chatbotService.explainReport(dto, req.user);
    return { ...result, usage };
  }

  /** GET /chatbot/sessions/:token — the saved summary, for the booking page. */
  @UseGuards(OptionalJwtAuthGuard)
  @Get('sessions/:token')
  session(@Param('token', new ParseUUIDPipe()) token: string, @Req() req: { user?: AuthUser | null }) {
    return this.chatbotService.getSessionByToken(token, req.user);
  }
}
