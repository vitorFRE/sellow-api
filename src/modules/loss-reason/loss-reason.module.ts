import { Module } from '@nestjs/common';
import { PrismaModule } from 'modules/prisma/prisma.module';
import { LossReasonService } from './loss-reason.service';
import { LossReasonController } from './loss-reason.controller';

@Module({
  imports: [PrismaModule],
  controllers: [LossReasonController],
  providers: [LossReasonService],
  exports: [LossReasonService],
})
export class LossReasonModule {}
