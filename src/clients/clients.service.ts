import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async findById(clientId: string) {
    return this.prisma.clientProfile.findUnique({
      where: { id: clientId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            email: true,
          },
        },
        trainerRelationships: {
          where: { status: 'ACTIVE' },
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
          },
        },
      },
    });
  }

  async getClientTrainers(clientId: string) {
    return this.prisma.trainerClientRelationship.findMany({
      where: {
        clientId,
        status: 'ACTIVE',
      },
      include: {
        trainer: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
              },
            },
            specialties: true,
          },
        },
        currentPlan: true,
      },
    });
  }

  async getBodyMeasurements(userId: string, limit = 10) {
    return this.prisma.bodyMeasurement.findMany({
      where: { userId },
      orderBy: { measuredAt: 'desc' },
      take: limit,
    });
  }

  async addBodyMeasurement(
    userId: string,
    data: {
      weightKg?: number;
      heightCm?: number;
      bodyFatPct?: number;
      chestCm?: number;
      waistCm?: number;
      hipsCm?: number;
      leftArmCm?: number;
      rightArmCm?: number;
      leftThighCm?: number;
      rightThighCm?: number;
      leftCalfCm?: number;
      rightCalfCm?: number;
      notes?: string;
      source?: string;
    },
  ) {
    return this.prisma.bodyMeasurement.create({
      data: {
        userId,
        source: data.source ?? 'manual',
        ...data,
      },
    });
  }
}
