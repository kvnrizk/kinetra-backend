import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LoggingService } from './logging.service';
import { CompleteSessionDto } from './dto/complete-session.dto';
import { StartSessionDto } from './dto/start-session.dto';
import { AuthenticatedRequest } from '../auth/types/jwt-payload';

@Controller('logging')
@UseGuards(JwtAuthGuard)
export class LoggingController {
  constructor(private loggingService: LoggingService) {}

  // Start a new workout session
  @Post('sessions/start')
  startSession(
    @Request() req: AuthenticatedRequest,
    @Body() dto: StartSessionDto,
  ) {
    return this.loggingService.startSession(req.user.userId, dto);
  }

  // Complete a workout session with all logs
  @Post('sessions/complete')
  completeSession(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CompleteSessionDto,
  ) {
    return this.loggingService.completeSession(req.user.userId, dto);
  }

  // Get current active session (if any)
  @Get('sessions/active')
  getActiveSession(@Request() req: AuthenticatedRequest) {
    return this.loggingService.getActiveSession(req.user.userId);
  }

  // Get workout history
  @Get('sessions/history')
  getSessionHistory(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.loggingService.getSessionHistory(
      req.user.userId,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  // Get a specific session
  @Get('sessions/:id')
  getSession(
    @Request() req: AuthenticatedRequest,
    @Param('id') sessionId: string,
  ) {
    return this.loggingService.getSession(req.user.userId, sessionId);
  }

  // Update session (save progress mid-workout)
  @Patch('sessions/:id')
  updateSession(
    @Request() req: AuthenticatedRequest,
    @Param('id') sessionId: string,
    @Body() dto: Partial<CompleteSessionDto>,
  ) {
    return this.loggingService.updateSession(req.user.userId, sessionId, dto);
  }

  // Mark session as complete
  @Patch('sessions/:id/complete')
  markComplete(
    @Request() req: AuthenticatedRequest,
    @Param('id') sessionId: string,
  ) {
    return this.loggingService.markComplete(req.user.userId, sessionId);
  }

  // Get pain-flagged sessions (for trainers)
  @Get('trainer/pain-flags')
  getPainFlaggedSessions(@Request() req: AuthenticatedRequest) {
    return this.loggingService.getPainFlaggedSessions(req.user.userId);
  }
}
