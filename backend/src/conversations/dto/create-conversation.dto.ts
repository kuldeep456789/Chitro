import { IsArray, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateDirectConversationDto {
  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}

export class CreateGroupConversationDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  memberIds?: string[];
}

export class AddMembersDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  memberIds: string[];
}

export class UpdateConversationDto {
  @IsString()
  @IsOptional()
  @Length(2, 50)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;
}
