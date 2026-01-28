import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTrainerProfileDto } from './dto/update-trainer-profile.dto';

@Injectable()
export class TrainersService {
  constructor(private prisma: PrismaService) {}

  async upsertTrainerProfile(userId: string, dto: UpdateTrainerProfileDto) {
    // 1. Upsert trainer profile
    const trainer = await this.prisma.trainerProfile.upsert({
      where: { userId },
      update: {
        headline: dto.headline,
        bio: dto.bio,
        yearsExperience: dto.yearsExperience,
        remoteAvailable: dto.remoteAvailable,
        acceptsInGym: dto.acceptsInGym,
        baseCity: dto.baseCity,
        baseCountry: dto.baseCountry,
        sessionPriceMin: dto.sessionPriceMin,
        sessionPriceMax: dto.sessionPriceMax,
        currency: dto.currency ?? 'USD',
        instagramHandle: dto.instagramHandle,
        whatsappNumber: dto.whatsappNumber,
      },
      create: {
        userId,
        headline: dto.headline,
        bio: dto.bio,
        yearsExperience: dto.yearsExperience,
        remoteAvailable: dto.remoteAvailable ?? true,
        acceptsInGym: dto.acceptsInGym ?? true,
        baseCity: dto.baseCity,
        baseCountry: dto.baseCountry,
        sessionPriceMin: dto.sessionPriceMin,
        sessionPriceMax: dto.sessionPriceMax,
        currency: dto.currency ?? 'USD',
        instagramHandle: dto.instagramHandle,
        whatsappNumber: dto.whatsappNumber,
      },
    });

    // 2. Handle specialties (replace all with new ones)
    if (dto.specialties && Array.isArray(dto.specialties)) {
      // Delete existing specialties
      await this.prisma.trainerSpecialty.deleteMany({
        where: { trainerId: trainer.id },
      });

      // Create new specialties
      if (dto.specialties.length > 0) {
        await this.prisma.trainerSpecialty.createMany({
          data: dto.specialties.map((specialty) => ({
            trainerId: trainer.id,
            specialty,
          })),
          skipDuplicates: true,
        });
      }
    }

    // 3. Return trainer with specialties
    return this.prisma.trainerProfile.findUnique({
      where: { userId },
      include: {
        specialties: true,
      },
    });
  }

  // Dashboard Stats for Trainer
  async getDashboardStats(trainerUserId: string) {
    const trainer = await this.prisma.trainerProfile.findUnique({
      where: { userId: trainerUserId },
    });

    // Return empty dashboard if trainer profile doesn't exist yet
    // (user selected TRAINER role but hasn't completed onboarding)
    if (!trainer) {
      return {
        stats: {
          activeClients: 0,
          revenue: '0',
          pendingRequests: 0,
          painFlags: 0,
        },
        clients: [],
        painFlaggedSessions: [],
      };
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
        userId: c.client.user.id,
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

  /**
   * Get detailed client info for trainer management screen
   */
  async getClientDetails(trainerUserId: string, clientProfileId: string) {
    // Get trainer profile
    const trainer = await this.prisma.trainerProfile.findUnique({
      where: { userId: trainerUserId },
    });

    if (!trainer) {
      throw new NotFoundException('Trainer profile not found');
    }

    // Get the client relationship to verify trainer has access
    const relationship = await this.prisma.trainerClientRelationship.findFirst({
      where: {
        trainerId: trainer.id,
        clientId: clientProfileId,
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

    if (!relationship) {
      throw new ForbiddenException('Client not found or not assigned to this trainer');
    }

    // Get recent workout sessions
    const recentSessions = await this.prisma.workoutSession.findMany({
      where: {
        userId: relationship.client.userId,
      },
      include: {
        workout: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 5,
    });

    // Get or create conversation
    let conversationId: string | null = null;
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: trainerUserId } } },
          { participants: { some: { userId: relationship.client.userId } } },
        ],
      },
    });
    conversationId = conversation?.id || null;

    return {
      id: relationship.client.id,
      fullName: relationship.client.user.fullName || relationship.client.user.email.split('@')[0],
      email: relationship.client.user.email,
      avatarUrl: relationship.client.user.avatarUrl,
      currentPlan: relationship.currentPlan?.title || null,
      currentPlanId: relationship.currentPlan?.id || null,
      lastWorkoutAt: recentSessions[0]?.startedAt || null,
      conversationId,
      recentActivity: recentSessions.map((session) => ({
        id: session.id,
        workoutName: session.workout?.title || 'Workout',
        date: session.startedAt,
      })),
    };
  }
}
