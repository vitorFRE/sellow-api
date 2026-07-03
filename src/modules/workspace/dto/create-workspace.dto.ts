import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateWorkspaceDto {
  @IsString()
  @MinLength(1, { message: 'Nome do workspace é obrigatório' })
  name: string;

  @IsOptional()
  @IsString()
  ownerUserId?: string;
}
