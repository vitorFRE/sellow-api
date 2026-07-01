import { IsOptional, IsString } from 'class-validator';

export class CreateLossReasonDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
