import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  IntegrationRunStatus,
  IntegrationType,
} from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationRunService } from './integration-run.service';
import { ApifyProvider } from './providers/apify/apify.provider';

const workspaceId = 'ws-1';
const otherWorkspaceId = 'ws-2';
const userId = 'user-1';

type StartRunArg = {
  actorId: string;
  input: Record<string, unknown>;
  webhookUrl?: string;
};

type UpdateRunArg = {
  where: { id: string };
  data: Record<string, unknown>;
};

const mockPrisma = {
  integrationRun: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn<Promise<unknown>, [UpdateRunArg]>(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

const mockApifyProvider = {
  buildGoogleMapsActorInput: jest.fn(),
  startRun: jest.fn<Promise<unknown>, [StartRunArg]>(),
  abortRun: jest.fn(),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    const map: Record<string, string> = {
      'apify.googleMapsActorId': 'actor~google-maps',
      'apify.webhookBaseUrl': 'https://api.sellow.test',
      'apify.webhookSecret': 'secret',
    };
    return map[key];
  }),
};

function makeRunningRun(overrides: Record<string, unknown> = {}) {
  return {
    id: 'run-1',
    workspaceId,
    status: IntegrationRunStatus.RUNNING,
    type: IntegrationType.GOOGLE_MAPS_LEADS,
    externalRunId: 'apify-run-1',
    input: {
      searchQueries: ['clínicas', 'posto'],
      lat: -23.5505,
      lng: -46.6333,
      radiusMeters: 3000,
      maxResults: 50,
    },
    importSummary: null,
    ...overrides,
  };
}

const circleDto = {
  searchQueries: ['escritórios dentários', 'clínicas', 'posto'] as string[],
  lat: -23.5505,
  lng: -46.6333,
  radiusMeters: 3000,
  maxResults: 100,
};

describe('IntegrationRunService — jornadas do usuário', () => {
  let service: IntegrationRunService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationRunService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ApifyProvider, useValue: mockApifyProvider },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(IntegrationRunService);
    jest.clearAllMocks();
  });

  describe('disparar busca de leads', () => {
    it('usuário envia várias queries e recebe run RUNNING', async () => {
      mockPrisma.integrationRun.findFirst.mockResolvedValue(null);
      mockPrisma.integrationRun.create.mockResolvedValue({
        id: 'run-new',
        status: IntegrationRunStatus.PENDING,
      });
      mockApifyProvider.buildGoogleMapsActorInput.mockReturnValue({
        searchStringsArray: ['escritórios dentários', 'clínicas', 'posto'],
        customGeolocation: {
          type: 'Point',
          coordinates: [-46.6333, -23.5505],
          radiusKm: 3,
        },
      });
      mockApifyProvider.startRun.mockResolvedValue({
        id: 'apify-run-1',
        status: 'RUNNING',
        defaultDatasetId: 'ds-1',
        startedAt: '2026-07-21T12:00:00.000Z',
      });
      mockPrisma.integrationRun.update.mockResolvedValue(
        makeRunningRun({ id: 'run-new' }),
      );

      const result = await service.startGoogleMapsLeadsRun(
        workspaceId,
        userId,
        circleDto,
      );

      expect(mockApifyProvider.startRun).toHaveBeenCalled();
      const startArg = mockApifyProvider.startRun.mock.calls[0][0];
      expect(startArg.actorId).toBe('actor~google-maps');
      expect(startArg.webhookUrl).toContain('/webhooks/apify?secret=secret');
      expect(result.status).toBe(IntegrationRunStatus.RUNNING);
      expect(result.externalRunId).toBe('apify-run-1');
    });

    it('bloqueia nova busca enquanto outra ainda está ativa', async () => {
      mockPrisma.integrationRun.findFirst.mockResolvedValue({
        id: 'run-ativa',
      });

      await expect(
        service.startGoogleMapsLeadsRun(workspaceId, userId, {
          searchQueries: ['clínicas'],
          lat: -23.55,
          lng: -46.63,
          radiusMeters: 2000,
          maxResults: 50,
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(mockPrisma.integrationRun.create).not.toHaveBeenCalled();
    });

    it('permite nova busca depois que a anterior terminou', async () => {
      mockPrisma.integrationRun.findFirst.mockResolvedValue(null);
      mockPrisma.integrationRun.create.mockResolvedValue({
        id: 'run-2',
        status: IntegrationRunStatus.PENDING,
      });
      mockApifyProvider.buildGoogleMapsActorInput.mockReturnValue({});
      mockApifyProvider.startRun.mockResolvedValue({
        id: 'apify-run-2',
        status: 'RUNNING',
        defaultDatasetId: 'ds-2',
      });
      mockPrisma.integrationRun.update.mockResolvedValue(
        makeRunningRun({ id: 'run-2', externalRunId: 'apify-run-2' }),
      );

      await expect(
        service.startGoogleMapsLeadsRun(workspaceId, userId, {
          searchQueries: ['farmácias'],
          lat: -22.9,
          lng: -47.06,
          radiusMeters: 1500,
          maxResults: 30,
        }),
      ).resolves.toMatchObject({
        id: 'run-2',
        status: IntegrationRunStatus.RUNNING,
      });
    });

    it('marca FAILED localmente se o Apify falhar ao iniciar', async () => {
      mockPrisma.integrationRun.findFirst.mockResolvedValue(null);
      mockPrisma.integrationRun.create.mockResolvedValue({
        id: 'run-fail',
        status: IntegrationRunStatus.PENDING,
      });
      mockApifyProvider.buildGoogleMapsActorInput.mockReturnValue({});
      mockApifyProvider.startRun.mockRejectedValue(new Error('Apify 401'));
      mockPrisma.integrationRun.update.mockResolvedValue({});

      await expect(
        service.startGoogleMapsLeadsRun(workspaceId, userId, {
          searchQueries: ['clínicas'],
          lat: -23.55,
          lng: -46.63,
          radiusMeters: 2000,
          maxResults: 50,
        }),
      ).rejects.toThrow('Apify 401');

      expect(mockPrisma.integrationRun.update).toHaveBeenCalled();
      const updateArg = mockPrisma.integrationRun.update.mock.calls[0][0];
      expect(updateArg.where).toEqual({ id: 'run-fail' });
      expect(updateArg.data.status).toBe(IntegrationRunStatus.FAILED);
      expect(updateArg.data.errorMessage).toBe('Apify 401');
    });
  });

  describe('acompanhar progresso', () => {
    it('lista histórico de runs do workspace', async () => {
      const runs = [
        makeRunningRun({
          id: 'run-2',
          status: IntegrationRunStatus.COMPLETED,
          importSummary: { created: 10, updated: 2, skipped: 1, failed: 0 },
        }),
        makeRunningRun({ id: 'run-1' }),
      ];
      mockPrisma.integrationRun.findMany.mockResolvedValue(runs);
      mockPrisma.integrationRun.count.mockResolvedValue(2);

      const result = await service.list(workspaceId, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(mockPrisma.integrationRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workspaceId },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('filtra por status COMPLETED para ver só buscas finalizadas', async () => {
      mockPrisma.integrationRun.findMany.mockResolvedValue([]);
      mockPrisma.integrationRun.count.mockResolvedValue(0);

      await service.list(workspaceId, {
        page: 1,
        limit: 20,
        status: IntegrationRunStatus.COMPLETED,
      });

      expect(mockPrisma.integrationRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            workspaceId,
            status: IntegrationRunStatus.COMPLETED,
          },
        }),
      );
    });

    it('abre detalhe da run e vê input + summary', async () => {
      const completed = makeRunningRun({
        status: IntegrationRunStatus.COMPLETED,
        importSummary: {
          itemCount: 15,
          created: 12,
          updated: 2,
          skipped: 1,
          failed: 0,
        },
      });
      mockPrisma.integrationRun.findFirst.mockResolvedValue(completed);

      const result = await service.findOne(workspaceId, 'run-1');

      expect(result.importSummary).toEqual(
        expect.objectContaining({ created: 12, updated: 2 }),
      );
      expect(result.input).toEqual(
        expect.objectContaining({
          searchQueries: ['clínicas', 'posto'],
          lat: -23.5505,
          lng: -46.6333,
          radiusMeters: 3000,
        }),
      );
    });

    it('não encontra run de outro workspace', async () => {
      mockPrisma.integrationRun.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(otherWorkspaceId, 'run-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('cancelar busca', () => {
    it('usuário aborta run RUNNING e chama Apify abort', async () => {
      mockPrisma.integrationRun.findFirst.mockResolvedValue(makeRunningRun());
      mockApifyProvider.abortRun.mockResolvedValue({
        id: 'apify-run-1',
        status: 'ABORTED',
      });
      mockPrisma.integrationRun.update.mockResolvedValue(
        makeRunningRun({
          status: IntegrationRunStatus.ABORTED,
          errorMessage: 'Abortado pelo usuário',
        }),
      );

      const result = await service.abort(workspaceId, 'run-1');

      expect(mockApifyProvider.abortRun).toHaveBeenCalledWith('apify-run-1');
      expect(result.status).toBe(IntegrationRunStatus.ABORTED);
    });

    it('ainda marca ABORTED se o Apify abort falhar', async () => {
      mockPrisma.integrationRun.findFirst.mockResolvedValue(makeRunningRun());
      mockApifyProvider.abortRun.mockRejectedValue(new Error('network'));
      mockPrisma.integrationRun.update.mockResolvedValue(
        makeRunningRun({ status: IntegrationRunStatus.ABORTED }),
      );

      await expect(service.abort(workspaceId, 'run-1')).resolves.toMatchObject({
        status: IntegrationRunStatus.ABORTED,
      });
    });

    it('não permite abortar run já COMPLETED', async () => {
      mockPrisma.integrationRun.findFirst.mockResolvedValue(
        makeRunningRun({ status: IntegrationRunStatus.COMPLETED }),
      );

      await expect(service.abort(workspaceId, 'run-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(mockApifyProvider.abortRun).not.toHaveBeenCalled();
    });
  });
});
