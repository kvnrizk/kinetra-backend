import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../auth/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { CreateConversationDto, SendMessageDto, MarkAsReadDto } from './dto/chat.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  /**
   * Get or create a conversation with another user
   * POST /api/chat/conversations
   */
  @Post('conversations')
  async createConversation(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatService.getOrCreateConversation(user.userId, dto.otherUserId);
  }

  /**
   * Get all conversations for the current user
   * GET /api/chat/conversations
   */
  @Get('conversations')
  async getConversations(@CurrentUser() user: JwtUser) {
    return this.chatService.getUserConversations(user.userId);
  }

  /**
   * Get a single conversation
   * GET /api/chat/conversations/:id
   */
  @Get('conversations/:id')
  async getConversation(
    @Param('id') conversationId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.chatService.getConversation(conversationId, user.userId);
  }

  /**
   * Get messages in a conversation
   * GET /api/chat/conversations/:id/messages
   */
  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id') conversationId: string,
    @CurrentUser() user: JwtUser,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.chatService.getMessages(
      conversationId,
      user.userId,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  /**
   * Send a message (REST fallback - prefer WebSocket)
   * POST /api/chat/messages
   */
  @Post('messages')
  async sendMessage(
    @CurrentUser() user: JwtUser,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(user.userId, dto);
  }

  /**
   * Mark conversation messages as read
   * POST /api/chat/conversations/:id/read
   */
  @Post('conversations/:id/read')
  async markAsRead(
    @Param('id') conversationId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.chatService.markAsRead(conversationId, user.userId);
  }

  /**
   * Get total unread message count
   * GET /api/chat/unread-count
   */
  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: JwtUser) {
    const count = await this.chatService.getUnreadCount(user.userId);
    return { unreadCount: count };
  }
}
