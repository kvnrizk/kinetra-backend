import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { ClientSetupDto } from './dto/client-setup.dto';
import { TrainerSetupDto } from './dto/trainer-setup.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/types/jwt-payload';
import { CurrentUser, JwtUser } from '../auth/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: AuthenticatedRequest) {
    return this.usersService.findById(req.user.userId);
  }

  @Patch('role')
  @UseGuards(JwtAuthGuard)
  async updateRole(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.usersService.setUserRole(user.userId, dto.role);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateMe(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateUser(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('onboarding/client')
  @HttpCode(HttpStatus.OK)
  async setupClientFromToken(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ClientSetupDto,
  ) {
    // Uses userId from JWT token
    return this.usersService.setupClientProfile(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('onboarding/trainer')
  @HttpCode(HttpStatus.OK)
  async setupTrainerFromToken(
    @Request() req: AuthenticatedRequest,
    @Body() dto: TrainerSetupDto,
  ) {
    // Uses userId from JWT token
    return this.usersService.setupTrainerProfile(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('onboarding/both')
  @HttpCode(HttpStatus.OK)
  async setupBothFromToken(
    @Request() req: AuthenticatedRequest,
    @Body() body: { client: ClientSetupDto; trainer: TrainerSetupDto },
  ) {
    return this.usersService.setupBothProfiles(
      req.user.userId,
      body.client,
      body.trainer,
    );
  }

  // Legacy routes with explicit ID (can be removed later)
  @UseGuards(JwtAuthGuard)
  @Post(':id/setup/client')
  @HttpCode(HttpStatus.OK)
  async setupClient(@Param('id') id: string, @Body() dto: ClientSetupDto) {
    return this.usersService.setupClientProfile(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/setup/trainer')
  @HttpCode(HttpStatus.OK)
  async setupTrainer(@Param('id') id: string, @Body() dto: TrainerSetupDto) {
    return this.usersService.setupTrainerProfile(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/setup/both')
  @HttpCode(HttpStatus.OK)
  async setupBoth(
    @Param('id') id: string,
    @Body() body: { client: ClientSetupDto; trainer: TrainerSetupDto },
  ) {
    return this.usersService.setupBothProfiles(id, body.client, body.trainer);
  }
}
