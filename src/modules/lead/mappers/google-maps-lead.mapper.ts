import { LeadStatus } from '../../../generated/prisma/enums';
import { ImportGoogleMapsLeadItemDto } from '../dto/import-google-maps-lead-item.dto';

export type MappedLeadData = {
  name: string;
  status: LeadStatus;
  phone?: string | null;
  totalScore?: number | null;
  reviewsCount?: number | null;
  city?: string | null;
  state?: string | null;
  url?: string | null;
  website?: string | null;
  googlePlaceId?: string | null;
  categoryName?: string | null;
  source: string;
};

const BR_STATES: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
};

function normalizeState(raw?: string | null): string | null {
  if (!raw?.trim()) return null;
  const upper = raw.trim().toUpperCase();
  return BR_STATES[upper] ?? raw.trim();
}

function normalizePhone(raw?: string | null): string | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) return `+${digits}`;
  if (digits.length >= 10) return `+55${digits}`;
  return null;
}

function extractPlaceId(url?: string | null): string | null {
  if (!url) return null;
  try {
    const match = url.match(/[?&]query_place_id=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function orNull(value?: string | null): string | null {
  return value?.trim() || null;
}

export function mapGoogleMapsItemToLead(
  item: ImportGoogleMapsLeadItemDto,
): MappedLeadData | null {
  const name = item.title?.trim();
  if (!name) return null;

  const phone = normalizePhone(item.phone);
  const googlePlaceId = extractPlaceId(item.url);

  if (!phone && !googlePlaceId) return null;

  return {
    name,
    status: LeadStatus.IMPORTED,
    phone,
    totalScore: item.totalScore ?? null,
    reviewsCount: item.reviewsCount ?? null,
    city: orNull(item.city),
    state: normalizeState(item.state),
    url: orNull(item.url),
    website: orNull(item.website),
    googlePlaceId,
    categoryName: orNull(item.categoryName) ?? orNull(item.categories?.[0]),
    source: 'google_maps',
  };
}
