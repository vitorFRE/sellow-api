export const MAX_SEARCH_QUERIES = 10;
export const MAX_RESULTS_CAP = 200;
export const DEFAULT_MAX_RESULTS = 50;
export const DATASET_PAGE_SIZE = 100;
export const MIN_RADIUS_METERS = 100;
export const MAX_RADIUS_METERS = 50_000;

export const ACTIVE_RUN_STATUSES = ['PENDING', 'RUNNING', 'IMPORTING'] as const;

export const TERMINAL_RUN_STATUSES = [
  'COMPLETED',
  'COMPLETED_WITH_ERRORS',
  'FAILED',
  'ABORTED',
  'TIMED_OUT',
] as const;
