import { Type, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { LeadStatus } from '../../../generated/prisma/enums';

export enum ListLeadsSortBy {
  updatedAt = 'updatedAt',
  totalScore = 'totalScore',
  reviewsCount = 'reviewsCount',
}

export enum ListLeadsSortDir {
  asc = 'asc',
  desc = 'desc',
}

export enum ListLeadsImportReviewFilter {
  POSITIVE = 'POSITIVE',
  NEGATIVE = 'NEGATIVE',
  UNEVALUATED = 'UNEVALUATED',
}

function parseOptionalQueryBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === '') return undefined;
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  if (typeof value === 'string') {
    // Outras strings seguem para `@IsBoolean()` e geram 400
    return value as unknown as boolean;
  }
  return undefined;
}

export class ListLeadsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minTotalScore?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minReviewsCount?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    parseOptionalQueryBoolean(value),
  )
  @IsBoolean()
  hasWebsite?: boolean;

  @IsOptional()
  @IsEnum(ListLeadsImportReviewFilter)
  importReview?: ListLeadsImportReviewFilter;

  @IsOptional()
  @IsEnum(ListLeadsSortBy)
  sortBy?: ListLeadsSortBy;

  @IsOptional()
  @IsEnum(ListLeadsSortDir)
  sortDir?: ListLeadsSortDir;
}

/** Campos de filtro/ordenação usados em `LeadService.findAll` (sem paginação). */
export type LeadListFilters = {
  status?: LeadStatus;
  search?: string;
  minTotalScore?: number;
  minReviewsCount?: number;
  hasWebsite?: boolean;
  importReview?: ListLeadsImportReviewFilter;
  sortBy?: ListLeadsSortBy;
  sortDir?: ListLeadsSortDir;
};
