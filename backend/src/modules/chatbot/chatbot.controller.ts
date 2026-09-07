import { Body, Controller, Post } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ChatDto } from './dto/chat.dto';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  /**
   * POST /chatbot/consult
   * Body: { messages: [{role, content}], patientContext? }
   * Returns the AI Doctor's reply plus recommended real doctors to book.
   */
  @Post('consult')
  consult(@Body() dto: ChatDto) {
    return this.chatbotService.consult(dto);
  }
}
