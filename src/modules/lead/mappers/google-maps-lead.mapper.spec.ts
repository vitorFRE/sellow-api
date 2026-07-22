import { LeadStatus } from '../../../generated/prisma/enums';
import { classifyWebsiteUrl } from '../utils/classify-website-url';
import { mapGoogleMapsItemToLead } from './google-maps-lead.mapper';

describe('classifyWebsiteUrl', () => {
  it('classifica Instagram', () => {
    expect(
      classifyWebsiteUrl('https://www.instagram.com/loja'),
    ).toEqual({
      instagram: 'https://www.instagram.com/loja',
      website: null,
      facebook: null,
    });
  });

  it('classifica Facebook', () => {
    expect(classifyWebsiteUrl('https://facebook.com/pagina')).toEqual({
      facebook: 'https://facebook.com/pagina',
      website: null,
      instagram: null,
    });
  });

  it('classifica fb.com como Facebook', () => {
    expect(classifyWebsiteUrl('https://fb.com/pagina')).toEqual({
      facebook: 'https://fb.com/pagina',
      website: null,
      instagram: null,
    });
  });

  it('classifica site comum como website', () => {
    expect(classifyWebsiteUrl('https://loja.com.br')).toEqual({
      website: 'https://loja.com.br',
      instagram: null,
      facebook: null,
    });
  });

  it('retorna todos null quando vazio', () => {
    expect(classifyWebsiteUrl(undefined)).toEqual({
      website: null,
      instagram: null,
      facebook: null,
    });
    expect(classifyWebsiteUrl('   ')).toEqual({
      website: null,
      instagram: null,
      facebook: null,
    });
  });

  it('usa fallback por substring quando URL é inválida', () => {
    expect(classifyWebsiteUrl('instagram.com/loja')).toEqual({
      instagram: 'instagram.com/loja',
      website: null,
      facebook: null,
    });
  });
});

describe('mapGoogleMapsItemToLead', () => {
  const baseItem = {
    title: 'Salão Bella',
    phone: '11999999999',
    url: 'https://maps.google.com/?query_place_id=ChIJ123',
  };

  it('mapeia website do Instagram para instagram', () => {
    const result = mapGoogleMapsItemToLead({
      ...baseItem,
      website: 'https://www.instagram.com/salaobella',
    });

    expect(result).toEqual(
      expect.objectContaining({
        name: 'Salão Bella',
        instagram: 'https://www.instagram.com/salaobella',
        website: null,
        facebook: null,
        url: 'https://maps.google.com/?query_place_id=ChIJ123',
        googlePlaceId: 'ChIJ123',
        status: LeadStatus.IMPORTED,
        source: 'google_maps',
      }),
    );
  });

  it('mapeia website do Facebook para facebook', () => {
    const result = mapGoogleMapsItemToLead({
      ...baseItem,
      website: 'https://facebook.com/pagina',
    });

    expect(result).toEqual(
      expect.objectContaining({
        facebook: 'https://facebook.com/pagina',
        website: null,
        instagram: null,
      }),
    );
  });

  it('mapeia website comum para website', () => {
    const result = mapGoogleMapsItemToLead({
      ...baseItem,
      website: 'https://loja.com.br',
    });

    expect(result).toEqual(
      expect.objectContaining({
        website: 'https://loja.com.br',
        instagram: null,
        facebook: null,
      }),
    );
  });

  it('deixa links sociais null quando website ausente', () => {
    const result = mapGoogleMapsItemToLead(baseItem);

    expect(result).toEqual(
      expect.objectContaining({
        website: null,
        instagram: null,
        facebook: null,
      }),
    );
  });

  it('persiste latitude e longitude quando válidas', () => {
    const result = mapGoogleMapsItemToLead({
      ...baseItem,
      latitude: -23.5505,
      longitude: -46.6333,
    });

    expect(result).toEqual(
      expect.objectContaining({
        latitude: -23.5505,
        longitude: -46.6333,
      }),
    );
  });

  it('ignora coordenadas fora do range', () => {
    const result = mapGoogleMapsItemToLead({
      ...baseItem,
      latitude: 999,
      longitude: -46.6333,
    });

    expect(result?.latitude).toBeNull();
    expect(result?.longitude).toBe(-46.6333);
  });
});
