export const INTEGRATION_PROVIDER = Symbol('INTEGRATION_PROVIDER');

export type ProviderRunStatus =
  | 'READY'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'ABORTED'
  | 'TIMED_OUT'
  | string;

export type StartProviderRunInput = {
  actorId: string;
  input: Record<string, unknown>;
  webhookUrl?: string;
};

export type ProviderRunInfo = {
  id: string;
  status: ProviderRunStatus;
  defaultDatasetId?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  statusMessage?: string | null;
};

export interface IntegrationProvider {
  startRun(input: StartProviderRunInput): Promise<ProviderRunInfo>;
  getRun(externalRunId: string): Promise<ProviderRunInfo>;
  fetchResultItems(
    datasetId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<unknown[]>;
  abortRun(externalRunId: string): Promise<ProviderRunInfo>;
}
