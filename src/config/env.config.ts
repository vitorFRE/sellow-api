export const envConfig = () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  database: {
    url: process.env.DATABASE_URL ?? '',
    authToken: process.env.DATABASE_AUTH_TOKEN ?? '',
    localUrl: process.env.LOCAL_DATABASE_URL ?? 'file:dev.db',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  },
  apify: {
    token: process.env.APIFY_TOKEN ?? '',
    googleMapsActorId: process.env.APIFY_GOOGLE_MAPS_ACTOR_ID ?? '',
    webhookSecret: process.env.APIFY_WEBHOOK_SECRET ?? '',
    webhookBaseUrl: process.env.APIFY_WEBHOOK_BASE_URL ?? '',
  },
});
