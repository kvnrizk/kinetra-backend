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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';

class LogBodyMetricDto {
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  notes?: string;
}

class CheckPrDto {
  exerciseId: string;
  weight: number;
  reps: number;
}

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  /**
   * Get weight trend data for charts
   * Query params: days (default: 90)
   */
  @Get('weight-trend')
  getWeightTrend(
    @CurrentUser() user: any,
    @Query('days') days?: string,
  ) {
    return this.analyticsService.getWeightTrend(
      user.sub,
      days ? parseInt(days) : 90,
    );
  }

  /**
   * Get exercise progress over time
   * Query params: days (default: 90)
   */
  @Get('exercise-progress/:exerciseId')
  getExerciseProgress(
    @CurrentUser() user: any,
    @Param('exerciseId') exerciseId: string,
    @Query('days') days?: string,
  ) {
    return this.analyticsService.getExerciseProgress(
      user.sub,
      exerciseId,
      days ? parseInt(days) : 90,
    );
  }

  /**
   * Get all personal records for the user
   */
  @Get('personal-records')
  getPersonalRecords(@CurrentUser() user: any) {
    return this.analyticsService.getPersonalRecords(user.sub);
  }

  /**
   * Log a new body metric entry
   */
  @Post('body-metric')
  logBodyMetric(
    @CurrentUser() user: any,
    @Body() dto: LogBodyMetricDto,
  ) {
    return this.analyticsService.logBodyMetric(
      user.sub,
      dto.weight,
      dto.bodyFat,
      dto.muscleMass,
      dto.notes,
    );
  }

  /**
   * Check if a set is a new personal record
   * Called after logging a set
   */
  @Post('check-pr')
  checkPersonalRecord(
    @CurrentUser() user: any,
    @Body() dto: CheckPrDto,
  ) {
    return this.analyticsService.updatePersonalRecord(
      user.sub,
      dto.exerciseId,
      dto.weight,
      dto.reps,
    );
  }

  /**
   * Get overall stats summary for the user
   */
  @Get('stats')
  getMyStats(@CurrentUser() user: any) {
    return this.analyticsService.getClientStats(user.sub);
  }

  /**
   * Get client stats (for trainer viewing client progress)
   */
  @Get('client-stats/:clientId')
  getClientStats(@Param('clientId') clientId: string) {
    return this.analyticsService.getClientStats(clientId);
  }

  /**
   * Get workout frequency stats
   * Query params: days (default: 90)
   */
  @Get('workout-frequency')
  getWorkoutFrequency(
    @CurrentUser() user: any,
    @Query('days') days?: string,
  ) {
    return this.analyticsService.getWorkoutFrequency(
      user.sub,
      days ? parseInt(days) : 90,
    );
  }

  /**
   * Get volume progress over time
   * Query params: days (default: 90)
   */
  @Get('volume-progress')
  getVolumeProgress(
    @CurrentUser() user: any,
    @Query('days') days?: string,
  ) {
    return this.analyticsService.getVolumeProgress(
      user.sub,
      days ? parseInt(days) : 90,
    );
  }

  /**
   * Get list of exercises user has performed
   */
  @Get('exercises')
  getUserExercises(@CurrentUser() user: any) {
    return this.analyticsService.getUserExercises(user.sub);
  }
}
