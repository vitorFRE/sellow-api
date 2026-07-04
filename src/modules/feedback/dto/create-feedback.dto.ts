import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { FeedbackType } from '../../../generated/prisma/enums';

export class CreateFeedbackDto {
  @IsEnum(FeedbackType)
  type!: FeedbackType;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message!: string;
}
