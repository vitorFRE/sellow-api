import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ApifyWebhookController } from './apify-webhook.controller';
import { IntegrationSyncService } from './integration-sync.service';

describe('ApifyWebhookController (callback do Apify)', () => {
  let controller: ApifyWebhookController;
  const syncService = {
    syncRunByExternalId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApifyWebhookController],
      providers: [
        { provide: IntegrationSyncService, useValue: syncService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'apify.webhookSecret' ? 'segredo-correto' : undefined,
            ),
          },
        },
      ],
    }).compile();

    controller = module.get(ApifyWebhookController);
    jest.clearAllMocks();
  });

  it('rejeita secret errado (não sincroniza)', async () => {
    await expect(
      controller.handleApifyWebhook('errado', {
        resource: { id: 'apify-run-1' },
        eventType: 'ACTOR.RUN.SUCCEEDED',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(syncService.syncRunByExternalId).not.toHaveBeenCalled();
  });

  it('rejeita secret ausente', async () => {
    await expect(
      controller.handleApifyWebhook(undefined, {
        resource: { id: 'apify-run-1' },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('com secret válido dispara sync pelo runId externo', async () => {
    syncService.syncRunByExternalId.mockResolvedValue(undefined);

    const result = await controller.handleApifyWebhook('segredo-correto', {
      resource: { id: 'apify-run-1' },
      eventType: 'ACTOR.RUN.SUCCEEDED',
    });

    expect(syncService.syncRunByExternalId).toHaveBeenCalledWith('apify-run-1');
    expect(result).toEqual({ ok: true });
  });

  it('ignora payload sem resource.id sem erro', async () => {
    const result = await controller.handleApifyWebhook('segredo-correto', {
      eventType: 'ACTOR.RUN.SUCCEEDED',
    });

    expect(syncService.syncRunByExternalId).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, ignored: true });
  });
});
