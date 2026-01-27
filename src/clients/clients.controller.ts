import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/types/jwt-payload';

@Controller('clients')
@UseGuards(JwtAuthGuard) // All client routes require authentication
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.clientsService.findById(id);
  }

  @Get(':id/trainers')
  async getTrainers(@Param('id') id: string) {
    return this.clientsService.getClientTrainers(id);
  }

  // Get current user's measurements
  @Get('me/measurements')
  async getMyMeasurements(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    return this.clientsService.getBodyMeasurements(
      req.user.userId,
      limit ? parseInt(limit) : 10,
    );
  }

  // Add measurement for current user
  @Post('me/measurements')
  async addMyMeasurement(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      weightKg?: number;
      heightCm?: number;
      bodyFatPct?: number;
      chestCm?: number;
      waistCm?: number;
      hipsCm?: number;
      notes?: string;
    },
  ) {
    return this.clientsService.addBodyMeasurement(req.user.userId, body);
  }

  @Get(':userId/measurements')
  async getMeasurements(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.clientsService.getBodyMeasurements(
      userId,
      limit ? parseInt(limit) : 10,
    );
  }

  @Post(':userId/measurements')
  async addMeasurement(
    @Param('userId') userId: string,
    @Body()
    body: {
      weightKg?: number;
      heightCm?: number;
      bodyFatPct?: number;
      chestCm?: number;
      waistCm?: number;
      hipsCm?: number;
      notes?: string;
    },
  ) {
    return this.clientsService.addBodyMeasurement(userId, body);
  }
}
