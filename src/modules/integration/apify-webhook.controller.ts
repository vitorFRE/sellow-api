import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  Post,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';
import { SkipWorkspace } from '../../common/decorators/skip-workspace.decorator';
import { IntegrationSyncService } from './integration-sync.service';

type ApifyWebhookBody = {
  resource?: {
    id?: string;
  };
  eventType?: string;
};

@Controller('webhooks')
export class ApifyWebhookController {
  constructor(
    private readonly syncService: IntegrationSyncService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @SkipWorkspace()
  @Post('apify')
  @HttpCode(200)
  async handleApifyWebhook(
    @Query('secret') secret: string | undefined,
    @Body() body: ApifyWebhookBody,
  ) {
    const expected = this.config.get<string>('apify.webhookSecret');
    if (!expected || secret !== expected) {
      throw new ForbiddenException('Webhook secret inválido');
    }

    const externalRunId = body?.resource?.id;
    if (!externalRunId) {
      return { ok: true, ignored: true };
    }

    await this.syncService.syncRunByExternalId(externalRunId);
    return { ok: true };
  }
}
