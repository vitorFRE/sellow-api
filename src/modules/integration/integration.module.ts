import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LeadModule } from '../lead/lead.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ApifyWebhookController } from './apify-webhook.controller';
import { GoogleMapsLeadsController } from './google-maps-leads.controller';
import { GoogleMapsLeadsHandler } from './handlers/google-maps-leads.handler';
import { IntegrationRunController } from './integration-run.controller';
import { IntegrationRunService } from './integration-run.service';
import { IntegrationSyncCron } from './integration-sync.cron';
import { IntegrationSyncService } from './integration-sync.service';
import { ApifyClient } from './providers/apify/apify.client';
import { ApifyProvider } from './providers/apify/apify.provider';
import {
  INTEGRATION_PROVIDER,
} from './providers/integration-provider';

@Module({
  imports: [PrismaModule, LeadModule, ScheduleModule.forRoot()],
  controllers: [
    GoogleMapsLeadsController,
    IntegrationRunController,
    ApifyWebhookController,
  ],
  providers: [
    ApifyClient,
    ApifyProvider,
    { provide: INTEGRATION_PROVIDER, useExisting: ApifyProvider },
    GoogleMapsLeadsHandler,
    IntegrationRunService,
    IntegrationSyncService,
    IntegrationSyncCron,
  ],
  exports: [IntegrationRunService, IntegrationSyncService],
})
export class IntegrationModule {}
