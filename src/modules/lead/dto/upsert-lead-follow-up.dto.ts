import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  LEAD_FOLLOW_UP_CHANNELS,
  LeadFollowUpChannel,
} from '../constants/lead-follow-up-channels';

export class UpsertLeadFollowUpDto {
  @IsDateString()
  nextContactAt!: string;

  @IsIn(LEAD_FOLLOW_UP_CHANNELS)
  channel!: LeadFollowUpChannel;

  @IsString()
  @MaxLength(500)
  ownerLabel!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reminder?: string;
}
