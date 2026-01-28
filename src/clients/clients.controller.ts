import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/types/jwt-payload';
import { CurrentUser, JwtUser } from '../auth/decorators/current-user.decorator';
import { UpdateClientProfileDto } from './dto/update-client-profile.dto';
import { CreateMeasurementDto } from './dto/create-measurement.dto';

@Controller('clients')
@UseGuards(JwtAuthGuard) // All client routes require authentication
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateClientProfileDto,
  ) {
    return this.clientsService.upsertClientProfile(user.userId, dto);
  }

  @Post('measurements')
  async addMeasurement(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateMeasurementDto,
  ) {
    return this.clientsService.createMeasurement(user.userId, dto);
  }

  // Get current user's measurements
  // NOTE: Must be before :id route
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

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.clientsService.findById(id);
  }

  @Get(':id/trainers')
  async getTrainers(@Param('id') id: string) {
    return this.clientsService.getClientTrainers(id);
  }

  // Add measurement for current user
  @Post('me/measurements')
  async addMyMeasurement(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateMeasurementDto,
  ) {
    return this.clientsService.addBodyMeasurement(req.user.userId, dto);
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
  async addUserMeasurement(
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
