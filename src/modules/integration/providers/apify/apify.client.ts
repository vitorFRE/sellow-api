import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const APIFY_API_BASE = 'https://api.apify.com/v2';

type ApifyEnvelope<T> = { data: T };

export type ApifyRunData = {
  id: string;
  status: string;
  defaultDatasetId?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  statusMessage?: string | null;
};

@Injectable()
export class ApifyClient {
  private readonly logger = new Logger(ApifyClient.name);

  constructor(private readonly config: ConfigService) {}

  private get token(): string {
    const token = this.config.get<string>('apify.token');
    if (!token) {
      throw new Error('APIFY_TOKEN não configurado');
    }
    return token;
  }

  async startActorRun(
    actorId: string,
    input: Record<string, unknown>,
    options?: { webhookUrl?: string },
  ): Promise<ApifyRunData> {
    const params = new URLSearchParams();
    if (options?.webhookUrl) {
      const webhooks = [
        {
          eventTypes: [
            'ACTOR.RUN.SUCCEEDED',
            'ACTOR.RUN.FAILED',
            'ACTOR.RUN.TIMED_OUT',
            'ACTOR.RUN.ABORTED',
          ],
          requestUrl: options.webhookUrl,
        },
      ];
      params.set(
        'webhooks',
        Buffer.from(JSON.stringify(webhooks), 'utf8').toString('base64'),
      );
    }

    const qs = params.toString();
    const path = `/acts/${encodeURIComponent(actorId)}/runs${qs ? `?${qs}` : ''}`;
    return this.request<ApifyRunData>('POST', path, input);
  }

  async getActorRun(runId: string): Promise<ApifyRunData> {
    return this.request<ApifyRunData>(
      'GET',
      `/actor-runs/${encodeURIComponent(runId)}`,
    );
  }

  async abortActorRun(runId: string): Promise<ApifyRunData> {
    return this.request<ApifyRunData>(
      'POST',
      `/actor-runs/${encodeURIComponent(runId)}/abort`,
    );
  }

  async getDatasetItems(
    datasetId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<unknown[]> {
    const params = new URLSearchParams({
      format: 'json',
      clean: 'true',
    });
    if (options?.limit != null) params.set('limit', String(options.limit));
    if (options?.offset != null) params.set('offset', String(options.offset));

    const path = `/datasets/${encodeURIComponent(datasetId)}/items?${params}`;
    return this.requestRaw<unknown[]>('GET', path);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const envelope = await this.requestRaw<ApifyEnvelope<T>>(method, path, body);
    return envelope.data;
  }

  private async requestRaw<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${APIFY_API_BASE}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      this.logger.error(
        `Apify ${method} ${path} failed: ${response.status} ${text}`,
      );
      throw new Error(
        `Apify API error ${response.status}: ${text || response.statusText}`,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}
