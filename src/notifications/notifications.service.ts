import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Expo, { ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo();

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  // Register device token
  async registerDeviceToken(userId: string, token: string, platform: string) {
    // Validate the push token
    if (!Expo.isExpoPushToken(token)) {
      console.warn(`Invalid Expo push token: ${token}`);
      // Still save it but log warning
    }

    return this.prisma.deviceToken.upsert({
      where: { token },
      update: { userId, platform },
      create: { userId, token, platform },
    });
  }

  // Remove device token (on logout)
  async removeDeviceToken(token: string) {
    return this.prisma.deviceToken.deleteMany({
      where: { token },
    });
  }

  // Send notification to user
  async sendNotification(
    userId: string,
    title: string,
    body: string,
    type: string,
    relatedId?: string,
  ) {
    // 1. Save to DB
    const notification = await this.prisma.notification.create({
      data: { userId, title, body, type, relatedId },
    });

    // 2. Get user's device tokens
    const deviceTokens = await this.prisma.deviceToken.findMany({
      where: { userId },
    });

    if (deviceTokens.length === 0) return notification;

    // 3. Build push messages
    const messages: ExpoPushMessage[] = [];

    for (const device of deviceTokens) {
      if (!Expo.isExpoPushToken(device.token)) {
        console.warn(`Invalid token: ${device.token}`);
        continue;
      }

      messages.push({
        to: device.token,
        sound: 'default',
        title,
        body,
        data: { type, relatedId, notificationId: notification.id },
      });
    }

    // 4. Send push notifications in chunks
    const chunks = expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log('Push notification tickets:', ticketChunk);
      } catch (error) {
        console.error('Push notification error:', error);
      }
    }

    return notification;
  }

  // Get user's notifications
  async getNotifications(userId: string, limit = 20, offset = 0) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  // Get unread count
  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, read: false },
    });
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  }

  // Mark all as read
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  // =============================================
  // NOTIFICATION TRIGGERS
  // =============================================

  // Trigger: Pain flag reported
  async notifyPainFlag(
    clientId: string,
    trainerId: string,
    clientName: string,
    painDetails?: string,
  ) {
    const body = painDetails
      ? `${clientName}: ${painDetails}`
      : `${clientName} flagged pain during workout`;

    return this.sendNotification(
      trainerId,
      '⚠️ Client Flagged Pain',
      body,
      'pain_flag',
      clientId,
    );
  }

  // Trigger: Workout completed
  async notifyWorkoutComplete(
    clientId: string,
    trainerId: string,
    clientName: string,
    workoutName: string,
  ) {
    return this.sendNotification(
      trainerId,
      '✅ Workout Completed',
      `${clientName} finished: ${workoutName}`,
      'workout_complete',
      clientId,
    );
  }

  // Trigger: New message received
  async notifyNewMessage(
    receiverId: string,
    senderName: string,
    messagePreview?: string,
  ) {
    const body = messagePreview
      ? `${senderName}: ${messagePreview.substring(0, 50)}...`
      : `${senderName} sent you a message`;

    return this.sendNotification(
      receiverId,
      '💬 New Message',
      body,
      'message',
    );
  }

  // Trigger: Plan updated/assigned
  async notifyPlanUpdate(clientId: string, planName: string, action: 'assigned' | 'updated' = 'updated') {
    const title = action === 'assigned' ? '📋 New Plan Assigned' : '📋 Plan Updated';
    const body = action === 'assigned'
      ? `Your coach assigned you: ${planName}`
      : `Your coach updated: ${planName}`;

    return this.sendNotification(clientId, title, body, 'plan_update');
  }

  // Trigger: Workout reminder
  async notifyWorkoutReminder(userId: string, workoutName: string) {
    return this.sendNotification(
      userId,
      '🏋️ Workout Reminder',
      `Time for your workout: ${workoutName}`,
      'workout_reminder',
    );
  }
}
