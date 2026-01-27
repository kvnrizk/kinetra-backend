import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

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
}
