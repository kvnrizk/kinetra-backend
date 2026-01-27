import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ProgramsService } from './programs.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/types/jwt-payload';

@Controller('programs')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  /**
   * Create a new plan - Only trainers can create plans
   * POST /api/programs
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreatePlanDto,
  ) {
    // Ensure only trainers can create plans
    if (req.user.role !== 'TRAINER' && req.user.role !== 'BOTH') {
      throw new ForbiddenException('Only trainers can create plans');
    }
    return this.programsService.createPlan(req.user.userId, dto);
  }

  /**
   * Update an existing plan
   * PUT /api/programs/:id
   */
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdatePlanDto,
  ) {
    if (req.user.role !== 'TRAINER' && req.user.role !== 'BOTH') {
      throw new ForbiddenException('Only trainers can update plans');
    }
    return this.programsService.updatePlan(id, req.user.userId, dto);
  }

  /**
   * Delete a plan
   * DELETE /api/programs/:id
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    if (req.user.role !== 'TRAINER' && req.user.role !== 'BOTH') {
      throw new ForbiddenException('Only trainers can delete plans');
    }
    return this.programsService.deletePlan(id, req.user.userId);
  }

  /**
   * Get plans for the current user (trainer sees their plans, client sees assigned plans)
   * GET /api/programs/me
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyPlans(@Request() req: AuthenticatedRequest) {
    if (req.user.role === 'TRAINER' || req.user.role === 'BOTH') {
      return this.programsService.getPlansForTrainer(req.user.userId);
    }
    // For clients, we need to find their client profile first
    return this.programsService.findAll();
  }

  /**
   * Get plans for a specific client
   * GET /api/programs/client/:clientId
   */
  @UseGuards(JwtAuthGuard)
  @Get('client/:clientId')
  async getForClient(@Param('clientId') clientId: string) {
    return this.programsService.getPlansForClient(clientId);
  }

  /**
   * Get all plans with optional filters
   * GET /api/programs
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Query('trainerId') trainerId?: string,
    @Query('isTemplate') isTemplate?: string,
  ) {
    return this.programsService.findAll({
      trainerId,
      isTemplate: isTemplate === 'true' ? true : undefined,
    });
  }

  /**
   * Get a single plan by ID
   * GET /api/programs/:id
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.programsService.findById(id);
  }
}
