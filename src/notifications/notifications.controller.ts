import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/types/jwt-payload';

class RegisterTokenDto {
  token: string;
  platform: string;
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Register device token for push notifications
  @Post('register-token')
  registerToken(
    @Request() req: AuthenticatedRequest,
    @Body() dto: RegisterTokenDto,
  ) {
    return this.notificationsService.registerDeviceToken(
      req.user.userId,
      dto.token,
      dto.platform,
    );
  }

  // Remove device token (on logout)
  @Post('unregister-token')
  unregisterToken(@Body() dto: { token: string }) {
    return this.notificationsService.removeDeviceToken(dto.token);
  }

  // Get all notifications for current user
  @Get()
  getNotifications(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.notificationsService.getNotifications(
      req.user.userId,
      limit ? parseInt(limit) : 20,
      offset ? parseInt(offset) : 0,
    );
  }

  // Get unread notification count
  @Get('unread-count')
  getUnreadCount(@Request() req: AuthenticatedRequest) {
    return this.notificationsService.getUnreadCount(req.user.userId);
  }

  // Mark a specific notification as read
  @Post(':id/read')
  markAsRead(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(id, req.user.userId);
  }

  // Mark all notifications as read
  @Post('read-all')
  markAllAsRead(@Request() req: AuthenticatedRequest) {
    return this.notificationsService.markAllAsRead(req.user.userId);
  }
}
