import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ChatMessageDto {
  @IsIn(['user', 'assistant'], {
    message: 'Message role must be "user" or "assistant"',
  })
  role: 'user' | 'assistant';

  @IsString()
  @MinLength(1)
  @MaxLength(2000, { message: 'Each message can be at most 2000 characters' })
  content: string;
}

export class ChatDto {
  // The running conversation. The newest message is the patient's latest turn.
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one message is required' })
  @ArrayMaxSize(40, { message: 'This conversation is too long. Please start a new one.' })
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  /** Preferred reply language. Omitted = detect from the patient's text. */
  @IsOptional()
  @IsIn(['en', 'ur', 'roman-ur'])
  language?: 'en' | 'ur' | 'roman-ur';

  /** Token of an ongoing session, returned by the previous consult call. */
  @IsOptional()
  @IsUUID()
  sessionToken?: string;

  /** Kept for backwards compatibility; ignored (context now comes from the DB). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  patientContext?: string;
}

export class ReportDto {
  /** Base64 image data, without the "data:...;base64," prefix. ~4 MB max. */
  @IsString()
  @MinLength(100)
  @MaxLength(5_600_000, { message: 'Image is too large. Please upload a photo under 4 MB.' })
  @Matches(/^[A-Za-z0-9+/=\s]+$/, { message: 'Image must be base64 encoded' })
  imageBase64: string;

  @IsIn(['image/jpeg', 'image/png', 'image/webp'], {
    message: 'Please upload a JPG, PNG or WEBP photo of the report',
  })
  mimeType: string;

  @IsOptional()
  @IsIn(['en', 'ur', 'roman-ur'])
  language?: 'en' | 'ur' | 'roman-ur';
}
