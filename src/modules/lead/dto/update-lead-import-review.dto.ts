import { IsEnum, IsOptional } from 'class-validator';
import { LeadImportReview } from '../../../generated/prisma/enums';

export class UpdateLeadImportReviewDto {
  @IsOptional()
  @IsEnum(LeadImportReview)
  importReview!: LeadImportReview | null;
}
