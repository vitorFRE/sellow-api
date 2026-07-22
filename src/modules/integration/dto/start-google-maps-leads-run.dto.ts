import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  DEFAULT_MAX_RESULTS,
  MAX_RADIUS_METERS,
  MAX_RESULTS_CAP,
  MAX_SEARCH_QUERIES,
  MIN_RADIUS_METERS,
} from '../constants/integration.constants';

export class StartGoogleMapsLeadsRunDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_SEARCH_QUERIES)
  @IsString({ each: true })
  @MinLength(2, { each: true })
  @MaxLength(200, { each: true })
  searchQueries!: string[];

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @Type(() => Number)
  @IsInt()
  @Min(MIN_RADIUS_METERS)
  @Max(MAX_RADIUS_METERS)
  radiusMeters!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_RESULTS_CAP)
  maxResults: number = DEFAULT_MAX_RESULTS;
}
