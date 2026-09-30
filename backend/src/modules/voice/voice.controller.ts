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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { VoiceService } from './voice.service';
import type { ChatLanguage } from '../chatbot/language';

class SpeakDto {
  @IsString() @MinLength(1) @MaxLength(1500) text: string;
  @IsOptional() @IsIn(['en', 'ur', 'roman-ur']) language?: ChatLanguage;
}

const AUDIO = /^audio\/(webm|ogg|mp4|mpeg|mp3|wav|x-wav|m4a|x-m4a|aac)/;

@Controller('voice')
export class VoiceController {
  constructor(private readonly voice: VoiceService) {}

  @Get('status')
  status() {
    return this.voice.status();
  }

  /** POST /voice/transcribe (multipart: audio, language) → { text } */
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
  transcribe(@UploadedFile() file: Express.Multer.File, @Body('language') language?: string) {
    const lang: ChatLanguage = language === 'en' || language === 'roman-ur' ? language : 'ur';
    return this.voice.transcribe(file, lang);
  }

  /** POST /voice/speak { text, language } → audio/mpeg */
  @Post('speak')
  @HttpCode(200)
  @Header('Content-Type', 'audio/mpeg')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async speak(@Body() dto: SpeakDto) {
    const audio = await this.voice.speak(dto.text, dto.language ?? 'en');
    return new StreamableFile(audio);
  }
}
