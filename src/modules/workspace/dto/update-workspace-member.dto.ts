import { IsEnum, IsOptional } from 'class-validator';
import { WorkspaceRole } from '../../../generated/prisma/enums';

export class UpdateWorkspaceMemberDto {
  @IsOptional()
  @IsEnum(WorkspaceRole)
  role?: WorkspaceRole;
}
