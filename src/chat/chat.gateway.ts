import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private jwtService: JwtService,
    private chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) {
        console.log('No token provided, disconnecting client');
        return client.disconnect();
      }

      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.sub || payload.userId;
      client.data.userId = userId;

      // Join a private room for this user (useful for notifications)
      client.join(`user_${userId}`);
      console.log(`Client connected: ${userId}`);
    } catch (e) {
      console.log('Invalid token, disconnecting client:', e.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.data.userId}`);
  }

  @SubscribeMessage('join_conversation')
  handleJoinRoom(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`conv_${data.conversationId}`);
    console.log(`User ${client.data.userId} joined conversation ${data.conversationId}`);
    return { success: true };
  }

  @SubscribeMessage('leave_conversation')
  handleLeaveRoom(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`conv_${data.conversationId}`);
    console.log(`User ${client.data.userId} left conversation ${data.conversationId}`);
    return { success: true };
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; content: string; tempId?: string },
  ) {
    const userId = client.data.userId;

    try {
      // 1. Save to DB via Service
      const message = await this.chatService.sendMessage(userId, {
        conversationId: data.conversationId,
        text: data.content,
      });

      // 2. Broadcast to the room (including the sender for confirmation)
      this.server.to(`conv_${data.conversationId}`).emit('new_message', {
        ...message,
        content: message.text, // Map text to content for frontend consistency
        tempId: data.tempId, // Send back tempId so sender can replace "sending..." state
      });

      return { success: true, messageId: message.id };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    // Broadcast to others in the room (not the sender)
    client.to(`conv_${data.conversationId}`).emit('user_typing', {
      userId: client.data.userId,
      isTyping: data.isTyping,
    });
    return { success: true };
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId;

    try {
      await this.chatService.markAsRead(data.conversationId, userId);

      // Notify others that messages were read
      client.to(`conv_${data.conversationId}`).emit('messages_read', {
        conversationId: data.conversationId,
        readBy: userId,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Server-side method to send notification to a specific user
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user_${userId}`).emit(event, data);
  }

  // Notify user of new message (for push notification integration)
  notifyNewMessage(userId: string, message: any) {
    this.sendToUser(userId, 'notification', {
      type: 'new_message',
      ...message,
    });
  }
}
