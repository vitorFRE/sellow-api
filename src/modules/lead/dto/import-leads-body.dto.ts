import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ImportGoogleMapsLeadItemDto } from './import-google-maps-lead-item.dto';

export class ImportLeadsBodyDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ImportGoogleMapsLeadItemDto)
  items!: ImportGoogleMapsLeadItemDto[];
}
