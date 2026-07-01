import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { LeadImportService } from './lead-import.service';

jest.mock('./mappers/google-maps-lead.mapper', () => ({
  mapGoogleMapsItemToLead: jest.fn(
    (item: { mapped?: unknown }) => item.mapped ?? null,
  ),
}));

const mockPrisma = {
  lead: {
    findMany: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
};

describe('LeadImportService', () => {
  let service: LeadImportService;
  const anyDate = expect.any(Date) as unknown as Date;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadImportService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LeadImportService>(LeadImportService);
    jest.clearAllMocks();
  });

  it('não atualiza lead já modificado após primeira importação', async () => {
    const lastImportedAt = new Date('2026-01-01T00:00:00.000Z');
    const lastManualUpdateAt = new Date('2026-01-02T00:00:00.000Z');
    mockPrisma.lead.findMany.mockResolvedValueOnce([
      { googlePlaceId: 'gp-1', lastImportedAt, lastManualUpdateAt },
    ]);

    const result = await service.importFromGoogleMaps([
      { mapped: { name: 'Lead A', googlePlaceId: 'gp-1', status: 'IMPORTED' } },
    ] as never[]);

    expect(mockPrisma.lead.update).not.toHaveBeenCalled();
    expect(result).toEqual({ created: 0, updated: 0, skipped: 1, failed: 0 });
  });

  it('atualiza lead importado novamente quando não houve modificação manual', async () => {
    const lastImportedAt = new Date('2026-01-01T00:00:00.000Z');
    mockPrisma.lead.findMany.mockResolvedValueOnce([
      { googlePlaceId: 'gp-2', lastImportedAt, lastManualUpdateAt: null },
    ]);
    mockPrisma.lead.update.mockResolvedValue({});

    const result = await service.importFromGoogleMaps([
      { mapped: { name: 'Lead B', googlePlaceId: 'gp-2', status: 'IMPORTED' } },
    ] as never[]);

    expect(mockPrisma.lead.update).toHaveBeenCalledWith({
      where: { googlePlaceId: 'gp-2' },
      data: {
        name: 'Lead B',
        googlePlaceId: 'gp-2',
        status: 'IMPORTED',
        lastImportedAt: anyDate,
      },
    });
    expect(result).toEqual({ created: 0, updated: 1, skipped: 0, failed: 0 });
  });

  it('cria novo lead quando googlePlaceId ainda não existe', async () => {
    mockPrisma.lead.findMany.mockResolvedValueOnce([]);
    mockPrisma.lead.create.mockResolvedValue({});

    const result = await service.importFromGoogleMaps([
      { mapped: { name: 'Lead C', googlePlaceId: 'gp-3', status: 'IMPORTED' } },
    ] as never[]);

    expect(mockPrisma.lead.create).toHaveBeenCalledWith({
      data: {
        name: 'Lead C',
        googlePlaceId: 'gp-3',
        status: 'IMPORTED',
        lastImportedAt: anyDate,
      },
    });
    expect(result).toEqual({ created: 1, updated: 0, skipped: 0, failed: 0 });
  });
});
