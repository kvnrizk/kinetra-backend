import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { TrainerEarningsService } from './trainer-earnings.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, TrainerEarningsService],
  exports: [AnalyticsService, TrainerEarningsService],
})
export class AnalyticsModule {}
