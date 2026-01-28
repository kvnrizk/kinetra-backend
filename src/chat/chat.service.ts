import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/chat.dto';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get or create a conversation between two users
   */
  async getOrCreateConversation(currentUserId: string, otherUserId: string) {
    // Check if a conversation already exists between these users
    const existingConversation = await this.prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: currentUserId } } },
          { participants: { some: { userId: otherUserId } } },
        ],
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (existingConversation) {
      return this.formatConversation(existingConversation, currentUserId);
    }

    // Verify the other user exists
    const otherUser = await this.prisma.user.findUnique({
      where: { id: otherUserId },
    });

    if (!otherUser) {
      throw new NotFoundException('User not found');
    }

    // Determine roles based on user profiles
    const currentUserData = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: { role: true },
    });

    const currentRole = currentUserData?.role === 'TRAINER' || currentUserData?.role === 'BOTH'
      ? 'trainer'
      : 'client';
    const otherRole = otherUser.role === 'TRAINER' || otherUser.role === 'BOTH'
      ? 'trainer'
      : 'client';

    // Get trainer-client relationship if it exists
    let trainerClientId: string | null = null;

    const trainerProfile = await this.prisma.trainerProfile.findUnique({
      where: { userId: currentRole === 'trainer' ? currentUserId : otherUserId },
    });

    const clientProfile = await this.prisma.clientProfile.findUnique({
      where: { userId: currentRole === 'client' ? currentUserId : otherUserId },
    });

    if (trainerProfile && clientProfile) {
      const relationship = await this.prisma.trainerClientRelationship.findFirst({
        where: {
          trainerId: trainerProfile.id,
          clientId: clientProfile.id,
        },
      });
      trainerClientId = relationship?.id || null;
    }

    // Create new conversation with participants
    const newConversation = await this.prisma.conversation.create({
      data: {
        trainerClientId,
        participants: {
          create: [
            { userId: currentUserId, role: currentRole },
            { userId: otherUserId, role: otherRole },
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return this.formatConversation(newConversation, currentUserId);
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return conversations.map((conv) => this.formatConversation(conv, userId));
  }

  /**
   * Get a single conversation by ID
   */
  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Verify user is a participant
    const isParticipant = conversation.participants.some(
      (p) => p.userId === userId
    );
    if (!isParticipant) {
      throw new ForbiddenException('Not a participant in this conversation');
    }

    return this.formatConversation(conversation, userId);
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(senderUserId: string, dto: SendMessageDto) {
    // Verify sender is a participant
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: dto.conversationId },
      include: {
        participants: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      (p) => p.userId === senderUserId
    );
    if (!isParticipant) {
      throw new ForbiddenException('Not a participant in this conversation');
    }

    // Create the message (store as ciphertext - in production, encrypt this)
    const message = await this.prisma.message.create({
      data: {
        conversationId: dto.conversationId,
        senderId: senderUserId,
        ciphertext: dto.text, // In production, encrypt this
        messageType: dto.messageType || 'text',
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Update conversation timestamp
    await this.prisma.conversation.update({
      where: { id: dto.conversationId },
      data: { updatedAt: new Date() },
    });

    return {
      id: message.id,
      conversationId: message.conversationId,
      senderUserId: message.senderId,
      senderName: message.sender.fullName,
      senderAvatar: message.sender.avatarUrl,
      text: message.ciphertext, // In production, decrypt this
      messageType: message.messageType,
      createdAt: message.createdAt,
      isRead: false,
    };
  }

  /**
   * Get messages in a conversation
   */
  async getMessages(conversationId: string, userId: string, limit = 50, offset = 0) {
    // Verify user is a participant
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      (p) => p.userId === userId
    );
    if (!isParticipant) {
      throw new ForbiddenException('Not a participant in this conversation');
    }

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' }, // Descending for inverted FlatList
      take: limit,
      skip: offset,
    });

    return messages.map((msg) => ({
      id: msg.id,
      conversationId: msg.conversationId,
      senderUserId: msg.senderId,
      senderName: msg.sender.fullName,
      senderAvatar: msg.sender.avatarUrl,
      text: msg.ciphertext, // In production, decrypt this
      messageType: msg.messageType,
      createdAt: msg.createdAt,
      isRead: !!msg.readAt,
    }));
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string, userId: string) {
    // Update all unread messages from other users as read
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return { success: true };
  }

  /**
   * Get unread message count for a user
   */
  async getUnreadCount(userId: string) {
    // Get all conversation IDs where user is a participant
    const participations = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true },
    });

    const conversationIds = participations.map((p) => p.conversationId);

    // Count unread messages in those conversations from other users
    const unreadCount = await this.prisma.message.count({
      where: {
        conversationId: { in: conversationIds },
        senderId: { not: userId },
        readAt: null,
      },
    });

    return unreadCount;
  }

  /**
   * Helper: Format conversation response
   */
  private formatConversation(conversation: any, currentUserId: string) {
    const otherParticipant = conversation.participants.find(
      (p: any) => p.userId !== currentUserId
    );

    const lastMessage = conversation.messages?.[0];

    return {
      id: conversation.id,
      otherUser: otherParticipant?.user || null,
      lastMessage: lastMessage
        ? {
            text: lastMessage.ciphertext,
            createdAt: lastMessage.createdAt,
            isRead: !!lastMessage.readAt,
          }
        : null,
      updatedAt: conversation.updatedAt,
      createdAt: conversation.createdAt,
    };
  }
}
