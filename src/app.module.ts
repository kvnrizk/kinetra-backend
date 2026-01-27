import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TrainersModule } from './trainers/trainers.module';
import { ClientsModule } from './clients/clients.module';
import { ProgramsModule } from './programs/programs.module';
import { LoggingModule } from './logging/logging.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    TrainersModule,
    ClientsModule,
    ProgramsModule,
    LoggingModule,
    NotificationsModule,
    PaymentsModule,
  ],
})
export class AppModule {}
