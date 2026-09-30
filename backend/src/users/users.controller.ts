import { Controller, Get, Patch, Query, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  async search(@Query('q') query: string, @CurrentUser() user: any) {
    return this.usersService.searchUsers(query, user.id);
  }

  @Get('me')
  async me(@CurrentUser() user: any) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  async updateMe(@Body() body: { displayName?: string; bio?: string }, @CurrentUser() user: any) {
    return this.usersService.updateProfile(user.id, body);
  }
}
