export const FUNNEL_CHART_MONTHS = 6;

export function monthKeyUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function getRollingMonthKeysUtc(count: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
    );
    keys.push(monthKeyUtc(d));
  }
  return keys;
}

export function startOfMonthUtcFromKey(isoMonth: string): Date {
  const [ys, ms] = isoMonth.split('-');
  const y = Number(ys);
  const m = Number(ms);
  return new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
}

export function endOfMonthUtcFromKey(isoMonth: string): Date {
  const [ys, ms] = isoMonth.split('-');
  const y = Number(ys);
  const m = Number(ms);
  return new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
}
