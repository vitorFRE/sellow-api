import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { StartGoogleMapsLeadsRunDto } from './start-google-maps-leads-run.dto';

async function validateDto(plain: Record<string, unknown>) {
  const dto = plainToInstance(StartGoogleMapsLeadsRunDto, plain);
  return validate(dto);
}

const validCircle = {
  searchQueries: ['escritórios dentários', 'clínicas', 'posto'],
  lat: -23.5505,
  lng: -46.6333,
  radiusMeters: 3000,
  maxResults: 100,
};

describe('StartGoogleMapsLeadsRunDto (formulário do usuário)', () => {
  it('aceita várias buscas em um círculo no mapa', async () => {
    const errors = await validateDto(validCircle);
    expect(errors).toHaveLength(0);
  });

  it('aceita omitir maxResults (usa default no DTO)', async () => {
    const { maxResults: _, ...rest } = validCircle;
    const errors = await validateDto(rest);
    expect(errors).toHaveLength(0);
  });

  it('rejeita lista de buscas vazia', async () => {
    const errors = await validateDto({ ...validCircle, searchQueries: [] });
    expect(errors.some((e) => e.property === 'searchQueries')).toBe(true);
  });

  it('rejeita mais de 10 buscas', async () => {
    const errors = await validateDto({
      ...validCircle,
      searchQueries: Array.from({ length: 11 }, (_, i) => `busca ${i}`),
    });
    expect(errors.some((e) => e.property === 'searchQueries')).toBe(true);
  });

  it('rejeita lat fora do range', async () => {
    const errors = await validateDto({ ...validCircle, lat: 91 });
    expect(errors.some((e) => e.property === 'lat')).toBe(true);
  });

  it('rejeita lng fora do range', async () => {
    const errors = await validateDto({ ...validCircle, lng: -181 });
    expect(errors.some((e) => e.property === 'lng')).toBe(true);
  });

  it('rejeita radiusMeters abaixo do mínimo (100)', async () => {
    const errors = await validateDto({ ...validCircle, radiusMeters: 50 });
    expect(errors.some((e) => e.property === 'radiusMeters')).toBe(true);
  });

  it('rejeita radiusMeters acima do teto (50000)', async () => {
    const errors = await validateDto({ ...validCircle, radiusMeters: 50001 });
    expect(errors.some((e) => e.property === 'radiusMeters')).toBe(true);
  });

  it('rejeita maxResults acima do teto (200)', async () => {
    const errors = await validateDto({ ...validCircle, maxResults: 201 });
    expect(errors.some((e) => e.property === 'maxResults')).toBe(true);
  });
});
