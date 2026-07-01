import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { LeadStatus } from 'generated/prisma/enums';

export class UpdateLeadStatusDto {
  @IsEnum(LeadStatus)
  status!: LeadStatus;

  @IsOptional()
  @IsUUID()
  lossReasonId?: string;

  @IsOptional()
  @IsString()
  lossReasonNote?: string;
}
