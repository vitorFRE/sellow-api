import { Test, TestingModule } from '@nestjs/testing';
import { LeadImportService } from '../../lead/lead-import.service';
import {
  GoogleMapsLeadsHandler,
  normalizeApifyItems,
} from './google-maps-leads.handler';

describe('normalizeApifyItems', () => {
  it('normaliza items do Apify para o DTO de import', () => {
    const items = normalizeApifyItems([
      {
        title: 'Clínica XYZ',
        totalScore: 4.5,
        reviewsCount: 12,
        city: 'São Paulo',
        phone: '11999999999',
        url: 'https://maps.google.com/?query_place_id=ChIJabc',
        categories: ['Dentista'],
        location: { lat: -23.55, lng: -46.63 },
      },
      { foo: 'sem titulo' },
      null,
      { title: 'Posto ABC', rating: 4, reviews: 3, coords: [-46.7, -23.6] },
    ]);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      title: 'Clínica XYZ',
      totalScore: 4.5,
      reviewsCount: 12,
      city: 'São Paulo',
      latitude: -23.55,
      longitude: -46.63,
    });
    expect(items[1]).toMatchObject({
      title: 'Posto ABC',
      totalScore: 4,
      reviewsCount: 3,
      latitude: -23.6,
      longitude: -46.7,
    });
  });
});

describe('GoogleMapsLeadsHandler', () => {
  it('chama LeadImportService e monta summary', async () => {
    const leadImport = {
      importFromGoogleMaps: jest.fn().mockResolvedValue({
        created: 2,
        updated: 1,
        skipped: 0,
        failed: 0,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleMapsLeadsHandler,
        { provide: LeadImportService, useValue: leadImport },
      ],
    }).compile();

    const handler = module.get(GoogleMapsLeadsHandler);
    const summary = await handler.importDatasetItems('ws-1', [
      { title: 'A' },
      { title: 'B' },
      { title: 'C' },
      {},
    ]);

    expect(leadImport.importFromGoogleMaps).toHaveBeenCalled();
    expect(summary.itemCount).toBe(4);
    expect(summary.created).toBe(2);
    expect(summary.updated).toBe(1);
  });
});
