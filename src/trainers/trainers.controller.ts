import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { TrainersService } from './trainers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../auth/decorators/current-user.decorator';

@Controller('trainers')
export class TrainersController {
  constructor(private readonly trainersService: TrainersService) {}

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

  // Public - trainer profile view
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.trainersService.findById(id);
  }

  // Protected - only authenticated trainers can see their clients
  @UseGuards(JwtAuthGuard)
  @Get(':id/clients')
  async getClients(@Param('id') id: string) {
    return this.trainersService.getTrainerClients(id);
  }
}
