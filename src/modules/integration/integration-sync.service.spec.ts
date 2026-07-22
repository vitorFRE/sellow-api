import { Test, TestingModule } from '@nestjs/testing';
import {
  IntegrationRunStatus,
  IntegrationType,
} from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleMapsLeadsHandler } from './handlers/google-maps-leads.handler';
import { IntegrationSyncService } from './integration-sync.service';
import { ApifyProvider } from './providers/apify/apify.provider';

const runId = 'run-1';
const workspaceId = 'ws-1';

type UpdateRunArg = {
  where?: { id?: string };
  data?: Record<string, unknown>;
};

type FindFirstArg = {
  where?: { externalRunId?: string; provider?: string };
  select?: { id?: boolean };
};

const mockPrisma = {
  integrationRun: {
    findUnique: jest.fn(),
    findFirst: jest.fn<Promise<unknown>, [FindFirstArg]>(),
    findMany: jest.fn(),
    update: jest.fn<Promise<unknown>, [UpdateRunArg]>(),
    updateMany: jest.fn<Promise<{ count: number }>, [UpdateRunArg]>(),
  },
};

const mockApifyProvider = {
  getRun: jest.fn(),
  fetchResultItems: jest.fn(),
};

const mockHandler = {
  importDatasetItems: jest.fn(),
};

function lastUpdateArg(): UpdateRunArg {
  const calls = mockPrisma.integrationRun.update.mock.calls;
  return calls[calls.length - 1][0];
}

function lastUpdateManyArg(): UpdateRunArg {
  const calls = mockPrisma.integrationRun.updateMany.mock.calls;
  return calls[calls.length - 1][0];
}

describe('IntegrationSyncService', () => {
  let service: IntegrationSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationSyncService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ApifyProvider, useValue: mockApifyProvider },
        { provide: GoogleMapsLeadsHandler, useValue: mockHandler },
      ],
    }).compile();

    service = module.get(IntegrationSyncService);
    jest.clearAllMocks();
  });

  it('não reimporta quando status já é terminal', async () => {
    mockPrisma.integrationRun.findUnique.mockResolvedValue({
      id: runId,
      status: IntegrationRunStatus.COMPLETED,
      externalRunId: 'ext-1',
    });

    await service.syncRun(runId);

    expect(mockApifyProvider.getRun).not.toHaveBeenCalled();
    expect(mockHandler.importDatasetItems).not.toHaveBeenCalled();
  });

  it('não reimporta quando já está IMPORTING', async () => {
    mockPrisma.integrationRun.findUnique.mockResolvedValue({
      id: runId,
      status: IntegrationRunStatus.IMPORTING,
      externalRunId: 'ext-1',
    });

    await service.syncRun(runId);

    expect(mockApifyProvider.getRun).not.toHaveBeenCalled();
  });

  it('enquanto Apify ainda roda, mantém RUNNING (usuário continua polling)', async () => {
    mockPrisma.integrationRun.findUnique.mockResolvedValue({
      id: runId,
      workspaceId,
      type: IntegrationType.GOOGLE_MAPS_LEADS,
      status: IntegrationRunStatus.RUNNING,
      externalRunId: 'ext-1',
      datasetId: null,
      startedAt: new Date(),
    });
    mockApifyProvider.getRun.mockResolvedValue({
      id: 'ext-1',
      status: 'RUNNING',
      defaultDatasetId: 'ds-1',
    });
    mockPrisma.integrationRun.update.mockResolvedValue({});

    await service.syncRun(runId);

    expect(mockHandler.importDatasetItems).not.toHaveBeenCalled();
    expect(mockPrisma.integrationRun.updateMany).not.toHaveBeenCalled();
  });

  it('importa uma vez quando Apify retorna SUCCEEDED', async () => {
    mockPrisma.integrationRun.findUnique.mockResolvedValue({
      id: runId,
      workspaceId,
      type: IntegrationType.GOOGLE_MAPS_LEADS,
      status: IntegrationRunStatus.RUNNING,
      externalRunId: 'ext-1',
      datasetId: null,
    });
    mockApifyProvider.getRun.mockResolvedValue({
      id: 'ext-1',
      status: 'SUCCEEDED',
      defaultDatasetId: 'ds-1',
      finishedAt: '2026-07-21T01:00:00.000Z',
    });
    mockPrisma.integrationRun.update.mockResolvedValue({});
    mockPrisma.integrationRun.updateMany.mockResolvedValue({ count: 1 });
    mockApifyProvider.fetchResultItems.mockResolvedValue([{ title: 'Lead A' }]);
    mockHandler.importDatasetItems.mockResolvedValue({
      itemCount: 1,
      created: 1,
      updated: 0,
      skipped: 0,
      failed: 0,
    });

    await service.syncRun(runId);

    expect(mockHandler.importDatasetItems).toHaveBeenCalledTimes(1);
    const updateArg = lastUpdateArg();
    expect(updateArg.where).toEqual({ id: runId });
    expect(updateArg.data?.status).toBe(IntegrationRunStatus.COMPLETED);
    expect(updateArg.data?.importSummary).toMatchObject({ created: 1 });
  });

  it('marca COMPLETED_WITH_ERRORS quando alguns leads falham no import', async () => {
    mockPrisma.integrationRun.findUnique.mockResolvedValue({
      id: runId,
      workspaceId,
      type: IntegrationType.GOOGLE_MAPS_LEADS,
      status: IntegrationRunStatus.RUNNING,
      externalRunId: 'ext-1',
      datasetId: null,
    });
    mockApifyProvider.getRun.mockResolvedValue({
      id: 'ext-1',
      status: 'SUCCEEDED',
      defaultDatasetId: 'ds-1',
    });
    mockPrisma.integrationRun.update.mockResolvedValue({});
    mockPrisma.integrationRun.updateMany.mockResolvedValue({ count: 1 });
    mockApifyProvider.fetchResultItems.mockResolvedValue([
      { title: 'A' },
      { title: 'B' },
    ]);
    mockHandler.importDatasetItems.mockResolvedValue({
      itemCount: 2,
      created: 1,
      updated: 0,
      skipped: 0,
      failed: 1,
    });

    await service.syncRun(runId);

    expect(lastUpdateArg().data?.status).toBe(
      IntegrationRunStatus.COMPLETED_WITH_ERRORS,
    );
  });

  it('espelha FAILED do Apify para o usuário ver erro na UI', async () => {
    mockPrisma.integrationRun.findUnique.mockResolvedValue({
      id: runId,
      workspaceId,
      type: IntegrationType.GOOGLE_MAPS_LEADS,
      status: IntegrationRunStatus.RUNNING,
      externalRunId: 'ext-1',
      datasetId: null,
      startedAt: new Date(),
    });
    mockApifyProvider.getRun.mockResolvedValue({
      id: 'ext-1',
      status: 'FAILED',
      statusMessage: 'Actor crashed',
      finishedAt: '2026-07-21T01:00:00.000Z',
    });
    mockPrisma.integrationRun.update.mockResolvedValue({});
    mockPrisma.integrationRun.updateMany.mockResolvedValue({ count: 1 });

    await service.syncRun(runId);

    expect(mockHandler.importDatasetItems).not.toHaveBeenCalled();
    const updateManyArg = lastUpdateManyArg();
    expect(updateManyArg.data?.status).toBe(IntegrationRunStatus.FAILED);
    expect(updateManyArg.data?.errorMessage).toBe('Actor crashed');
  });

  it('espelha TIMED_OUT do Apify', async () => {
    mockPrisma.integrationRun.findUnique.mockResolvedValue({
      id: runId,
      workspaceId,
      type: IntegrationType.GOOGLE_MAPS_LEADS,
      status: IntegrationRunStatus.RUNNING,
      externalRunId: 'ext-1',
      datasetId: null,
      startedAt: new Date(),
    });
    mockApifyProvider.getRun.mockResolvedValue({
      id: 'ext-1',
      status: 'TIMED_OUT',
      finishedAt: '2026-07-21T01:00:00.000Z',
    });
    mockPrisma.integrationRun.update.mockResolvedValue({});
    mockPrisma.integrationRun.updateMany.mockResolvedValue({ count: 1 });

    await service.syncRun(runId);

    expect(lastUpdateManyArg().data?.status).toBe(
      IntegrationRunStatus.TIMED_OUT,
    );
  });

  it('não importa de novo se outra sincronização já claimou IMPORTING', async () => {
    mockPrisma.integrationRun.findUnique.mockResolvedValue({
      id: runId,
      workspaceId,
      type: IntegrationType.GOOGLE_MAPS_LEADS,
      status: IntegrationRunStatus.RUNNING,
      externalRunId: 'ext-1',
      datasetId: null,
    });
    mockApifyProvider.getRun.mockResolvedValue({
      id: 'ext-1',
      status: 'SUCCEEDED',
      defaultDatasetId: 'ds-1',
    });
    mockPrisma.integrationRun.update.mockResolvedValue({});
    mockPrisma.integrationRun.updateMany.mockResolvedValue({ count: 0 });

    await service.syncRun(runId);

    expect(mockHandler.importDatasetItems).not.toHaveBeenCalled();
  });

  it('webhook resolve run pelo externalRunId e sincroniza', async () => {
    mockPrisma.integrationRun.findFirst.mockResolvedValue({ id: runId });
    mockPrisma.integrationRun.findUnique.mockResolvedValue({
      id: runId,
      workspaceId,
      type: IntegrationType.GOOGLE_MAPS_LEADS,
      status: IntegrationRunStatus.RUNNING,
      externalRunId: 'ext-1',
      datasetId: null,
      startedAt: new Date(),
    });
    mockApifyProvider.getRun.mockResolvedValue({
      id: 'ext-1',
      status: 'RUNNING',
      defaultDatasetId: 'ds-1',
    });
    mockPrisma.integrationRun.update.mockResolvedValue({});

    await service.syncRunByExternalId('ext-1');

    const findFirstArg = mockPrisma.integrationRun.findFirst.mock.calls[0][0];
    expect(findFirstArg.where?.externalRunId).toBe('ext-1');
    expect(mockApifyProvider.getRun).toHaveBeenCalledWith('ext-1');
  });

  it('webhook de run desconhecida não quebra', async () => {
    mockPrisma.integrationRun.findFirst.mockResolvedValue(null);

    await expect(
      service.syncRunByExternalId('ext-desconhecido'),
    ).resolves.toBeUndefined();
    expect(mockApifyProvider.getRun).not.toHaveBeenCalled();
  });
});
