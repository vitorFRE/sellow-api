import { Injectable, Logger } from '@nestjs/common';
import {
  IntegrationProvider as IntegrationProviderEnum,
  IntegrationRunStatus,
  IntegrationType,
} from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import {
  DATASET_PAGE_SIZE,
  TERMINAL_RUN_STATUSES,
} from './constants/integration.constants';
import { GoogleMapsLeadsHandler } from './handlers/google-maps-leads.handler';
import { ApifyProvider } from './providers/apify/apify.provider';
import { ProviderRunInfo } from './providers/integration-provider';

@Injectable()
export class IntegrationSyncService {
  private readonly logger = new Logger(IntegrationSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly apifyProvider: ApifyProvider,
    private readonly googleMapsHandler: GoogleMapsLeadsHandler,
  ) {}

  async syncPendingRuns(): Promise<void> {
    const runs = await this.prisma.integrationRun.findMany({
      where: {
        status: {
          in: [IntegrationRunStatus.PENDING, IntegrationRunStatus.RUNNING],
        },
        externalRunId: { not: null },
      },
      select: { id: true },
      take: 50,
    });

    for (const run of runs) {
      try {
        await this.syncRun(run.id);
      } catch (error) {
        this.logger.warn(
          `Falha ao sincronizar run ${run.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  async syncRunByExternalId(externalRunId: string): Promise<void> {
    const run = await this.prisma.integrationRun.findFirst({
      where: {
        provider: IntegrationProviderEnum.APIFY,
        externalRunId,
      },
      select: { id: true },
    });

    if (!run) {
      this.logger.warn(`Webhook para run desconhecida: ${externalRunId}`);
      return;
    }

    await this.syncRun(run.id);
  }

  async syncRun(runId: string): Promise<void> {
    const run = await this.prisma.integrationRun.findUnique({
      where: { id: runId },
    });

    if (!run) return;

    if (
      TERMINAL_RUN_STATUSES.includes(
        run.status as (typeof TERMINAL_RUN_STATUSES)[number],
      )
    ) {
      return;
    }

    if (run.status === IntegrationRunStatus.IMPORTING) {
      return;
    }

    if (!run.externalRunId) {
      return;
    }

    const external = await this.apifyProvider.getRun(run.externalRunId);

    await this.prisma.integrationRun.update({
      where: { id: run.id },
      data: {
        datasetId: external.defaultDatasetId ?? run.datasetId,
        startedAt: external.startedAt
          ? new Date(external.startedAt)
          : run.startedAt,
        finishedAt: external.finishedAt
          ? new Date(external.finishedAt)
          : undefined,
      },
    });

    const providerStatus = external.status.toUpperCase();

    if (providerStatus === 'READY' || providerStatus === 'RUNNING') {
      if (run.status !== IntegrationRunStatus.RUNNING) {
        await this.prisma.integrationRun.update({
          where: { id: run.id },
          data: { status: IntegrationRunStatus.RUNNING },
        });
      }
      return;
    }

    if (
      providerStatus === 'FAILED' ||
      providerStatus === 'ABORTED' ||
      providerStatus === 'TIMED_OUT'
    ) {
      await this.markProviderFailure(run.id, providerStatus, external);
      return;
    }

    if (providerStatus === 'SUCCEEDED') {
      await this.handleSucceeded(run.id, run.workspaceId, run.type, external);
    }
  }

  private async markProviderFailure(
    runId: string,
    providerStatus: string,
    external: ProviderRunInfo,
  ): Promise<void> {
    const statusMap: Record<string, IntegrationRunStatus> = {
      FAILED: IntegrationRunStatus.FAILED,
      ABORTED: IntegrationRunStatus.ABORTED,
      TIMED_OUT: IntegrationRunStatus.TIMED_OUT,
    };

    await this.prisma.integrationRun.updateMany({
      where: {
        id: runId,
        status: {
          in: [IntegrationRunStatus.PENDING, IntegrationRunStatus.RUNNING],
        },
      },
      data: {
        status: statusMap[providerStatus] ?? IntegrationRunStatus.FAILED,
        errorMessage: external.statusMessage ?? `Apify status: ${providerStatus}`,
        finishedAt: external.finishedAt
          ? new Date(external.finishedAt)
          : new Date(),
        datasetId: external.defaultDatasetId ?? undefined,
      },
    });
  }

  private async handleSucceeded(
    runId: string,
    workspaceId: string,
    type: IntegrationType,
    external: ProviderRunInfo,
  ): Promise<void> {
    const claimed = await this.prisma.integrationRun.updateMany({
      where: {
        id: runId,
        status: {
          in: [IntegrationRunStatus.PENDING, IntegrationRunStatus.RUNNING],
        },
      },
      data: {
        status: IntegrationRunStatus.IMPORTING,
        datasetId: external.defaultDatasetId ?? undefined,
        finishedAt: external.finishedAt
          ? new Date(external.finishedAt)
          : undefined,
      },
    });

    if (claimed.count === 0) {
      return;
    }

    const datasetId = external.defaultDatasetId;
    if (!datasetId) {
      await this.prisma.integrationRun.update({
        where: { id: runId },
        data: {
          status: IntegrationRunStatus.FAILED,
          errorMessage: 'Run succeeded sem defaultDatasetId',
          finishedAt: new Date(),
        },
      });
      return;
    }

    try {
      const items = await this.fetchAllItems(datasetId);

      if (type !== IntegrationType.GOOGLE_MAPS_LEADS) {
        await this.prisma.integrationRun.update({
          where: { id: runId },
          data: {
            status: IntegrationRunStatus.FAILED,
            errorMessage: `Tipo de integração não suportado: ${type}`,
            finishedAt: new Date(),
          },
        });
        return;
      }

      const summary = await this.googleMapsHandler.importDatasetItems(
        workspaceId,
        items,
      );

      const status =
        summary.failed > 0
          ? IntegrationRunStatus.COMPLETED_WITH_ERRORS
          : IntegrationRunStatus.COMPLETED;

      await this.prisma.integrationRun.update({
        where: { id: runId },
        data: {
          status,
          importSummary: summary,
          finishedAt: new Date(),
          errorMessage: null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Import falhou para run ${runId}`,
        error instanceof Error ? error.stack : String(error),
      );
      await this.prisma.integrationRun.update({
        where: { id: runId },
        data: {
          status: IntegrationRunStatus.FAILED,
          errorMessage:
            error instanceof Error ? error.message : 'Falha no import',
          finishedAt: new Date(),
        },
      });
    }
  }

  private async fetchAllItems(datasetId: string): Promise<unknown[]> {
    const all: unknown[] = [];
    let offset = 0;

    for (;;) {
      const page = await this.apifyProvider.fetchResultItems(datasetId, {
        limit: DATASET_PAGE_SIZE,
        offset,
      });
      all.push(...page);
      if (page.length < DATASET_PAGE_SIZE) break;
      offset += DATASET_PAGE_SIZE;
    }

    return all;
  }
}
