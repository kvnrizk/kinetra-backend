import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if user already exists
    const userExists = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (userExists) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user with profiles included (will be null for new user)
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        password: hashedPassword,
      },
      include: {
        clientProfile: true,
        trainerProfile: true,
      },
    });

    return this.generateToken(user);
  }

  async login(dto: LoginDto) {
    // Find user with profiles
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        clientProfile: true,
        trainerProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Compare password
    const isMatch = await bcrypt.compare(dto.password, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateToken(user);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        avatarUrl: true,
        phoneCountry: true,
        phoneNumber: true,
        country: true,
        city: true,
        dateOfBirth: true,
        gender: true,
        createdAt: true,
        clientProfile: true,
        trainerProfile: {
          include: {
            specialties: true,
          },
        },
      },
    });

    return user;
  }

  private generateToken(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };

    // Determine if onboarding is complete based on role
    const hasCompletedOnboarding = this.checkOnboardingComplete(user);

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        hasCompletedOnboarding,
        hasClientProfile: !!user.clientProfile,
        hasTrainerProfile: !!user.trainerProfile,
      },
    };
  }

  private checkOnboardingComplete(user: any): boolean {
    // Admin users don't need onboarding
    if (user.role === 'ADMIN') {
      return true;
    }

    // Clients need a client profile
    if (user.role === 'CLIENT') {
      return !!user.clientProfile;
    }

    // Trainers need a trainer profile
    if (user.role === 'TRAINER') {
      return !!user.trainerProfile;
    }

    // BOTH role needs both profiles
    if (user.role === 'BOTH') {
      return !!user.clientProfile && !!user.trainerProfile;
    }

    // Default: check if fullName exists (basic info)
    return !!user.fullName;
  }
}
