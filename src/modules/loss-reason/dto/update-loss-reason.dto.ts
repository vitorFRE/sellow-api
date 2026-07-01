import { IsOptional, IsString } from 'class-validator';

export class UpdateLossReasonDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
