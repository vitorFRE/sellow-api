import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class ImportGoogleMapsLeadItemDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsNumber()
  totalScore?: number;

  @IsOptional()
  @IsNumber()
  reviewsCount?: number;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsString()
  categoryName?: string;

  @IsOptional()
  @IsString()
  url?: string;
}
