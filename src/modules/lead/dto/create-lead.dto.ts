import {
  IsEmail,
  IsOptional,
  IsString,
  IsNumber,
  IsUrl,
  IsEnum,
  Min,
  IsPhoneNumber,
} from 'class-validator';
import { LeadStatus } from '../../../generated/prisma/enums';

export class CreateLeadDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsEmail({}, { message: 'O e-mail fornecido é inválido' })
  email?: string;

  @IsOptional()
  @IsPhoneNumber('BR')
  phone?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsString()
  source?: string;

  // Google Maps Leads
  @IsOptional()
  @IsNumber()
  totalScore?: number;

  @IsOptional()
  @IsNumber()
  reviewsCount?: number;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsString()
  categoryName?: string;

  @IsOptional()
  @IsUrl({}, { message: 'O website fornecido é inválido' })
  website?: string;

  @IsOptional()
  @IsString()
  googlePlaceId?: string;
}
