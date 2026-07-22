# Sellow API (NestJS + Prisma)

REST API for commercial lead control.

The API includes:

- JWT sign-in
- multi-tenant workspaces
- status pipeline (Kanban)
- loss reasons
- follow-ups
- Google Maps import
- aggregated dashboard

## Stack

- **NestJS** – REST API
- **Prisma** – ORM (SQLite local / Turso libsql in production)
- **JWT** – access token + refresh token (global guard; public routes use `@Public()`)
- **class-validator** – DTOs and global ValidationPipe
- **bcrypt** – password hash and refresh token hash in the database

## Requirements

- Node.js 18+
- pnpm

## How to run

### 1. Clone and install

```bash
git clone <repository-url> sellow-api
cd sellow-api
pnpm install
```

### 2. Environment variables

Copy the example file.
Set the values:

```bash
cp .env.example .env
```

In **development**, use the default values from `.env.example`:

- `LOCAL_DATABASE_URL` – local SQLite (example: `file:dev.db`)
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` – example secrets

In **production**, you must set:

- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (secure values, not the defaults)
- `DATABASE_URL`, `DATABASE_AUTH_TOKEN` (Turso/libsql)

### 3. Database

```bash
pnpm prisma:generate
pnpm prisma:migrate
```

### 4. Start the API

```bash
# development (watch)
pnpm run start:dev

# production
pnpm run build
pnpm run start:prod
```

The API starts at `http://localhost:3000` (or the port in `PORT`).

## Main scripts

| Command | Description |
| ------- | ----------- |
| `pnpm run start:dev` | Development with watch |
| `pnpm run start:debug` | Development with debugger |
| `pnpm run build` | Build for production |
| `pnpm run start:prod` | Run the build |
| `pnpm run type-check` | TypeScript type check |
| `pnpm run test` | Unit tests |
| `pnpm run test:e2e` | End-to-end tests |
| `pnpm run test:cov` | Test coverage |
| `pnpm run lint` | ESLint |
| `pnpm prisma:generate` | Generate the Prisma client |
| `pnpm prisma:migrate` | Migrations in development |
| `pnpm prisma:migrate:deploy` | Apply migrations in production |
| `pnpm prisma:studio` | Prisma UI for the database |

## API documentation

Module and route documentation is in **[doc/](doc/)**:

- [Overview, sign-in, and workspaces](doc/README.md)
- [Auth – login, register, refresh, logout, me](doc/modules/auth.md)
- [Workspaces – create, members, and isolation](doc/modules/workspaces.md)
- [Leads – create/read/change/remove, filters, notes, follow-up, Google Maps import](doc/modules/leads.md)
- [Integrations – async Google Maps import with Apify](doc/modules/integrations.md)
- [Dashboard – summary, funnel, and follow-ups](doc/modules/dashboard.md)
- [Loss Reasons – loss reasons](doc/modules/loss-reasons.md)
- [Feedback – send and control feedback](doc/modules/feedback.md)
- [Import Google Maps – item shape](doc/modules/leads-import-google-maps.md)
- [Health](doc/modules/health.md)
- [Users – workspace members](doc/modules/users.md)

## Structure (summary)

```
src/
  app.module.ts          # Global modules, JWT + workspace guards, exception filter
  main.ts                # Bootstrap, validateEnv, ValidationPipe, CORS
  config/                # env.config, validate-env (production check)
  common/                # guards, decorators, filters, interceptors, types
  modules/
    auth/                # login, register, refresh, logout, me (+ workspaces)
    workspace/           # workspaces and members
    users/               # members of the active workspace
    health/              # GET /health
    lead/                # leads, notes, follow-up, Google Maps import
    integration/         # Apify integrations and Google Maps leads runs
    loss-reason/         # loss reasons per workspace
    dashboard/           # summary per workspace
    feedback/            # user feedback
    prisma/              # PrismaService
  prisma/                # schema.prisma and migrations
  generated/prisma       # Prisma client (generated)
```
