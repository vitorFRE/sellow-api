import { Module } from '@nestjs/common';
import { LeadModule } from '../lead/lead.module';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [LeadModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
