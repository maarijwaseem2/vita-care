import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
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
  content: string;
}

export class ChatDto {
  // The running conversation. The newest message is the patient's latest turn.
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one message is required' })
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  // Optional free-text context (age, known conditions) to improve the answer.
  @IsOptional()
  @IsString()
  patientContext?: string;
}
