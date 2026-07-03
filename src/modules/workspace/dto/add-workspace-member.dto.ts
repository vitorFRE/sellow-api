import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { WorkspaceRole } from '../../../generated/prisma/enums';

export class AddWorkspaceMemberDto {
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ValidateIf((o: AddWorkspaceMemberDto) => o.password !== undefined)
  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  password?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(WorkspaceRole)
  role?: WorkspaceRole;
}
