import { Injectable } from '@nestjs/common';
import {
  IntegrationProvider,
  ProviderRunInfo,
  StartProviderRunInput,
} from '../integration-provider';
import { ApifyClient, ApifyRunData } from './apify.client';
import { GoogleMapsLeadsRunInput } from '../../types/google-maps-leads-input';

@Injectable()
export class ApifyProvider implements IntegrationProvider {
  constructor(private readonly client: ApifyClient) {}

  async startRun(input: StartProviderRunInput): Promise<ProviderRunInfo> {
    const run = await this.client.startActorRun(input.actorId, input.input, {
      webhookUrl: input.webhookUrl,
    });
    return mapRun(run);
  }

  async getRun(externalRunId: string): Promise<ProviderRunInfo> {
    const run = await this.client.getActorRun(externalRunId);
    return mapRun(run);
  }

  async fetchResultItems(
    datasetId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<unknown[]> {
    return this.client.getDatasetItems(datasetId, options);
  }

  async abortRun(externalRunId: string): Promise<ProviderRunInfo> {
    const run = await this.client.abortActorRun(externalRunId);
    return mapRun(run);
  }

  buildGoogleMapsActorInput(
    input: GoogleMapsLeadsRunInput,
  ): Record<string, unknown> {
    return {
      searchStringsArray: input.searchQueries
        .map((q) => q.trim())
        .filter(Boolean),
      customGeolocation: {
        type: 'Point',
        coordinates: [input.lng, input.lat],
        radiusKm: input.radiusMeters / 1000,
      },
      maxCrawledPlacesPerSearch: input.maxResults,
      language: 'pt-BR',
      includeWebResults: false,
    };
  }
}

function mapRun(run: ApifyRunData): ProviderRunInfo {
  return {
    id: run.id,
    status: run.status,
    defaultDatasetId: run.defaultDatasetId,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    statusMessage: run.statusMessage,
  };
}
