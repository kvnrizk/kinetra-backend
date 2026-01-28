import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RetentionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Update user's workout streak when they complete a workout
   * Formula:
   * - If last workout was yesterday: streak += 1
   * - If last workout was today: streak stays same
   * - Otherwise: streak resets to 1
   */
  async updateStreak(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        lastWorkoutAt: true,
        currentStreak: true,
        longestStreak: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    let newStreak = 1;

    if (user.lastWorkoutAt) {
      const lastWorkout = new Date(user.lastWorkoutAt);
      lastWorkout.setHours(0, 0, 0, 0);

      const isYesterday = lastWorkout.getTime() === yesterday.getTime();
      const isToday = lastWorkout.getTime() === today.getTime();

      if (isYesterday) {
        newStreak = user.currentStreak + 1;
      } else if (isToday) {
        newStreak = user.currentStreak;
      }
      // Otherwise, streak resets to 1 (already set)
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        lastWorkoutAt: new Date(),
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, user.longestStreak),
      },
      select: {
        currentStreak: true,
        longestStreak: true,
        lastWorkoutAt: true,
      },
    });

    return {
      ...updatedUser,
      isNewStreak: newStreak > user.currentStreak,
      streakIncreased: newStreak > user.currentStreak,
    };
  }

  /**
   * Get user's current streak info
   */
  async getStreakInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        lastWorkoutAt: true,
        currentStreak: true,
        longestStreak: true,
      },
    });

    if (!user) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastWorkoutAt: null,
        isActive: false,
        daysSinceLastWorkout: null,
        daysUntilStreakLost: 0,
      };
    }

    let daysSinceLastWorkout: number | null = null;
    let isActive = false;
    let daysUntilStreakLost = 2; // Default 2 days until streak lost

    if (user.lastWorkoutAt) {
      const now = new Date();
      const lastWorkout = new Date(user.lastWorkoutAt);
      daysSinceLastWorkout = Math.floor(
        (now.getTime() - lastWorkout.getTime()) / (1000 * 60 * 60 * 24)
      );
      isActive = daysSinceLastWorkout <= 1; // Active if worked out today or yesterday
      daysUntilStreakLost = Math.max(0, 2 - daysSinceLastWorkout); // 2 days grace period
    }

    return {
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      lastWorkoutAt: user.lastWorkoutAt,
      isActive,
      daysSinceLastWorkout,
      daysUntilStreakLost,
    };
  }

  /**
   * Get clients who haven't trained for X days
   */
  async getInactiveClients(days = 3) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return this.prisma.user.findMany({
      where: {
        role: { in: ['CLIENT', 'BOTH'] },
        OR: [
          { lastWorkoutAt: null },
          { lastWorkoutAt: { lt: cutoff } },
        ],
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        lastWorkoutAt: true,
        currentStreak: true,
        clientProfile: {
          select: {
            trainerRelationships: {
              where: { status: 'ACTIVE' },
              select: {
                trainer: {
                  select: {
                    userId: true,
                    user: {
                      select: {
                        id: true,
                        fullName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get inactive clients for a specific trainer
   */
  async getInactiveClientsForTrainer(trainerId: string, days = 3) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    // Get trainer's active client relationships
    const relationships = await this.prisma.trainerClientRelationship.findMany({
      where: {
        trainer: { userId: trainerId },
        status: 'ACTIVE',
      },
      include: {
        client: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                lastWorkoutAt: true,
                currentStreak: true,
              },
            },
          },
        },
      },
    });

    // Filter to inactive clients
    const inactiveClients = relationships
      .map((rel) => {
        const daysSinceWorkout = rel.client.user.lastWorkoutAt
          ? Math.floor(
              (new Date().getTime() - new Date(rel.client.user.lastWorkoutAt).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null;
        return {
          id: rel.client.user.id,
          fullName: rel.client.user.fullName,
          email: rel.client.user.email,
          avatarUrl: null, // Can be added later
          lastWorkoutAt: rel.client.user.lastWorkoutAt,
          currentStreak: rel.client.user.currentStreak,
          daysSinceWorkout,
          relationshipId: rel.id,
        };
      })
      .filter((client) => {
        if (!client.lastWorkoutAt) return true;
        return new Date(client.lastWorkoutAt) < cutoff;
      });

    return inactiveClients;
  }

  /**
   * Check if a specific user is inactive
   */
  async checkUserInactivity(userId: string, days = 2) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { lastWorkoutAt: true },
    });

    if (!user || !user.lastWorkoutAt) {
      return { isInactive: true, daysSinceLastWorkout: null };
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const isInactive = new Date(user.lastWorkoutAt) < cutoff;
    const daysSinceLastWorkout = Math.floor(
      (new Date().getTime() - new Date(user.lastWorkoutAt).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    return { isInactive, daysSinceLastWorkout };
  }

  /**
   * Get all users who should receive a reminder
   * (haven't worked out in 2 days but have worked out before)
   */
  async getUsersNeedingReminder() {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    return this.prisma.user.findMany({
      where: {
        role: { in: ['CLIENT', 'BOTH'] },
        lastWorkoutAt: {
          lt: twoDaysAgo,
          gt: threeDaysAgo, // Only remind once (2-3 day window)
        },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        lastWorkoutAt: true,
        currentStreak: true,
      },
    });
  }

  /**
   * Get streak leaderboard (top users by current streak)
   */
  async getStreakLeaderboard(limit = 10) {
    return this.prisma.user.findMany({
      where: {
        currentStreak: { gt: 0 },
      },
      orderBy: { currentStreak: 'desc' },
      take: limit,
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
        currentStreak: true,
        longestStreak: true,
      },
    });
  }
}
