import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CompleteSessionDto } from './dto/complete-session.dto';
import { StartSessionDto } from './dto/start-session.dto';

@Injectable()
export class LoggingService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {}

  // Start a new workout session
  async startSession(userId: string, dto: StartSessionDto) {
    // Verify the workout exists
    const workout = await this.prisma.workout.findUnique({
      where: { id: dto.workoutId },
    });

    if (!workout) {
      throw new NotFoundException('Workout not found');
    }

    return this.prisma.workoutSession.create({
      data: {
        userId,
        workoutId: dto.workoutId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
      include: {
        workout: {
          include: {
            exercises: {
              include: {
                exercise: true,
              },
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });
  }

  // Complete a workout session with all set logs
  async completeSession(userId: string, dto: CompleteSessionDto) {
    const session = await this.prisma.workoutSession.create({
      data: {
        userId,
        workoutId: dto.workoutId,
        status: 'COMPLETED',
        completedAt: new Date(),
        feedback: dto.feedback,
        painFlag: dto.painFlag,
        painDetails: dto.painDetails,
        logs: {
          create: dto.logs.map((log) => ({
            workoutExerciseId: log.workoutExerciseId,
            setNumber: log.setNumber,
            weight: log.weight,
            reps: log.reps,
            rpe: log.rpe,
            isCompleted: log.isCompleted ?? true,
          })),
        },
      },
      include: {
        logs: true,
        workout: true,
      },
    });

    // Notify trainer of workout completion
    await this.notifyTrainerOfCompletion(userId, session.workout.title);

    // If pain flag is set, also notify trainer of pain
    if (dto.painFlag) {
      await this.notifyTrainerOfPain(userId, session.id, dto.painDetails);
    }

    return session;
  }

  // Update an existing session (for saving progress mid-workout)
  async updateSession(
    userId: string,
    sessionId: string,
    dto: Partial<CompleteSessionDto>,
  ) {
    const session = await this.prisma.workoutSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // If logs are provided, upsert them
    if (dto.logs && dto.logs.length > 0) {
      for (const log of dto.logs) {
        await this.prisma.setLog.upsert({
          where: {
            id: `${sessionId}-${log.workoutExerciseId}-${log.setNumber}`,
          },
          create: {
            sessionId,
            workoutExerciseId: log.workoutExerciseId,
            setNumber: log.setNumber,
            weight: log.weight,
            reps: log.reps,
            rpe: log.rpe,
            isCompleted: log.isCompleted ?? false,
          },
          update: {
            weight: log.weight,
            reps: log.reps,
            rpe: log.rpe,
            isCompleted: log.isCompleted,
          },
        });
      }
    }

    return this.prisma.workoutSession.update({
      where: { id: sessionId },
      data: {
        feedback: dto.feedback,
        painFlag: dto.painFlag,
        painDetails: dto.painDetails,
      },
      include: {
        logs: true,
      },
    });
  }

  // Mark session as complete
  async markComplete(userId: string, sessionId: string) {
    const session = await this.prisma.workoutSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.prisma.workoutSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      include: {
        logs: true,
        workout: true,
      },
    });
  }

  // Get user's workout history
  async getSessionHistory(userId: string, limit = 20, offset = 0) {
    return this.prisma.workoutSession.findMany({
      where: { userId },
      include: {
        workout: true,
        logs: {
          include: {
            workoutExercise: {
              include: {
                exercise: true,
              },
            },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  // Get a specific session
  async getSession(userId: string, sessionId: string) {
    const session = await this.prisma.workoutSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        workout: {
          include: {
            exercises: {
              include: {
                exercise: true,
              },
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
        logs: {
          include: {
            workoutExercise: {
              include: {
                exercise: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  // Get sessions with pain flags (for trainer dashboard)
  async getPainFlaggedSessions(trainerId: string) {
    // Get all clients of this trainer
    const trainerProfile = await this.prisma.trainerProfile.findFirst({
      where: { userId: trainerId },
      include: {
        clientRelationships: {
          where: { status: 'ACTIVE' },
          include: {
            client: true,
          },
        },
      },
    });

    if (!trainerProfile) {
      return [];
    }

    const clientUserIds = trainerProfile.clientRelationships.map(
      (rel) => rel.client.userId,
    );

    return this.prisma.workoutSession.findMany({
      where: {
        userId: { in: clientUserIds },
        painFlag: true,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
        workout: true,
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  // Get in-progress session for a user (if any)
  async getActiveSession(userId: string) {
    return this.prisma.workoutSession.findFirst({
      where: {
        userId,
        status: 'IN_PROGRESS',
      },
      include: {
        workout: {
          include: {
            exercises: {
              include: {
                exercise: true,
              },
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
        logs: true,
      },
    });
  }

  // Private helper: notify trainer when client reports pain
  private async notifyTrainerOfPain(
    userId: string,
    sessionId: string,
    painDetails?: string,
  ) {
    // Find the client's active trainer relationship
    const clientProfile = await this.prisma.clientProfile.findFirst({
      where: { userId },
      include: {
        trainerRelationships: {
          where: { status: 'ACTIVE' },
          include: {
            trainer: true,
          },
        },
      },
    });

    if (!clientProfile || clientProfile.trainerRelationships.length === 0) {
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });

    const clientName = user?.fullName || 'A client';

    // Send push notifications to all active trainers
    for (const relationship of clientProfile.trainerRelationships) {
      await this.notificationsService.notifyPainFlag(
        userId,
        relationship.trainer.userId,
        clientName,
        painDetails,
      );
    }
  }

  // Private helper: notify trainer when client completes workout
  private async notifyTrainerOfCompletion(
    userId: string,
    workoutName: string,
  ) {
    // Find the client's active trainer relationship
    const clientProfile = await this.prisma.clientProfile.findFirst({
      where: { userId },
      include: {
        trainerRelationships: {
          where: { status: 'ACTIVE' },
          include: {
            trainer: true,
          },
        },
      },
    });

    if (!clientProfile || clientProfile.trainerRelationships.length === 0) {
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });

    const clientName = user?.fullName || 'A client';

    // Send push notifications to all active trainers
    for (const relationship of clientProfile.trainerRelationships) {
      await this.notificationsService.notifyWorkoutComplete(
        userId,
        relationship.trainer.userId,
        clientName,
        workoutName,
      );
    }
  }
}
