# Sellow API (NestJS + Prisma)

API REST para gestão comercial de leads: autenticação JWT, **workspaces multi-tenant**, pipeline de status (Kanban), motivos de perda, follow-ups, importação via Google Maps e dashboard agregado.

## Stack

- **NestJS** – API REST
- **Prisma** – ORM (SQLite local / Turso libsql em produção)
- **JWT** – access token + refresh token (guard global, rotas públicas com `@Public()`)
- **class-validator** – DTOs e ValidationPipe global
- **bcrypt** – hash de senha e refresh token no banco

## Pré-requisitos

- Node.js 18+
- pnpm

## Como rodar

### 1. Clonar e instalar

```bash
git clone <url-do-repositorio> sellow-api
cd sellow-api
pnpm install
```

### 2. Variáveis de ambiente

Copie o exemplo e ajuste os valores:

```bash
cp .env.example .env
```

Em **desenvolvimento**, use os valores padrão do `.env.example`:

- `LOCAL_DATABASE_URL` – SQLite local (ex.: `file:dev.db`)
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` – secrets de exemplo

Em **produção**, defina obrigatoriamente:

- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (valores seguros, não os defaults)
- `DATABASE_URL`, `DATABASE_AUTH_TOKEN` (Turso/libsql)

### 3. Banco de dados

```bash
pnpm prisma:generate
pnpm prisma:migrate
```

### 4. Subir a API

```bash
# desenvolvimento (watch)
pnpm run start:dev

# produção
pnpm run build
pnpm run start:prod
```

A API sobe em `http://localhost:3000` (ou a porta definida em `PORT`).

## Scripts principais

| Comando                        | Descrição                              |
| ------------------------------ | -------------------------------------- |
| `pnpm run start:dev`           | Desenvolvimento com watch              |
| `pnpm run start:debug`         | Desenvolvimento com debugger           |
| `pnpm run build`               | Build para produção                    |
| `pnpm run start:prod`          | Roda o build                           |
| `pnpm run type-check`          | Verificação de tipos TypeScript        |
| `pnpm run test`                | Testes unitários                       |
| `pnpm run test:e2e`            | Testes e2e                             |
| `pnpm run test:cov`            | Cobertura de testes                    |
| `pnpm run lint`                | ESLint                                 |
| `pnpm prisma:generate`         | Gera o client Prisma                   |
| `pnpm prisma:migrate`          | Migrations em desenvolvimento          |
| `pnpm prisma:migrate:deploy`   | Aplica migrations em produção          |
| `pnpm prisma:studio`           | Interface do Prisma no banco           |

## Documentação da API

A documentação dos módulos e rotas está em **[doc/](doc/)**:

- [Visão geral, autenticação e workspaces](doc/README.md)
- [Auth – login, register, refresh, logout, me](doc/modules/auth.md)
- [Workspaces – criação, membros e isolamento](doc/modules/workspaces.md)
- [Leads – CRUD, filtros, notes, follow-up, import Google Maps](doc/modules/leads.md)
- [Dashboard – resumo, funil e follow-ups](doc/modules/dashboard.md)
- [Loss Reasons – motivos de perda](doc/modules/loss-reasons.md)
- [Import Google Maps – shape dos itens](doc/modules/leads-import-google-maps.md)
- [Health](doc/modules/health.md)
- [Users – membros do workspace](doc/modules/users.md)

## Estrutura resumida

```
src/
  app.module.ts          # Módulos globais, guards JWT + workspace, filtro de exceções
  main.ts                # Bootstrap, validateEnv, ValidationPipe, CORS
  config/                # env.config, validate-env (checagem em produção)
  common/                # guards, decorators, filters, interceptors, types
  modules/
    auth/                # login, register, refresh, logout, me (+ workspaces)
    workspace/           # CRUD workspaces e membros
    users/               # membros do workspace ativo
    health/              # GET /health
    lead/                # leads, notes, follow-up, import Google Maps
    loss-reason/         # motivos de perda por workspace
    dashboard/           # resumo agregado por workspace
    prisma/              # PrismaService
  prisma/                # schema.prisma e migrations
  generated/prisma       # client Prisma (gerado)
```
