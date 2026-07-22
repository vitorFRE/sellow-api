import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ImportGoogleMapsLeadItemDto } from '../../lead/dto/import-google-maps-lead-item.dto';
import { LeadImportService } from '../../lead/lead-import.service';
import { IntegrationImportSummary } from '../types/google-maps-leads-input';

@Injectable()
export class GoogleMapsLeadsHandler {
  constructor(private readonly leadImportService: LeadImportService) {}

  async importDatasetItems(
    workspaceId: string,
    items: unknown[],
  ): Promise<IntegrationImportSummary> {
    const dtoItems = normalizeApifyItems(items);
    const result = await this.leadImportService.importFromGoogleMaps(
      workspaceId,
      dtoItems,
    );

    return {
      itemCount: items.length,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped + (items.length - dtoItems.length),
      failed: result.failed,
    };
  }
}

export function normalizeApifyItems(
  items: unknown[],
): ImportGoogleMapsLeadItemDto[] {
  const result: ImportGoogleMapsLeadItemDto[] = [];

  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;

    const title =
      asString(item.title) ?? asString(item.name) ?? asString(item.placeName);
    if (!title) continue;

    const coords = extractCoordinates(item);
    const candidate = {
      title,
      totalScore: asNumber(item.totalScore ?? item.rating ?? item.score),
      reviewsCount: asNumber(
        item.reviewsCount ?? item.reviews ?? item.userRatingsTotal,
      ),
      street: asString(item.street ?? item.address),
      city: asString(item.city),
      state: asString(item.state ?? item.region),
      latitude: coords?.latitude,
      longitude: coords?.longitude,
      countryCode: asString(item.countryCode ?? item.country),
      website: asString(item.website ?? item.websiteUrl),
      phone: asString(item.phone ?? item.phoneUnformatted ?? item.phoneNumber),
      categories: asStringArray(item.categories),
      categoryName: asString(
        item.categoryName ??
          (Array.isArray(item.categories) ? item.categories[0] : undefined),
      ),
      url: asString(item.url ?? item.placeUrl ?? item.googleUrl),
    };

    const dto = plainToInstance(ImportGoogleMapsLeadItemDto, candidate);
    const errors = validateSync(dto, { whitelist: true });
    if (errors.length === 0) {
      result.push(dto);
    }
  }

  return result;
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0,
  );
  return items.length > 0 ? items : undefined;
}

function extractCoordinates(
  item: Record<string, unknown>,
): { latitude: number; longitude: number } | undefined {
  const location =
    item.location && typeof item.location === 'object'
      ? (item.location as Record<string, unknown>)
      : undefined;

  let latitude =
    asNumber(item.latitude) ??
    asNumber(item.lat) ??
    asNumber(location?.lat) ??
    asNumber(location?.latitude);
  let longitude =
    asNumber(item.longitude) ??
    asNumber(item.lng) ??
    asNumber(item.lon) ??
    asNumber(location?.lng) ??
    asNumber(location?.longitude);

  const coords = item.coords ?? item.coordinates ?? location?.coordinates;
  if (
    (latitude == null || longitude == null) &&
    Array.isArray(coords) &&
    coords.length >= 2
  ) {
    // GeoJSON-style [lng, lat]
    const lng = asNumber(coords[0]);
    const lat = asNumber(coords[1]);
    if (lat != null && lng != null) {
      latitude = lat;
      longitude = lng;
    }
  }

  if (latitude == null || longitude == null) return undefined;
  if (latitude < -90 || latitude > 90) return undefined;
  if (longitude < -180 || longitude > 180) return undefined;
  return { latitude, longitude };
}
