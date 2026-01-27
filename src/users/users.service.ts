import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { ClientSetupDto } from './dto/client-setup.dto';
import { TrainerSetupDto } from './dto/trainer-setup.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        clientProfile: true,
        trainerProfile: {
          include: {
            specialties: true,
            certifications: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
        avatarUrl: dto.avatarUrl,
        phoneCountry: dto.phoneCountry,
        phoneNumber: dto.phoneNumber,
        country: dto.country,
        city: dto.city,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
      },
    });
  }

  async setUserRole(userId: string, role: UserRole) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }

  async setupClientProfile(userId: string, dto: ClientSetupDto) {
    // Update user role
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: UserRole.CLIENT },
    });

    // Create or update client profile
    const clientProfile = await this.prisma.clientProfile.upsert({
      where: { userId },
      update: {
        mainGoal: dto.mainGoal,
        experienceLevel: dto.experienceLevel,
        daysPerWeek: dto.daysPerWeek,
        hasMedicalIssues: dto.hasMedicalIssues ?? false,
        medicalNotes: dto.medicalNotes,
      },
      create: {
        userId,
        mainGoal: dto.mainGoal,
        experienceLevel: dto.experienceLevel,
        daysPerWeek: dto.daysPerWeek,
        hasMedicalIssues: dto.hasMedicalIssues ?? false,
        medicalNotes: dto.medicalNotes,
      },
    });

    // If body measurements provided, create initial entry
    if (dto.weightKg || dto.heightCm || dto.bodyFatPct) {
      await this.prisma.bodyMeasurement.create({
        data: {
          userId,
          source: 'manual',
          weightKg: dto.weightKg,
          heightCm: dto.heightCm,
          bodyFatPct: dto.bodyFatPct,
        },
      });
    }

    return clientProfile;
  }

  async setupTrainerProfile(userId: string, dto: TrainerSetupDto) {
    // Update user role
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: UserRole.TRAINER },
    });

    // Create or update trainer profile
    const trainerProfile = await this.prisma.trainerProfile.upsert({
      where: { userId },
      update: {
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

    // Handle specialties
    if (dto.specialties && dto.specialties.length > 0) {
      // Delete existing specialties
      await this.prisma.trainerSpecialty.deleteMany({
        where: { trainerId: trainerProfile.id },
      });

      // Create new specialties
      await this.prisma.trainerSpecialty.createMany({
        data: dto.specialties.map((specialty) => ({
          trainerId: trainerProfile.id,
          specialty,
        })),
      });
    }

    return this.prisma.trainerProfile.findUnique({
      where: { id: trainerProfile.id },
      include: {
        specialties: true,
      },
    });
  }

  async setupBothProfiles(
    userId: string,
    clientDto: ClientSetupDto,
    trainerDto: TrainerSetupDto,
  ) {
    // Set role to BOTH
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: UserRole.BOTH },
    });

    // Create client profile
    await this.prisma.clientProfile.upsert({
      where: { userId },
      update: {
        mainGoal: clientDto.mainGoal,
        experienceLevel: clientDto.experienceLevel,
        daysPerWeek: clientDto.daysPerWeek,
        hasMedicalIssues: clientDto.hasMedicalIssues ?? false,
        medicalNotes: clientDto.medicalNotes,
      },
      create: {
        userId,
        mainGoal: clientDto.mainGoal,
        experienceLevel: clientDto.experienceLevel,
        daysPerWeek: clientDto.daysPerWeek,
        hasMedicalIssues: clientDto.hasMedicalIssues ?? false,
        medicalNotes: clientDto.medicalNotes,
      },
    });

    // Create trainer profile
    const trainerProfile = await this.prisma.trainerProfile.upsert({
      where: { userId },
      update: {
        headline: trainerDto.headline,
        bio: trainerDto.bio,
        yearsExperience: trainerDto.yearsExperience,
        remoteAvailable: trainerDto.remoteAvailable ?? true,
        acceptsInGym: trainerDto.acceptsInGym ?? true,
        baseCity: trainerDto.baseCity,
        baseCountry: trainerDto.baseCountry,
        sessionPriceMin: trainerDto.sessionPriceMin,
        sessionPriceMax: trainerDto.sessionPriceMax,
        currency: trainerDto.currency ?? 'USD',
        instagramHandle: trainerDto.instagramHandle,
        whatsappNumber: trainerDto.whatsappNumber,
      },
      create: {
        userId,
        headline: trainerDto.headline,
        bio: trainerDto.bio,
        yearsExperience: trainerDto.yearsExperience,
        remoteAvailable: trainerDto.remoteAvailable ?? true,
        acceptsInGym: trainerDto.acceptsInGym ?? true,
        baseCity: trainerDto.baseCity,
        baseCountry: trainerDto.baseCountry,
        sessionPriceMin: trainerDto.sessionPriceMin,
        sessionPriceMax: trainerDto.sessionPriceMax,
        currency: trainerDto.currency ?? 'USD',
        instagramHandle: trainerDto.instagramHandle,
        whatsappNumber: trainerDto.whatsappNumber,
      },
    });

    // Handle specialties
    if (trainerDto.specialties && trainerDto.specialties.length > 0) {
      await this.prisma.trainerSpecialty.deleteMany({
        where: { trainerId: trainerProfile.id },
      });

      await this.prisma.trainerSpecialty.createMany({
        data: trainerDto.specialties.map((specialty) => ({
          trainerId: trainerProfile.id,
          specialty,
        })),
      });
    }

    return this.findById(userId);
  }
}
