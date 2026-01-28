import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { TrainersService } from './trainers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../auth/decorators/current-user.decorator';
import { UpdateTrainerProfileDto } from './dto/update-trainer-profile.dto';

@Controller('trainers')
export class TrainersController {
  constructor(private readonly trainersService: TrainersService) {}

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateTrainerProfileDto,
  ) {
    return this.trainersService.upsertTrainerProfile(user.userId, dto);
  }

  // Protected - Trainer Dashboard
  @UseGuards(JwtAuthGuard)
  @Get('dashboard')
  async getDashboard(@CurrentUser() user: JwtUser) {
    if (user.role !== 'TRAINER' && user.role !== 'BOTH') {
      throw new ForbiddenException('Access denied. Trainers only.');
    }
    return this.trainersService.getDashboardStats(user.userId);
  }

  // Public - for trainer discovery
  @Get()
  async findAll(
    @Query('city') city?: string,
    @Query('specialty') specialty?: string,
    @Query('minRating') minRating?: string,
  ) {
    return this.trainersService.findAll({
      city,
      specialty,
      minRating: minRating ? parseFloat(minRating) : undefined,
    });
  }

  // Protected - Get specific client details for trainer
  // MUST be before :id routes to avoid matching "client" as trainer ID
  @UseGuards(JwtAuthGuard)
  @Get('client/:clientId')
  async getClientDetails(
    @Param('clientId') clientId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.trainersService.getClientDetails(user.userId, clientId);
  }

  // Public - trainer profile view
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.trainersService.findById(id);
  }

  // Protected - only authenticated trainers can see their own clients
  @UseGuards(JwtAuthGuard)
  @Get(':id/clients')
  async getClients(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
  ) {
    // Verify the trainer is requesting their own clients
    if (id !== user.userId) {
      throw new ForbiddenException('Cannot view other trainers\' clients');
    }
    return this.trainersService.getTrainerClients(id);
  }
}
