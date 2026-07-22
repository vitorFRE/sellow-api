import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IntegrationSyncService } from './integration-sync.service';

@Injectable()
export class IntegrationSyncCron {
  private readonly logger = new Logger(IntegrationSyncCron.name);
  private running = false;

  constructor(private readonly syncService: IntegrationSyncService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron(): Promise<void> {
    if (this.running) {
      this.logger.debug('Sync já em andamento, pulando tick');
      return;
    }

    this.running = true;
    try {
      await this.syncService.syncPendingRuns();
    } catch (error) {
      this.logger.error(
        'Erro no cron de sync de integrations',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.running = false;
    }
  }
}
