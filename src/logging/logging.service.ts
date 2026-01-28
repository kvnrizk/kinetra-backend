import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RetentionService } from '../retention/retention.service';
import { CompleteSessionDto } from './dto/complete-session.dto';
import { StartSessionDto } from './dto/start-session.dto';

@Injectable()
export class LoggingService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    private retentionService: RetentionService,
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

    // Use transaction to safely clean up and create session
    return this.prisma.$transaction(async (tx) => {
      // Clean up any existing IN_PROGRESS sessions for this user
      // (A user can only work on one workout at a time)
      const existingSessions = await tx.workoutSession.findMany({
        where: {
          userId,
          status: 'IN_PROGRESS',
        },
        select: { id: true },
      });

      for (const session of existingSessions) {
        await tx.setLog.deleteMany({
          where: { sessionId: session.id },
        });
        await tx.workoutSession.delete({
          where: { id: session.id },
        });
      }

      return tx.workoutSession.create({
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
    });
  }

  // Complete a workout session with all set logs
  async completeSession(userId: string, dto: CompleteSessionDto) {
    // Get all valid workoutExerciseIds for this workout
    const workout = await this.prisma.workout.findUnique({
      where: { id: dto.workoutId },
      include: {
        exercises: {
          select: { id: true },
        },
      },
    });

    const validExerciseIds = new Set(
      workout?.exercises?.map((e) => e.id) || [],
    );

    // Filter out any invalid logs and ensure required fields
    const validLogs = (dto.logs || [])
      .filter((log) => {
        // Must have workoutExerciseId and setNumber
        if (!log.workoutExerciseId || !log.setNumber) return false;
        // Must be a valid workoutExerciseId for this workout
        if (!validExerciseIds.has(log.workoutExerciseId)) {
          console.warn(
            `Invalid workoutExerciseId: ${log.workoutExerciseId}, valid IDs:`,
            Array.from(validExerciseIds),
          );
          return false;
        }
        return true;
      })
      .map((log) => ({
        workoutExerciseId: log.workoutExerciseId,
        setNumber: log.setNumber,
        weight: log.weight || 0,
        reps: log.reps || 0,
        rpe: log.rpe,
        isCompleted: log.isCompleted ?? true,
      }));

    // Check if there's an existing IN_PROGRESS session for this workout
    const existingSession = await this.prisma.workoutSession.findFirst({
      where: {
        userId,
        workoutId: dto.workoutId,
        status: 'IN_PROGRESS',
      },
    });

    let session;

    if (existingSession) {
      // Update existing session instead of creating new one
      // First delete any existing logs
      await this.prisma.setLog.deleteMany({
        where: { sessionId: existingSession.id },
      });

      // Update the session and add new logs
      session = await this.prisma.workoutSession.update({
        where: { id: existingSession.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          planWeekWorkoutId: dto.planWeekWorkoutId,
          feedback: dto.feedback,
          painFlag: dto.painFlag ?? false,
          painDetails: dto.painDetails,
          logs: validLogs.length > 0 ? { create: validLogs } : undefined,
        },
        include: {
          logs: true,
          workout: true,
        },
      });
    } else {
      // No existing session, create a new one
      session = await this.prisma.workoutSession.create({
        data: {
          userId,
          workoutId: dto.workoutId,
          planWeekWorkoutId: dto.planWeekWorkoutId,
          status: 'COMPLETED',
          completedAt: new Date(),
          feedback: dto.feedback,
          painFlag: dto.painFlag ?? false,
          painDetails: dto.painDetails,
          logs: validLogs.length > 0 ? { create: validLogs } : undefined,
        },
        include: {
          logs: true,
          workout: true,
        },
      });
    }

    // Clean up any other orphaned IN_PROGRESS sessions for this user
    // (A user should only have one active session at a time)
    const orphanedSessions = await this.prisma.workoutSession.findMany({
      where: {
        userId,
        status: 'IN_PROGRESS',
        id: { not: session.id },
      },
      select: { id: true },
    });

    for (const orphaned of orphanedSessions) {
      await this.prisma.setLog.deleteMany({
        where: { sessionId: orphaned.id },
      });
      await this.prisma.workoutSession.delete({
        where: { id: orphaned.id },
      });
    }

    // Notify trainer of workout completion (don't fail if this errors)
    try {
      if (session.workout) {
        await this.notifyTrainerOfCompletion(userId, session.workout.title);
      }

      // If pain flag is set, also notify trainer of pain
      if (dto.painFlag && session.workout) {
        await this.notifyTrainerOfPain(userId, session.id, dto.painDetails);
      }
    } catch (err) {
      console.error('Failed to send notifications:', err);
    }

    // Update user's workout streak (don't fail if this errors)
    try {
      await this.retentionService.updateStreak(userId);
    } catch (err) {
      console.error('Failed to update streak:', err);
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
        // Find existing log by composite key (sessionId + workoutExerciseId + setNumber)
        const existingLog = await this.prisma.setLog.findFirst({
          where: {
            sessionId,
            workoutExerciseId: log.workoutExerciseId,
            setNumber: log.setNumber,
          },
        });

        if (existingLog) {
          // Update existing log
          await this.prisma.setLog.update({
            where: { id: existingLog.id },
            data: {
              weight: log.weight,
              reps: log.reps,
              rpe: log.rpe,
              isCompleted: log.isCompleted,
            },
          });
        } else {
          // Create new log
          await this.prisma.setLog.create({
            data: {
              sessionId,
              workoutExerciseId: log.workoutExerciseId,
              setNumber: log.setNumber,
              weight: log.weight,
              reps: log.reps,
              rpe: log.rpe,
              isCompleted: log.isCompleted ?? false,
            },
          });
        }
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

    const updatedSession = await this.prisma.workoutSession.update({
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

    // Update user's workout streak
    await this.retentionService.updateStreak(userId);

    return updatedSession;
  }

  // Get user's workout history
  async getSessionHistory(userId: string, limit = 20, offset = 0) {
    return this.prisma.workoutSession.findMany({
      where: {
        userId,
        status: 'COMPLETED', // Only show completed sessions in history
      },
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
      orderBy: { completedAt: 'desc' }, // Order by completion date
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

  // Get session details by ID (for trainers viewing client sessions)
  async getSessionDetails(sessionId: string) {
    const session = await this.prisma.workoutSession.findUnique({
      where: { id: sessionId },
      include: {
        workout: true,
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        logs: {
          orderBy: { setNumber: 'asc' },
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

    // Transform logs to include exercise info at the top level
    return {
      ...session,
      setLogs: session.logs.map((log) => ({
        id: log.id,
        setNumber: log.setNumber,
        reps: log.reps,
        weight: log.weight,
        rpe: log.rpe,
        exercise: log.workoutExercise?.exercise || null,
      })),
    };
  }

  // Delete a workout session (only owner or their trainer can delete)
  async deleteSession(sessionId: string, requesterId: string) {
    const session = await this.prisma.workoutSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Check if requester is the session owner
    const isOwner = session.userId === requesterId;

    // Check if requester is the client's trainer
    let isTrainer = false;
    if (!isOwner) {
      const clientProfile = await this.prisma.clientProfile.findFirst({
        where: { userId: session.userId },
        include: {
          trainerRelationships: {
            where: { status: 'ACTIVE' },
            include: { trainer: true },
          },
        },
      });

      if (clientProfile) {
        isTrainer = clientProfile.trainerRelationships.some(
          (rel) => rel.trainer.userId === requesterId,
        );
      }
    }

    if (!isOwner && !isTrainer) {
      throw new ForbiddenException('Not authorized to delete this session');
    }

    // Delete related set logs first (due to FK constraints)
    await this.prisma.setLog.deleteMany({
      where: { sessionId },
    });

    // Delete the session
    await this.prisma.workoutSession.delete({
      where: { id: sessionId },
    });

    return { success: true, message: 'Session deleted' };
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
