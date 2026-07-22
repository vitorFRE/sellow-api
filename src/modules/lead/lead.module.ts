import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LeadService } from './lead.service';
import { LeadImportService } from './lead-import.service';
import { LeadsController } from './lead.controller';

@Module({
  imports: [PrismaModule],
  controllers: [LeadsController],
  providers: [LeadService, LeadImportService],
  exports: [LeadService, LeadImportService],
})
export class LeadModule {}
