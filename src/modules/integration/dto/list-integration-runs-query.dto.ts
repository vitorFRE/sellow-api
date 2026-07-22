import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  IntegrationRunStatus,
  IntegrationType,
} from '../../../generated/prisma/enums';

export class ListIntegrationRunsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(IntegrationRunStatus)
  status?: IntegrationRunStatus;

  @IsOptional()
  @IsEnum(IntegrationType)
  type?: IntegrationType;
}
