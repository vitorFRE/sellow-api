import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaLibSql } from '@prisma/adapter-libsql';

import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const isProd = process.env.NODE_ENV === 'production';

    if (isProd) {
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL não definida em produção.');
      }
      if (!process.env.DATABASE_AUTH_TOKEN) {
        throw new Error('DATABASE_AUTH_TOKEN não definida em produção.');
      }
    }

    const opts = isProd
      ? {
          url: process.env.DATABASE_URL as string,
          authToken: process.env.DATABASE_AUTH_TOKEN as string,
        }
      : {
          url: process.env.LOCAL_DATABASE_URL ?? 'file:dev.db',
        };

    const adapter = new PrismaLibSql(opts);

    super({ adapter });
  }
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
