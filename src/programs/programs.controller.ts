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
import { CreatePlanDto, CreatePlanWithWeeksDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import {
  CreateWorkoutDto,
  CreateWorkoutExerciseDto,
  AddWorkoutToWeekDto,
} from './dto/create-workout.dto';
import { AssignPlanDto } from './dto/assign-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/types/jwt-payload';
import { CurrentUser, JwtUser } from '../auth/decorators/current-user.decorator';

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
   * Get current user's active plan (for clients)
   * GET /api/programs/my-plan
   * NOTE: Must be before :id route to avoid matching "my-plan" as an ID
   */
  @Get('my-plan')
  @UseGuards(JwtAuthGuard)
  async getMyPlan(@CurrentUser() user: JwtUser) {
    return this.programsService.getClientCurrentPlan(user.userId);
  }

  /**
   * Get current user's plan history (for clients)
   * GET /api/programs/plan-history
   * NOTE: Must be before :id route
   */
  @Get('plan-history')
  @UseGuards(JwtAuthGuard)
  async getPlanHistory(@CurrentUser() user: JwtUser) {
    return this.programsService.getClientPlanHistory(user.userId);
  }

  /**
   * Get current user's plan progress (for clients)
   * GET /api/programs/my-plan/progress
   * Returns completed workout IDs and overall progress percentage
   */
  @Get('my-plan/progress')
  @UseGuards(JwtAuthGuard)
  async getMyPlanProgress(@CurrentUser() user: JwtUser) {
    return this.programsService.getClientPlanProgress(user.userId);
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

  // =============================================
  // TASK 7: Plan with Weeks Endpoints
  // =============================================

  /**
   * Get all plans with weeks for current trainer
   * GET /api/programs/plans
   * NOTE: Must be before :id route
   */
  @Get('plans')
  @UseGuards(JwtAuthGuard)
  async getTrainerPlansWithWeeks(@CurrentUser() user: JwtUser) {
    return this.programsService.getTrainerPlansWithWeeks(user.userId);
  }

  /**
   * Get a plan with all weeks and workouts
   * GET /api/programs/plans/:id
   */
  @Get('plans/:id')
  @UseGuards(JwtAuthGuard)
  async getPlanWithWeeks(@Param('id') planId: string) {
    return this.programsService.getPlanWithWeeks(planId);
  }

  /**
   * Get all exercises (for picker in mobile app)
   * GET /api/programs/exercises
   * NOTE: Must be before :id route
   */
  @Get('exercises')
  @UseGuards(JwtAuthGuard)
  async getExercises(@Query('search') search?: string) {
    return this.programsService.getAllExercises(search);
  }

  /**
   * Get workout with exercises
   * GET /api/programs/workouts/:id
   */
  @Get('workouts/:id')
  @UseGuards(JwtAuthGuard)
  async getWorkout(@Param('id') workoutId: string) {
    return this.programsService.getWorkoutWithExercises(workoutId);
  }

  /**
   * Get plan week with all workouts
   * GET /api/programs/plan-weeks/:id
   */
  @Get('plan-weeks/:id')
  @UseGuards(JwtAuthGuard)
  async getPlanWeek(@Param('id') planWeekId: string) {
    return this.programsService.getPlanWeekWithWorkouts(planWeekId);
  }

  /**
   * Get a single plan by ID
   * GET /api/programs/:id
   * NOTE: Wildcard route - must be LAST among GET routes
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.programsService.findById(id);
  }

  /**
   * Create a new plan with auto-generated weeks
   * POST /api/programs/plans
   */
  @Post('plans')
  @UseGuards(JwtAuthGuard)
  async createPlanWithWeeks(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreatePlanWithWeeksDto,
  ) {
    if (user.role !== 'TRAINER' && user.role !== 'BOTH') {
      throw new ForbiddenException('Only trainers can create plans');
    }
    return this.programsService.createPlanWithWeeks(user.userId, dto);
  }

  /**
   * Delete a plan
   * DELETE /api/programs/plans/:id
   */
  @Delete('plans/:id')
  @UseGuards(JwtAuthGuard)
  async deletePlanById(
    @Param('id') planId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (req.user.role !== 'TRAINER' && req.user.role !== 'BOTH') {
      throw new ForbiddenException('Only trainers can delete plans');
    }
    return this.programsService.deletePlan(planId, req.user.userId);
  }

  // =============================================
  // TASK 8: Workout + Exercise Endpoints
  // =============================================

  /**
   * Create a new workout
   * POST /api/programs/workouts
   */
  @Post('workouts')
  @UseGuards(JwtAuthGuard)
  async createWorkout(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateWorkoutDto,
  ) {
    if (user.role !== 'TRAINER' && user.role !== 'BOTH') {
      throw new ForbiddenException('Only trainers can create workouts');
    }
    return this.programsService.createWorkout(user.userId, dto);
  }

  /**
   * Add exercise to a workout
   * POST /api/programs/workouts/:workoutId/exercises
   */
  @Post('workouts/:workoutId/exercises')
  @UseGuards(JwtAuthGuard)
  async addExerciseToWorkout(
    @Param('workoutId') workoutId: string,
    @Body() dto: CreateWorkoutExerciseDto,
  ) {
    return this.programsService.addExerciseToWorkout(workoutId, dto);
  }

  /**
   * Delete a workout
   * DELETE /api/programs/workouts/:id
   */
  @Delete('workouts/:id')
  @UseGuards(JwtAuthGuard)
  async deleteWorkout(
    @Param('id') workoutId: string,
    @CurrentUser() user: JwtUser,
  ) {
    if (user.role !== 'TRAINER' && user.role !== 'BOTH') {
      throw new ForbiddenException('Only trainers can delete workouts');
    }
    return this.programsService.deleteWorkout(workoutId, user.userId);
  }

  /**
   * Delete an exercise from a workout
   * DELETE /api/programs/exercises/:id
   */
  @Delete('exercises/:id')
  @UseGuards(JwtAuthGuard)
  async deleteExercise(
    @Param('id') exerciseId: string,
    @CurrentUser() user: JwtUser,
  ) {
    if (user.role !== 'TRAINER' && user.role !== 'BOTH') {
      throw new ForbiddenException('Only trainers can delete exercises');
    }
    return this.programsService.deleteWorkoutExercise(exerciseId, user.userId);
  }

  /**
   * Add workout to a plan week
   * POST /api/programs/plan-weeks/:weekId/workouts
   */
  @Post('plan-weeks/:weekId/workouts')
  @UseGuards(JwtAuthGuard)
  async addWorkoutToWeek(
    @Param('weekId') planWeekId: string,
    @Body() dto: AddWorkoutToWeekDto,
  ) {
    return this.programsService.addWorkoutToWeek(planWeekId, dto);
  }

  // =============================================
  // TASK 10: Plan Assignment Endpoints
  // =============================================

  /**
   * Assign a plan to a client
   * POST /api/programs/assign
   */
  @Post('assign')
  @UseGuards(JwtAuthGuard)
  async assignPlan(
    @CurrentUser() user: JwtUser,
    @Body() dto: AssignPlanDto,
  ) {
    if (user.role !== 'TRAINER' && user.role !== 'BOTH') {
      throw new ForbiddenException('Only trainers can assign plans');
    }
    return this.programsService.assignPlanToClient(user.userId, dto);
  }
}
