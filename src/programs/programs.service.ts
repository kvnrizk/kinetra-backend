import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto, CreatePlanWithWeeksDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import {
  CreateWorkoutDto,
  CreateWorkoutExerciseDto,
  AddWorkoutToWeekDto,
} from './dto/create-workout.dto';
import { AssignPlanDto } from './dto/assign-plan.dto';

@Injectable()
export class ProgramsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new plan with nested workouts and exercises
   * Uses Prisma transaction to ensure atomicity
   */
  async createPlan(trainerUserId: string, dto: CreatePlanDto) {
    // 1. Find the trainer profile ID
    const trainer = await this.prisma.trainerProfile.findUnique({
      where: { userId: trainerUserId },
    });

    if (!trainer) {
      throw new ForbiddenException('Trainer profile not found');
    }

    // 2. Verify the client exists
    const client = await this.prisma.clientProfile.findUnique({
      where: { id: dto.clientId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    // 3. Create Plan with nested Workouts and Exercises in a transaction
    return this.prisma.plan.create({
      data: {
        title: dto.name,
        description: dto.description,
        trainerId: trainer.id,
        clientId: dto.clientId,
        isTemplate: false,
        workouts: {
          create: dto.workouts.map((workout) => ({
            title: workout.name,
            description: workout.description,
            orderIndex: workout.order,
            trainerId: trainer.id,
            exercises: {
              create: workout.exercises.map((exercise) => ({
                exerciseId: exercise.exerciseId,
                name: exercise.name,
                sets: exercise.sets,
                reps: exercise.reps,
                notes: exercise.notes,
                videoUrl: exercise.videoUrl,
                orderIndex: exercise.order,
              })),
            },
          })),
        },
      },
      include: {
        client: {
          include: {
            user: {
              select: {
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
        workouts: {
          orderBy: { orderIndex: 'asc' },
          include: {
            exercises: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });
  }

  /**
   * Update an existing plan
   */
  async updatePlan(planId: string, trainerUserId: string, dto: UpdatePlanDto) {
    // Verify ownership
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: { trainer: true },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    if (plan.trainer?.userId !== trainerUserId) {
      throw new ForbiddenException('Not authorized to update this plan');
    }

    // If workouts are provided, we need to replace them
    if (dto.workouts) {
      // Delete existing workouts (cascade deletes exercises)
      await this.prisma.workout.deleteMany({
        where: { planId },
      });

      // Create new workouts with exercises
      return this.prisma.plan.update({
        where: { id: planId },
        data: {
          title: dto.name,
          description: dto.description,
          isActive: dto.isActive,
          workouts: {
            create: dto.workouts.map((workout) => ({
              title: workout.name,
              description: workout.description,
              orderIndex: workout.order,
              trainerId: plan.trainerId,
              exercises: {
                create: workout.exercises.map((exercise) => ({
                  exerciseId: exercise.exerciseId,
                  name: exercise.name,
                  sets: exercise.sets,
                  reps: exercise.reps,
                  notes: exercise.notes,
                  videoUrl: exercise.videoUrl,
                  orderIndex: exercise.order,
                })),
              },
            })),
          },
        },
        include: {
          workouts: {
            orderBy: { orderIndex: 'asc' },
            include: {
              exercises: {
                orderBy: { orderIndex: 'asc' },
              },
            },
          },
        },
      });
    }

    // Simple update without workouts
    return this.prisma.plan.update({
      where: { id: planId },
      data: {
        title: dto.name,
        description: dto.description,
        isActive: dto.isActive,
      },
      include: {
        workouts: {
          orderBy: { orderIndex: 'asc' },
          include: {
            exercises: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });
  }

  /**
   * Delete a plan
   */
  async deletePlan(planId: string, trainerUserId: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: { trainer: true },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    if (plan.trainer?.userId !== trainerUserId) {
      throw new ForbiddenException('Not authorized to delete this plan');
    }

    await this.prisma.plan.delete({
      where: { id: planId },
    });

    return { success: true, message: 'Plan deleted' };
  }

  /**
   * Get all plans for a specific client
   */
  async getPlansForClient(clientId: string) {
    return this.prisma.plan.findMany({
      where: { clientId, isActive: true },
      include: {
        trainer: {
          include: {
            user: {
              select: {
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
        workouts: {
          orderBy: { orderIndex: 'asc' },
          include: {
            exercises: {
              orderBy: { orderIndex: 'asc' },
              include: {
                exercise: {
                  include: {
                    primaryMuscle: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all plans created by a trainer
   */
  async getPlansForTrainer(trainerUserId: string) {
    const trainer = await this.prisma.trainerProfile.findUnique({
      where: { userId: trainerUserId },
    });

    if (!trainer) {
      return [];
    }

    return this.prisma.plan.findMany({
      where: { trainerId: trainer.id },
      include: {
        client: {
          include: {
            user: {
              select: {
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
        workouts: {
          orderBy: { orderIndex: 'asc' },
          include: {
            exercises: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single plan by ID with full details
   */
  async findById(planId: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: {
        trainer: {
          include: {
            user: {
              select: {
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
        client: {
          include: {
            user: {
              select: {
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
        // Direct workouts relation (for plans created with createPlan)
        workouts: {
          orderBy: { orderIndex: 'asc' },
          include: {
            exercises: {
              orderBy: { orderIndex: 'asc' },
              include: {
                exercise: {
                  include: {
                    primaryMuscle: true,
                  },
                },
              },
            },
          },
        },
        // Weeks structure (for plans created with createPlanWithWeeks)
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: {
            workouts: {
              orderBy: [{ dayOfWeek: 'asc' }, { orderIndex: 'asc' }],
              include: {
                workout: {
                  include: {
                    exercises: {
                      orderBy: { orderIndex: 'asc' },
                      include: {
                        exercise: {
                          include: {
                            primaryMuscle: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return plan;
  }

  /**
   * Find all plans (with optional filters)
   */
  async findAll(filters?: { trainerId?: string; isTemplate?: boolean }) {
    return this.prisma.plan.findMany({
      where: {
        trainerId: filters?.trainerId,
        isTemplate: filters?.isTemplate,
        isActive: true,
      },
      include: {
        trainer: {
          include: {
            user: {
              select: {
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
        client: {
          include: {
            user: {
              select: {
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
        workouts: {
          orderBy: { orderIndex: 'asc' },
          include: {
            exercises: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // =============================================
  // TASK 7: Plan with Weeks Creation
  // =============================================

  /**
   * Create a new plan with auto-generated weeks
   */
  async createPlanWithWeeks(trainerUserId: string, dto: CreatePlanWithWeeksDto) {
    const trainer = await this.prisma.trainerProfile.findUnique({
      where: { userId: trainerUserId },
    });

    if (!trainer) {
      throw new ForbiddenException('Trainer profile not found');
    }

    // Create the plan
    const plan = await this.prisma.plan.create({
      data: {
        trainerId: trainer.id,
        title: dto.title,
        description: dto.description,
        durationWeeks: dto.durationWeeks,
        isTemplate: dto.isTemplate ?? false,
        basePrice: dto.basePrice,
        currency: dto.currency ?? 'USD',
        isActive: true,
      },
    });

    // Auto-create weeks (1 to durationWeeks)
    const weeks = [];
    for (let i = 1; i <= dto.durationWeeks; i++) {
      const week = await this.prisma.planWeek.create({
        data: {
          planId: plan.id,
          weekNumber: i,
        },
      });
      weeks.push(week);
    }

    return {
      ...plan,
      weeks,
    };
  }

  /**
   * Get a plan with all its weeks and workouts
   */
  async getPlanWithWeeks(planId: string) {
    return this.prisma.plan.findUnique({
      where: { id: planId },
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: {
            workouts: {
              orderBy: { dayOfWeek: 'asc' },
              include: {
                workout: {
                  include: {
                    exercises: {
                      orderBy: { orderIndex: 'asc' },
                      include: {
                        exercise: true,
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
   * Get all plans with weeks for a trainer
   */
  async getTrainerPlansWithWeeks(trainerUserId: string) {
    const trainer = await this.prisma.trainerProfile.findUnique({
      where: { userId: trainerUserId },
    });

    if (!trainer) {
      return [];
    }

    return this.prisma.plan.findMany({
      where: { trainerId: trainer.id },
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
        },
        client: {
          include: {
            user: {
              select: {
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // =============================================
  // TASK 8: Workout + Exercise Creation
  // =============================================

  /**
   * Create a standalone workout (can be added to plan weeks later)
   */
  async createWorkout(trainerUserId: string, dto: CreateWorkoutDto) {
    const trainer = await this.prisma.trainerProfile.findUnique({
      where: { userId: trainerUserId },
    });

    if (!trainer) {
      throw new ForbiddenException('Trainer profile not found');
    }

    return this.prisma.workout.create({
      data: {
        trainerId: trainer.id,
        title: dto.title,
        description: dto.description,
        estimatedMinutes: dto.estimatedMinutes,
        isPublic: false,
      },
    });
  }

  /**
   * Add exercise to a workout
   */
  async addExerciseToWorkout(workoutId: string, dto: CreateWorkoutExerciseDto) {
    // Verify workout exists
    const workout = await this.prisma.workout.findUnique({
      where: { id: workoutId },
    });

    if (!workout) {
      throw new NotFoundException('Workout not found');
    }

    return this.prisma.workoutExercise.create({
      data: {
        workoutId,
        exerciseId: dto.exerciseId,
        name: dto.name,
        sets: dto.sets,
        reps: dto.reps,
        repsMin: dto.repsMin,
        repsMax: dto.repsMax,
        restSeconds: dto.restSeconds,
        tempo: dto.tempo,
        notes: dto.notes,
        videoUrl: dto.videoUrl,
        orderIndex: dto.orderIndex,
      },
      include: {
        exercise: true,
      },
    });
  }

  /**
   * Add workout to a plan week
   */
  async addWorkoutToWeek(planWeekId: string, dto: AddWorkoutToWeekDto) {
    // Verify plan week exists
    const planWeek = await this.prisma.planWeek.findUnique({
      where: { id: planWeekId },
    });

    if (!planWeek) {
      throw new NotFoundException('Plan week not found');
    }

    // Get current max order index
    const existingWorkouts = await this.prisma.planWeekWorkout.findMany({
      where: { planWeekId },
      orderBy: { orderIndex: 'desc' },
      take: 1,
    });

    const nextOrderIndex = existingWorkouts.length > 0
      ? existingWorkouts[0].orderIndex + 1
      : 0;

    return this.prisma.planWeekWorkout.create({
      data: {
        planWeekId,
        workoutId: dto.workoutId,
        dayOfWeek: dto.dayOfWeek,
        notes: dto.notes,
        orderIndex: nextOrderIndex,
      },
      include: {
        workout: {
          include: {
            exercises: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });
  }

  /**
   * Get workout with all exercises
   */
  async getWorkoutWithExercises(workoutId: string) {
    const workout = await this.prisma.workout.findUnique({
      where: { id: workoutId },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' },
          include: {
            exercise: true,
          },
        },
      },
    });

    if (!workout) {
      throw new NotFoundException('Workout not found');
    }

    return workout;
  }

  /**
   * Get plan week with all workouts
   */
  async getPlanWeekWithWorkouts(planWeekId: string) {
    const planWeek = await this.prisma.planWeek.findUnique({
      where: { id: planWeekId },
      include: {
        workouts: {
          orderBy: [{ dayOfWeek: 'asc' }, { orderIndex: 'asc' }],
          include: {
            workout: {
              include: {
                exercises: {
                  orderBy: { orderIndex: 'asc' },
                  include: {
                    exercise: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!planWeek) {
      throw new NotFoundException('Plan week not found');
    }

    return planWeek;
  }

  /**
   * Get all exercises (for exercise picker in mobile app)
   */
  async getAllExercises(search?: string) {
    return this.prisma.exercise.findMany({
      where: search
        ? {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          }
        : undefined,
      include: {
        primaryMuscle: true,
      },
      orderBy: { name: 'asc' },
      take: 50,
    });
  }

  /**
   * Delete a workout
   */
  async deleteWorkout(workoutId: string, trainerUserId: string) {
    const workout = await this.prisma.workout.findUnique({
      where: { id: workoutId },
      include: { trainer: true },
    });

    if (!workout) {
      throw new NotFoundException('Workout not found');
    }

    if (workout.trainer?.userId !== trainerUserId) {
      throw new ForbiddenException('Not authorized to delete this workout');
    }

    await this.prisma.workout.delete({
      where: { id: workoutId },
    });

    return { success: true, message: 'Workout deleted' };
  }

  /**
   * Delete an exercise from a workout
   */
  async deleteWorkoutExercise(exerciseId: string, trainerUserId: string) {
    const workoutExercise = await this.prisma.workoutExercise.findUnique({
      where: { id: exerciseId },
      include: {
        workout: {
          include: { trainer: true },
        },
      },
    });

    if (!workoutExercise) {
      throw new NotFoundException('Exercise not found');
    }

    if (workoutExercise.workout?.trainer?.userId !== trainerUserId) {
      throw new ForbiddenException('Not authorized to delete this exercise');
    }

    await this.prisma.workoutExercise.delete({
      where: { id: exerciseId },
    });

    return { success: true, message: 'Exercise removed from workout' };
  }

  // =============================================
  // TASK 10: Plan Assignment
  // =============================================

  /**
   * Assign a plan to a client
   */
  async assignPlanToClient(trainerUserId: string, dto: AssignPlanDto) {
    // Get trainer profile
    const trainer = await this.prisma.trainerProfile.findUnique({
      where: { userId: trainerUserId },
    });

    if (!trainer) {
      throw new ForbiddenException('Trainer profile not found');
    }

    // Get client profile
    const clientProfile = await this.prisma.clientProfile.findUnique({
      where: { userId: dto.clientUserId },
    });

    if (!clientProfile) {
      throw new NotFoundException('Client profile not found');
    }

    // Check if relationship exists
    let relationship = await this.prisma.trainerClientRelationship.findFirst({
      where: {
        trainerId: trainer.id,
        clientId: clientProfile.id,
      },
    });

    // Create relationship if it doesn't exist
    if (!relationship) {
      relationship = await this.prisma.trainerClientRelationship.create({
        data: {
          trainerId: trainer.id,
          clientId: clientProfile.id,
          status: 'ACTIVE',
          startedAt: new Date(),
        },
      });
    }

    // Clone the plan for the client (if it's a template)
    const sourcePlan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
      include: {
        weeks: {
          include: {
            workouts: true,
          },
        },
      },
    });

    if (!sourcePlan) {
      throw new NotFoundException('Plan not found');
    }

    // Create a new plan instance for the client
    const clientPlan = await this.prisma.plan.create({
      data: {
        trainerId: trainer.id,
        clientId: clientProfile.id,
        title: sourcePlan.title,
        description: sourcePlan.description,
        durationWeeks: sourcePlan.durationWeeks,
        isTemplate: false,
        isActive: true,
      },
    });

    // Copy weeks and their workout assignments
    for (const week of sourcePlan.weeks) {
      const newWeek = await this.prisma.planWeek.create({
        data: {
          planId: clientPlan.id,
          weekNumber: week.weekNumber,
          notes: week.notes,
        },
      });

      // Copy workout assignments
      for (const pw of week.workouts) {
        await this.prisma.planWeekWorkout.create({
          data: {
            planWeekId: newWeek.id,
            workoutId: pw.workoutId,
            dayOfWeek: pw.dayOfWeek,
            orderIndex: pw.orderIndex,
            notes: pw.notes,
          },
        });
      }
    }

    // Update relationship with current plan
    await this.prisma.trainerClientRelationship.update({
      where: { id: relationship.id },
      data: { currentPlanId: clientPlan.id },
    });

    return this.prisma.plan.findUnique({
      where: { id: clientPlan.id },
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: {
            workouts: {
              include: {
                workout: true,
              },
            },
          },
        },
        client: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get client's current active plan
   */
  async getClientCurrentPlan(clientUserId: string) {
    const clientProfile = await this.prisma.clientProfile.findUnique({
      where: { userId: clientUserId },
    });

    if (!clientProfile) {
      return null;
    }

    // Find the client's active plan
    const plan = await this.prisma.plan.findFirst({
      where: {
        clientId: clientProfile.id,
        isActive: true,
      },
      include: {
        trainer: {
          include: {
            user: {
              select: {
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: {
            workouts: {
              orderBy: [{ dayOfWeek: 'asc' }, { orderIndex: 'asc' }],
              include: {
                workout: {
                  include: {
                    exercises: {
                      orderBy: { orderIndex: 'asc' },
                      include: {
                        exercise: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return plan;
  }

  /**
   * Get client's plan history
   */
  async getClientPlanHistory(clientUserId: string) {
    const clientProfile = await this.prisma.clientProfile.findUnique({
      where: { userId: clientUserId },
    });

    if (!clientProfile) {
      return [];
    }

    return this.prisma.plan.findMany({
      where: {
        clientId: clientProfile.id,
      },
      include: {
        trainer: {
          include: {
            user: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get client's plan progress - returns completed planWeekWorkout IDs and percentage
   */
  async getClientPlanProgress(clientUserId: string) {
    const clientProfile = await this.prisma.clientProfile.findUnique({
      where: { userId: clientUserId },
    });

    if (!clientProfile) {
      return { completedPlanWeekWorkoutIds: [], totalWorkouts: 0, completedCount: 0, percentage: 0 };
    }

    // Get the active plan with all workouts
    const plan = await this.prisma.plan.findFirst({
      where: {
        clientId: clientProfile.id,
        isActive: true,
      },
      include: {
        weeks: {
          include: {
            workouts: {
              include: {
                workout: true,
              },
            },
          },
        },
      },
    });

    if (!plan) {
      return { completedPlanWeekWorkoutIds: [], totalWorkouts: 0, completedCount: 0, percentage: 0 };
    }

    // Get all PlanWeekWorkout IDs from the plan
    const allPlanWeekWorkoutIds: string[] = [];
    for (const week of plan.weeks) {
      for (const pw of week.workouts) {
        allPlanWeekWorkoutIds.push(pw.id);
      }
    }

    // Get completed sessions with planWeekWorkoutId
    const completedSessions = await this.prisma.workoutSession.findMany({
      where: {
        userId: clientUserId,
        planWeekWorkoutId: { in: allPlanWeekWorkoutIds },
        status: 'COMPLETED',
      },
      select: {
        planWeekWorkoutId: true,
      },
      distinct: ['planWeekWorkoutId'],
    });

    const completedPlanWeekWorkoutIds = completedSessions
      .map((s) => s.planWeekWorkoutId)
      .filter((id): id is string => id !== null);
    const totalWorkouts = allPlanWeekWorkoutIds.length;
    const completedCount = completedPlanWeekWorkoutIds.length;
    const percentage = totalWorkouts > 0 ? Math.round((completedCount / totalWorkouts) * 100) : 0;

    return {
      completedPlanWeekWorkoutIds,
      totalWorkouts,
      completedCount,
      percentage,
    };
  }
}
