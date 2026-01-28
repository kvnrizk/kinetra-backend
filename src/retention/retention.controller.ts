import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RetentionService } from './retention.service';

@Controller('retention')
@UseGuards(JwtAuthGuard)
export class RetentionController {
  private readonly logger = new Logger(RetentionController.name);

  constructor(private retentionService: RetentionService) {}

  /**
   * Get current user's streak info
   */
  @Get('streak')
  async getMyStreak(@CurrentUser() user: any) {
    try {
      if (!user || !user.userId) {
        this.logger.warn('No user or user.userId in request');
        return {
          currentStreak: 0,
          longestStreak: 0,
          lastWorkoutAt: null,
          isActive: false,
          daysSinceLastWorkout: null,
          daysUntilStreakLost: 0,
        };
      }
      return await this.retentionService.getStreakInfo(user.userId);
    } catch (error) {
      this.logger.error(`Failed to get streak info for user ${user?.userId}:`, error);
      throw new InternalServerErrorException('Failed to fetch streak info');
    }
  }

  /**
   * Check if current user is inactive
   */
  @Get('inactivity-check')
  checkMyInactivity(
    @CurrentUser() user: any,
    @Query('days') days?: string,
  ) {
    return this.retentionService.checkUserInactivity(
      user.userId,
      days ? parseInt(days) : 2,
    );
  }

  /**
   * Get inactive clients for trainer
   * (Trainer must be logged in)
   */
  @Get('trainer-alerts')
  getTrainerAlerts(
    @CurrentUser() user: any,
    @Query('days') days?: string,
  ) {
    return this.retentionService.getInactiveClientsForTrainer(
      user.userId,
      days ? parseInt(days) : 3,
    );
  }

  /**
   * Get streak leaderboard
   */
  @Get('leaderboard')
  getLeaderboard(@Query('limit') limit?: string) {
    return this.retentionService.getStreakLeaderboard(
      limit ? parseInt(limit) : 10,
    );
  }

  /**
   * Manually trigger streak update (usually called after workout completion)
   */
  @Post('update-streak')
  updateStreak(@CurrentUser() user: any) {
    return this.retentionService.updateStreak(user.userId);
  }
}
