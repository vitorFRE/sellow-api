import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ApifyClient } from './apify.client';
import { ApifyProvider } from './apify.provider';

describe('ApifyProvider', () => {
  let provider: ApifyProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApifyProvider,
        {
          provide: ApifyClient,
          useValue: {
            startActorRun: jest.fn(),
            getActorRun: jest.fn(),
            getDatasetItems: jest.fn(),
            abortActorRun: jest.fn(),
          },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    provider = module.get(ApifyProvider);
  });

  it('mapeia searchQueries e círculo para customGeolocation do Actor', () => {
    const input = provider.buildGoogleMapsActorInput({
      searchQueries: [' clínicas ', 'posto', ''],
      lat: -23.5505,
      lng: -46.6333,
      radiusMeters: 3000,
      maxResults: 80,
    });

    expect(input).toEqual({
      searchStringsArray: ['clínicas', 'posto'],
      customGeolocation: {
        type: 'Point',
        coordinates: [-46.6333, -23.5505],
        radiusKm: 3,
      },
      maxCrawledPlacesPerSearch: 80,
      language: 'pt-BR',
      includeWebResults: false,
    });
    expect(input).not.toHaveProperty('locationQuery');
  });
});
