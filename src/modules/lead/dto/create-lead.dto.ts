import {
  IsEmail,
  IsOptional,
  IsString,
  IsNumber,
  IsUrl,
  IsEnum,
  Min,
  Max,
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
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

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
  @IsUrl({}, { message: 'O Instagram fornecido é inválido' })
  instagram?: string;

  @IsOptional()
  @IsUrl({}, { message: 'O Facebook fornecido é inválido' })
  facebook?: string;

  @IsOptional()
  @IsString()
  googlePlaceId?: string;
}
