import { IsString, IsOptional } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  otherUserId: string; // The other participant's userId (trainer or client)
}

export class SendMessageDto {
  @IsString()
  conversationId: string;

  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  messageType?: string; // text, image, video, file
}

export class MarkAsReadDto {
  @IsString()
  conversationId: string;
}
