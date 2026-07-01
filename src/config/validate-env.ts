const REQUIRED_IN_PRODUCTION: string[] = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'DATABASE_URL',
  'DATABASE_AUTH_TOKEN',
];

const WEAK_DEFAULTS = [
  'change-me-access',
  'change-me-refresh',
  'fallback-secret',
];

export function validateEnv(): void {
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(
        `Variáveis de ambiente obrigatórias em produção não definidas: ${missing.join(', ')}`,
      );
    }
  }

  const jwtSecrets = [
    process.env.JWT_ACCESS_SECRET,
    process.env.JWT_REFRESH_SECRET,
  ].filter(Boolean) as string[];

  const hasWeakSecret = jwtSecrets.some((s) => WEAK_DEFAULTS.includes(s));
  if (isProd && hasWeakSecret) {
    throw new Error(
      'JWT secrets com valores padrão/fracos detectados em produção. Defina JWT_ACCESS_SECRET e JWT_REFRESH_SECRET com valores seguros.',
    );
  }
}
