import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { SendConnectionRequestDto } from './dto/connection.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ChatGateway } from '../gateway/chat.gateway';

@UseGuards(JwtAuthGuard)
@Controller('connections')
export class ConnectionsController {
  constructor(
    private readonly connectionsService: ConnectionsService,
    private readonly chatGateway: ChatGateway,
  ) {}

  /**
   * POST /api/v1/connections/request
   * Send a connection request (or auto-accept reciprocal pending).
   */
  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  async sendRequest(
    @Body() dto: SendConnectionRequestDto,
    @CurrentUser() user: any,
  ) {
    const result = await this.connectionsService.sendRequest(user.id, dto.recipientId);

    if (result.autoAccepted) {
      // Both users get notified of the auto-acceptance
      this.chatGateway.notifyConnectionAccepted(
        result.connection.requesterId,
        result.connection.recipientId,
        result.connection,
      );
    } else {
      // Notify the recipient of the new request
      this.chatGateway.notifyConnectionRequest(
        dto.recipientId,
        result.connection,
      );
    }

    return result;
  }

  /**
   * GET /api/v1/connections
   * List all accepted connections for current user.
   */
  @Get()
  async getConnections(@CurrentUser() user: any) {
    return this.connectionsService.getConnections(user.id);
  }

  /**
   * GET /api/v1/connections/pending
   * List pending requests received by current user.
   */
  @Get('pending')
  async getPendingReceived(@CurrentUser() user: any) {
    return this.connectionsService.getPendingReceived(user.id);
  }

  /**
   * GET /api/v1/connections/sent
   * List pending requests sent by current user.
   */
  @Get('sent')
  async getPendingSent(@CurrentUser() user: any) {
    return this.connectionsService.getPendingSent(user.id);
  }

  /**
   * GET /api/v1/connections/status/:userId
   * Get connection status between current user and target user.
   */
  @Get('status/:userId')
  async getConnectionStatus(
    @Param('userId') targetUserId: string,
    @CurrentUser() user: any,
  ) {
    return this.connectionsService.getConnectionStatus(user.id, targetUserId);
  }

  /**
   * PATCH /api/v1/connections/:id/accept
   * Accept a pending connection request (recipient only).
   */
  @Patch(':id/accept')
  async acceptRequest(
    @Param('id') connectionId: string,
    @CurrentUser() user: any,
  ) {
    const accepted = await this.connectionsService.acceptRequest(connectionId, user.id);

    this.chatGateway.notifyConnectionAccepted(
      accepted.requesterId,
      accepted.recipientId,
      accepted,
    );

    return accepted;
  }

  /**
   * PATCH /api/v1/connections/:id/reject
   * Reject a pending connection request (recipient only).
   */
  @Patch(':id/reject')
  async rejectRequest(
    @Param('id') connectionId: string,
    @CurrentUser() user: any,
  ) {
    return this.connectionsService.rejectRequest(connectionId, user.id);
  }

  /**
   * DELETE /api/v1/connections/:id
   * Cancel a pending request (requester) or remove accepted connection (either party).
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async removeConnection(
    @Param('id') connectionId: string,
    @CurrentUser() user: any,
  ) {
    return this.connectionsService.removeConnection(connectionId, user.id);
  }
}
