import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RetentionService } from '../retention/retention.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RetentionCron {
  private readonly logger = new Logger(RetentionCron.name);

  constructor(
    private retentionService: RetentionService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Daily check at 9 AM - Send reminders to inactive clients and alert their trainers
   */
  @Cron('0 9 * * *') // Every day at 9:00 AM
  async dailyInactivityCheck() {
    this.logger.log('Running daily inactivity check...');

    try {
      // Get clients inactive for 3+ days
      const inactiveClients = await this.retentionService.getInactiveClients(3);

      this.logger.log(`Found ${inactiveClients.length} inactive clients`);

      for (const client of inactiveClients) {
        // Send motivational reminder to client
        await this.notificationsService.sendNotification(
          client.id,
          '🔥 Time to Train!',
          "You haven't logged a workout in a few days. Let's get back on track!",
          'inactivity_reminder',
        );

        // Alert each of the client's trainers
        const trainers =
          client.clientProfile?.trainerRelationships?.map(
            (rel) => rel.trainer,
          ) || [];

        for (const trainer of trainers) {
          if (trainer?.userId) {
            await this.notificationsService.sendNotification(
              trainer.userId,
              '⚠️ Client Inactive',
              `${client.fullName || client.email} hasn't trained in 3+ days`,
              'client_inactive',
              client.id,
            );
          }
        }
      }

      this.logger.log('Daily inactivity check completed');
    } catch (error) {
      this.logger.error('Error in daily inactivity check:', error);
    }
  }

  /**
   * Morning motivation at 7 AM - Send workout reminder to active users
   */
  @Cron('0 7 * * *') // Every day at 7:00 AM
  async morningMotivation() {
    this.logger.log('Running morning motivation...');

    try {
      // Get users who need a gentle reminder (2 days inactive)
      const usersNeedingReminder =
        await this.retentionService.getUsersNeedingReminder();

      this.logger.log(
        `Sending reminders to ${usersNeedingReminder.length} users`,
      );

      for (const user of usersNeedingReminder) {
        const messages = [
          "Let's keep that streak going! 💪",
          "Your muscles are waiting for you! 🏋️",
          "One workout can change your whole day! ⚡",
          "Progress happens one day at a time! 📈",
        ];
        const randomMessage =
          messages[Math.floor(Math.random() * messages.length)];

        await this.notificationsService.sendNotification(
          user.id,
          '🌅 Good Morning!',
          randomMessage,
          'morning_motivation',
        );
      }

      this.logger.log('Morning motivation completed');
    } catch (error) {
      this.logger.error('Error in morning motivation:', error);
    }
  }

  /**
   * Weekly streak summary on Sunday at 6 PM
   */
  @Cron('0 18 * * 0') // Every Sunday at 6:00 PM
  async weeklyStreakSummary() {
    this.logger.log('Running weekly streak summary...');

    try {
      // Get top streakers for the week
      const leaderboard = await this.retentionService.getStreakLeaderboard(5);

      // You could send a newsletter or in-app notification here
      this.logger.log(
        `Top streakers: ${leaderboard.map((u) => `${u.fullName}: ${u.currentStreak}`).join(', ')}`,
      );

      this.logger.log('Weekly streak summary completed');
    } catch (error) {
      this.logger.error('Error in weekly streak summary:', error);
    }
  }

  /**
   * Reset broken streaks at midnight
   * If someone hasn't worked out for 2+ days, their streak is broken
   */
  @Cron('0 0 * * *') // Every day at midnight
  async resetBrokenStreaks() {
    this.logger.log('Checking for broken streaks...');

    try {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      // Find users whose streak should be reset
      const usersWithBrokenStreaks = await this.retentionService[
        'prisma'
      ].user.findMany({
        where: {
          currentStreak: { gt: 0 },
          lastWorkoutAt: { lt: twoDaysAgo },
        },
        select: { id: true, fullName: true, currentStreak: true },
      });

      this.logger.log(
        `Found ${usersWithBrokenStreaks.length} users with broken streaks`,
      );

      // Reset their streaks
      if (usersWithBrokenStreaks.length > 0) {
        await this.retentionService['prisma'].user.updateMany({
          where: {
            id: { in: usersWithBrokenStreaks.map((u) => u.id) },
          },
          data: { currentStreak: 0 },
        });

        // Optionally notify users their streak was broken
        for (const user of usersWithBrokenStreaks) {
          await this.notificationsService.sendNotification(
            user.id,
            '😢 Streak Lost',
            `Your ${user.currentStreak}-day streak has ended. Start a new one today!`,
            'streak_lost',
          );
        }
      }

      this.logger.log('Broken streaks check completed');
    } catch (error) {
      this.logger.error('Error resetting broken streaks:', error);
    }
  }
}
