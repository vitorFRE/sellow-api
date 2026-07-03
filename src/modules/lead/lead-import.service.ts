import { Injectable, Logger } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '../../generated/prisma/internal/prismaNamespace';
import { PrismaService } from '../prisma/prisma.service';
import { ImportGoogleMapsLeadItemDto } from './dto/import-google-maps-lead-item.dto';
import {
  mapGoogleMapsItemToLead,
  MappedLeadData,
} from './mappers/google-maps-lead.mapper';
import {
  CHUNK_SIZE,
  chunkArray,
  ImportResult,
} from './utils/lead-import.utils';

@Injectable()
export class LeadImportService {
  private readonly logger = new Logger(LeadImportService.name);
  constructor(private readonly prisma: PrismaService) {}

  async importFromGoogleMaps(
    workspaceId: string,
    items: ImportGoogleMapsLeadItemDto[],
  ): Promise<ImportResult> {
    const result: ImportResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
    };

    const mapped = items.map(mapGoogleMapsItemToLead);
    const valid = mapped.filter(Boolean) as MappedLeadData[];
    result.skipped += items.length - valid.length;

    if (valid.length === 0) return result;

    const toUpsert = valid.filter((i) => i.googlePlaceId);
    const toCreate = valid.filter((i) => !i.googlePlaceId);

    await this.processUpserts(workspaceId, toUpsert, result);
    await this.processCreates(workspaceId, toCreate, result);

    return result;
  }

  private async processUpserts(
    workspaceId: string,
    items: MappedLeadData[],
    result: ImportResult,
  ): Promise<void> {
    if (items.length === 0) return;

    const placeIds = items.map((i) => i.googlePlaceId!);
    const existing = await this.prisma.lead.findMany({
      where: { workspaceId, googlePlaceId: { in: placeIds } },
      select: {
        googlePlaceId: true,
        lastImportedAt: true,
        lastManualUpdateAt: true,
      },
    });

    const existingMap = new Map(
      existing
        .filter(
          (l): l is typeof l & { googlePlaceId: string } => !!l.googlePlaceId,
        )
        .map((l) => [l.googlePlaceId, l]),
    );

    for (const chunk of chunkArray(items, CHUNK_SIZE)) {
      for (const item of chunk) {
        try {
          const existingLead = existingMap.get(item.googlePlaceId!);
          if (existingLead) {
            const wasManuallyChangedAfterImport =
              !!existingLead.lastManualUpdateAt &&
              (!existingLead.lastImportedAt ||
                existingLead.lastManualUpdateAt > existingLead.lastImportedAt);

            if (wasManuallyChangedAfterImport) {
              result.skipped++;
              continue;
            }

            const importDate = new Date();
            await this.prisma.lead.update({
              where: {
                workspaceId_googlePlaceId: {
                  workspaceId,
                  googlePlaceId: item.googlePlaceId!,
                },
              },
              data: {
                ...item,
                lastImportedAt: importDate,
              },
            });
            result.updated++;
          } else {
            const importDate = new Date();
            await this.prisma.lead.create({
              data: {
                workspaceId,
                ...item,
                lastImportedAt: importDate,
              },
            });
            result.created++;
          }
        } catch (e: unknown) {
          result.failed++;
          this.logger.warn(`Falha ao importar lead (sync): ${item.name}`);
          this.logger.debug(e instanceof Error ? e.stack : String(e));
        }
      }
    }
  }

  private async processCreates(
    workspaceId: string,
    items: MappedLeadData[],
    result: ImportResult,
  ): Promise<void> {
    if (items.length === 0) return;

    const phones = items.map((i) => i.phone).filter(Boolean) as string[];
    const existingPhones = new Set(
      phones.length
        ? (
            await this.prisma.lead.findMany({
              where: { workspaceId, phone: { in: phones } },
              select: { phone: true },
            })
          ).map((l) => l.phone)
        : [],
    );

    const valid = items.filter((i) => !i.phone || !existingPhones.has(i.phone));
    result.skipped += items.length - valid.length;

    for (const item of valid) {
      try {
        const importDate = new Date();
        await this.prisma.lead.create({
          data: {
            workspaceId,
            ...item,
            lastImportedAt: importDate,
          },
        });
        result.created++;
      } catch (e: unknown) {
        if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
          result.skipped++;
        } else {
          result.failed++;
          this.logger.warn(`Falha ao importar lead (create): ${item.name}`);
          this.logger.debug(e instanceof Error ? e.stack : String(e));
        }
      }
    }
  }
}
