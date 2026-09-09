FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable

FROM base AS build

WORKDIR /app

# Prisma needs a local datasource value to generate the client at build time.
ENV LOCAL_DATABASE_URL="file:dev.db"

COPY package.json pnpm-lock.yaml ./
# The postinstall script runs `prisma generate`, which needs these files.
COPY prisma.config.ts ./
COPY src/prisma ./src/prisma
RUN pnpm install --frozen-lockfile

COPY . ./
RUN pnpm run build && pnpm prune --prod

FROM base AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json

USER node

EXPOSE 3000

CMD ["node", "dist/main"]
