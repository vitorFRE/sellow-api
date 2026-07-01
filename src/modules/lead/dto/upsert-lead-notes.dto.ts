import { IsString, MaxLength } from 'class-validator';

export class UpsertLeadNotesDto {
  @IsString()
  @MaxLength(8000)
  body!: string;
}
