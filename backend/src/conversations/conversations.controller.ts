import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import {
  CreateDirectConversationDto,
  CreateGroupConversationDto,
  AddMembersDto,
  UpdateConversationDto,
} from './dto/create-conversation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  async getMyConversations(@CurrentUser() user: any) {
    return this.conversationsService.getUserConversations(user.id);
  }

  @Post('direct')
  @HttpCode(HttpStatus.OK)
  async getOrCreateDirect(
    @Body() dto: CreateDirectConversationDto,
    @CurrentUser() user: any,
  ) {
    return this.conversationsService.getOrCreateDirectConversation(user.id, dto.targetUserId);
  }

  @Post('groups')
  @HttpCode(HttpStatus.CREATED)
  async createGroup(
    @Body() dto: CreateGroupConversationDto,
    @CurrentUser() user: any,
  ) {
    return this.conversationsService.createGroupConversation(
      user.id,
      dto.name,
      dto.description,
      dto.memberIds,
      dto.avatarUrl,
    );
  }

  @Get(':id')
  async getConversationDetails(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.conversationsService.getConversationById(id, user.id);
  }

  @Patch(':id')
  async updateGroup(
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
    @CurrentUser() user: any,
  ) {
    return this.conversationsService.updateGroup(id, user.id, dto);
  }

  @Put(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Param('id') id: string,
    @Body() body: { messageId?: string },
    @CurrentUser() user: any,
  ) {
    return this.conversationsService.markAsRead(id, user.id, body?.messageId);
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.OK)
  async addMembers(
    @Param('id') id: string,
    @Body() dto: AddMembersDto,
    @CurrentUser() user: any,
  ) {
    return this.conversationsService.addMembers(id, user.id, dto.memberIds);
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.OK)
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: any,
  ) {
    return this.conversationsService.removeMember(id, user.id, memberId);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  async leaveGroup(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.conversationsService.leaveGroup(id, user.id);
  }

  @Get(':id/messages')
  async getMessages(
    @Param('id') id: string,
    @Query('limit') limit: string,
    @Query('before') before: string,
    @CurrentUser() user: any,
  ) {
    return this.conversationsService.getMessages(id, user.id, Number(limit) || 30, before);
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Param('id') id: string,
    @Body() body: { text: string; clientMessageId?: string },
    @CurrentUser() user: any,
  ) {
    return this.conversationsService.saveMessage({
      conversationId: id,
      senderId: user.id,
      text: body.text,
      clientMessageId: body.clientMessageId,
    });
  }
}
