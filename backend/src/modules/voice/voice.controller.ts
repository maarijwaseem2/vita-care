import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { VoiceService } from './voice.service';
import { UsageService } from '../chatbot/usage.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { VerifiedEmailGuard } from '../../common/guards/verified-email.guard';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import type { ChatLanguage } from '../chatbot/language';

class SpeakDto {
  @IsString() @MinLength(1) @MaxLength(1500) text: string;
  @IsOptional() @IsIn(['en', 'ur', 'roman-ur']) language?: ChatLanguage;
}

const AUDIO = /^audio\/(webm|ogg|mp4|mpeg|mp3|wav|x-wav|m4a|x-m4a|aac)/;

@Controller('voice')
export class VoiceController {
  constructor(
    private readonly voice: VoiceService,
    private readonly usage: UsageService,
  ) {}

  @Get('status')
  status() {
    return this.voice.status();
  }

  /** POST /voice/transcribe (multipart: audio, language) → { text }. Signed-in users only. */
  @UseGuards(JwtAuthGuard, VerifiedEmailGuard)
  @Post('transcribe')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('audio', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        AUDIO.test(file.mimetype) ? cb(null, true) : cb(new BadRequestException('Unsupported audio format'), false),
    }),
  )
  async transcribe(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user: AuthUser },
    @Body('language') language?: string,
  ) {
    const lang: ChatLanguage = language === 'en' || language === 'roman-ur' ? language : 'ur';
    await this.usage.consume(req.user, 'voice');
    return this.voice.transcribe(file, lang);
  }

  /** POST /voice/speak { text, language } → audio/mpeg. Signed-in users only. */
  @UseGuards(JwtAuthGuard, VerifiedEmailGuard)
  @Post('speak')
  @HttpCode(200)
  @Header('Content-Type', 'audio/mpeg')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async speak(@Body() dto: SpeakDto, @Req() req: { user: AuthUser }) {
    await this.usage.consume(req.user, 'voice');
    const audio = await this.voice.speak(dto.text, dto.language ?? 'en');
    return new StreamableFile(audio);
  }
}
