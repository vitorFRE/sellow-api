import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEmail({}, { message: 'O e-mail fornecido é inválido' })
  email?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsPhoneNumber('BR')
  phone?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsNumber()
  @Min(0)
  budget?: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  source?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  city?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  state?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUrl()
  url?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUrl({}, { message: 'O website fornecido é inválido' })
  website?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUrl({}, { message: 'O Instagram fornecido é inválido' })
  instagram?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUrl({}, { message: 'O Facebook fornecido é inválido' })
  facebook?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  categoryName?: string | null;
}
