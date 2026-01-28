import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RetentionCron } from './retention.cron';
import { RetentionModule } from '../retention/retention.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    RetentionModule,
    NotificationsModule,
  ],
  providers: [RetentionCron],
})
export class CronModule {}
