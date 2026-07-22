import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IntegrationProvider as IntegrationProviderEnum,
  IntegrationRunStatus,
  IntegrationType,
} from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { ACTIVE_RUN_STATUSES } from './constants/integration.constants';
import { StartGoogleMapsLeadsRunDto } from './dto/start-google-maps-leads-run.dto';
import { ListIntegrationRunsQueryDto } from './dto/list-integration-runs-query.dto';
import { ApifyProvider } from './providers/apify/apify.provider';
import { GoogleMapsLeadsRunInput } from './types/google-maps-leads-input';

@Injectable()
export class IntegrationRunService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apifyProvider: ApifyProvider,
    private readonly config: ConfigService,
  ) {}

  async startGoogleMapsLeadsRun(
    workspaceId: string,
    userId: string,
    dto: StartGoogleMapsLeadsRunDto,
  ) {
    await this.assertNoActiveRun(
      workspaceId,
      IntegrationType.GOOGLE_MAPS_LEADS,
    );

    const actorId = this.config.get<string>('apify.googleMapsActorId');
    if (!actorId) {
      throw new Error('APIFY_GOOGLE_MAPS_ACTOR_ID não configurado');
    }

    const input: GoogleMapsLeadsRunInput = {
      searchQueries: dto.searchQueries.map((q) => q.trim()).filter(Boolean),
      lat: dto.lat,
      lng: dto.lng,
      radiusMeters: dto.radiusMeters,
      maxResults: dto.maxResults,
    };

    const run = await this.prisma.integrationRun.create({
      data: {
        workspaceId,
        provider: IntegrationProviderEnum.APIFY,
        type: IntegrationType.GOOGLE_MAPS_LEADS,
        status: IntegrationRunStatus.PENDING,
        externalActorId: actorId,
        input,
        createdById: userId,
      },
    });

    try {
      const actorInput = this.apifyProvider.buildGoogleMapsActorInput(input);
      const webhookUrl = this.buildWebhookUrl();
      const external = await this.apifyProvider.startRun({
        actorId,
        input: actorInput,
        webhookUrl,
      });

      return this.prisma.integrationRun.update({
        where: { id: run.id },
        data: {
          externalRunId: external.id,
          datasetId: external.defaultDatasetId ?? undefined,
          status: IntegrationRunStatus.RUNNING,
          startedAt: external.startedAt
            ? new Date(external.startedAt)
            : new Date(),
        },
      });
    } catch (error) {
      await this.prisma.integrationRun.update({
        where: { id: run.id },
        data: {
          status: IntegrationRunStatus.FAILED,
          errorMessage:
            error instanceof Error ? error.message : 'Falha ao iniciar run',
          finishedAt: new Date(),
        },
      });
      throw error;
    }
  }

  async list(workspaceId: string, query: ListIntegrationRunsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = {
      workspaceId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.integrationRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.integrationRun.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(workspaceId: string, id: string) {
    const run = await this.prisma.integrationRun.findFirst({
      where: { id, workspaceId },
    });
    if (!run) {
      throw new NotFoundException('Integration run não encontrada');
    }
    return run;
  }

  async abort(workspaceId: string, id: string) {
    const run = await this.findOne(workspaceId, id);

    if (
      run.status !== IntegrationRunStatus.PENDING &&
      run.status !== IntegrationRunStatus.RUNNING
    ) {
      throw new ConflictException(
        'Só é possível abortar runs em PENDING ou RUNNING',
      );
    }

    if (run.externalRunId) {
      try {
        await this.apifyProvider.abortRun(run.externalRunId);
      } catch {
        // Ainda marcamos como ABORTED localmente; o cron/webhook sincroniza se necessário
      }
    }

    return this.prisma.integrationRun.update({
      where: { id: run.id },
      data: {
        status: IntegrationRunStatus.ABORTED,
        finishedAt: new Date(),
        errorMessage: 'Abortado pelo usuário',
      },
    });
  }

  private async assertNoActiveRun(
    workspaceId: string,
    type: IntegrationType,
  ): Promise<void> {
    const active = await this.prisma.integrationRun.findFirst({
      where: {
        workspaceId,
        type,
        status: { in: [...ACTIVE_RUN_STATUSES] },
      },
      select: { id: true },
    });

    if (active) {
      throw new ConflictException(
        'Já existe uma run ativa deste tipo neste workspace',
      );
    }
  }

  private buildWebhookUrl(): string | undefined {
    const base = this.config.get<string>('apify.webhookBaseUrl');
    const secret = this.config.get<string>('apify.webhookSecret');
    if (!base || !secret) return undefined;

    const url = new URL('/webhooks/apify', base.replace(/\/$/, ''));
    url.searchParams.set('secret', secret);
    return url.toString();
  }
}
