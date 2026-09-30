import { Module, forwardRef } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ConversationsModule } from '../conversations/conversations.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => ConversationsModule), AuthModule],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class GatewayModule {}
