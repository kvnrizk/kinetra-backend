import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrainersService {
  constructor(private prisma: PrismaService) {}

  // Dashboard Stats for Trainer
  async getDashboardStats(trainerUserId: string) {
    const trainer = await this.prisma.trainerProfile.findUnique({
      where: { userId: trainerUserId },
    });

    if (!trainer) {
      throw new NotFoundException('Trainer profile not found');
    }

    // 1. Count Active Clients
    const activeClientsCount = await this.prisma.trainerClientRelationship.count({
      where: {
        trainerId: trainer.id,
        status: 'ACTIVE',
      },
    });

    // 2. Count Pain Flags in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get all client user IDs for this trainer
    const clientRelationships = await this.prisma.trainerClientRelationship.findMany({
      where: {
        trainerId: trainer.id,
        status: 'ACTIVE',
      },
      include: {
        client: {
          select: { userId: true },
        },
      },
    });

    const clientUserIds = clientRelationships.map((rel) => rel.client.userId);

    const painFlagsCount = await this.prisma.workoutSession.count({
      where: {
        painFlag: true,
        startedAt: { gte: sevenDaysAgo },
        userId: { in: clientUserIds },
      },
    });

    // 3. Count pending requests
    const pendingRequestsCount = await this.prisma.trainerClientRelationship.count({
      where: {
        trainerId: trainer.id,
        status: 'PENDING',
      },
    });

    // 4. Get Client List with their latest activity
    const clients = await this.prisma.trainerClientRelationship.findMany({
      where: {
        trainerId: trainer.id,
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
                avatarUrl: true,
                clientWorkoutSessions: {
                  take: 1,
                  orderBy: { startedAt: 'desc' },
                  select: {
                    id: true,
                    painFlag: true,
                    startedAt: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
        currentPlan: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // 5. Get pain-flagged sessions for review
    const painFlaggedSessions = await this.prisma.workoutSession.findMany({
      where: {
        painFlag: true,
        userId: { in: clientUserIds },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        workout: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 10,
    });

    return {
      stats: {
        activeClients: activeClientsCount,
        revenue: '0', // Placeholder until payment integration
        pendingRequests: pendingRequestsCount,
        painFlags: painFlagsCount,
      },
      clients: clients.map((c) => ({
        id: c.client.id,
        odId: c.client.user.id,
        name: c.client.user.fullName || c.client.user.email.split('@')[0],
        email: c.client.user.email,
        avatarUrl: c.client.user.avatarUrl,
        currentPlan: c.currentPlan?.title || null,
        status: c.client.user.clientWorkoutSessions[0]?.painFlag
          ? 'PAIN_FLAGGED'
          : 'ACTIVE',
        lastWorkout: c.client.user.clientWorkoutSessions[0]?.startedAt || null,
      })),
      painFlaggedSessions: painFlaggedSessions.map((session) => ({
        id: session.id,
        clientName: session.user.fullName || 'Unknown',
        clientAvatar: session.user.avatarUrl,
        workoutTitle: session.workout?.title || 'Workout',
        painDetails: session.painDetails,
        date: session.startedAt,
      })),
    };
  }

  async findAll(filters?: {
    city?: string;
    specialty?: string;
    minRating?: number;
  }) {
    const where: any = {};

    if (filters?.city) {
      where.baseCity = filters.city;
    }

    if (filters?.minRating) {
      where.avgRating = { gte: filters.minRating };
    }

    const trainers = await this.prisma.trainerProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        specialties: true,
        reviews: {
          take: 3,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { avgRating: 'desc' },
    });

    // Filter by specialty if provided
    if (filters?.specialty) {
      return trainers.filter((t) =>
        t.specialties.some((s) => s.specialty === filters.specialty),
      );
    }

    return trainers;
  }

  async findById(trainerId: string) {
    return this.prisma.trainerProfile.findUnique({
      where: { id: trainerId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            city: true,
            country: true,
          },
        },
        specialties: true,
        certifications: true,
        gymAffiliations: {
          include: {
            gym: true,
          },
        },
        reviews: {
          include: {
            client: {
              select: {
                fullName: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        plans: {
          where: { isTemplate: true, isActive: true },
        },
      },
    });
  }

  async getTrainerClients(trainerId: string) {
    return this.prisma.trainerClientRelationship.findMany({
      where: {
        trainerId,
        status: 'ACTIVE',
      },
      include: {
        client: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
        currentPlan: true,
      },
    });
  }
}
