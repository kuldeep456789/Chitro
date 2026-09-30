import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class SendConnectionRequestDto {
  @IsUUID()
  @IsNotEmpty()
  recipientId: string;
}

export class ConnectionQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  limit?: number;
}
