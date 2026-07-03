# Documentação da API

Documentação dos módulos e rotas da aplicação. A API não utiliza prefixo global; as rotas são expostas na raiz (ex.: `http://localhost:3000/auth/login`).

## Módulos

| Módulo | Descrição | Documentação |
|--------|-----------|--------------|
| Auth | Autenticação, registro, login e refresh de tokens | [auth.md](./modules/auth.md) |
| Workspaces | Workspaces, membros e isolamento multi-tenant | [workspaces.md](./modules/workspaces.md) |
| Leads | CRUD, listagem paginada com filtros, notes, follow-up e importação Google Maps | [leads.md](./modules/leads.md) |
| Dashboard | Resumo para home: contagens por status, leads recentes, follow-ups e funil | [dashboard.md](./modules/dashboard.md) |
| Loss Reasons | CRUD de motivos de perda usados ao mover lead para LOST | [loss-reasons.md](./modules/loss-reasons.md) |
| Health | Verificação de saúde da aplicação | [health.md](./modules/health.md) |
| Users | Listagem de membros do workspace atual | [users.md](./modules/users.md) |

Importação Google Maps (shape do item no body): [leads-import-google-maps.md](./modules/leads-import-google-maps.md)

## Autenticação

- Rotas marcadas como **públicas** não exigem token (exceto `/auth/refresh`, que é pública mas exige o **refresh token** no header).
- Rotas protegidas exigem o header `Authorization: Bearer <access_token>`.
- **Refresh token:** usado apenas em `POST /auth/refresh`, no mesmo header `Authorization: Bearer <refresh_token>` (sem body). O login retorna `accessToken` e `refreshToken`; use o refresh para renovar o par quando o access expirar.
- O guard global `JwtAuthGuard` protege todas as rotas exceto as decoradas com `@Public()`.

## Workspaces (multi-tenancy)

Dados de negócio (leads, loss reasons, dashboard, users) são **isolados por workspace**.

### Header obrigatório

Nas rotas de negócio, envie:

```
X-Workspace-Id: <uuid-do-workspace>
```

Rotas **sem** esse header: `GET /auth/me`, `GET /workspaces`, `POST /workspaces` (apenas `SUPER_ADMIN`), `POST /auth/*` públicas, `GET /health`.

### Roles

| Nível | Valores | Uso |
| ----- | ------- | --- |
| **Global** (`User.role`) | `USER`, `SUPER_ADMIN` | `SUPER_ADMIN` cria workspaces e acessa qualquer workspace |
| **Workspace** (`WorkspaceMember.role`) | `OWNER`, `ADMIN`, `MEMBER` | Permissões dentro do workspace ativo |

Módulos de negócio usam `WorkspaceRolesGuard` — a role checada é a do **workspace** (header), não a global `ADMIN` legada.

### Fluxo recomendado no front-end

1. `POST /auth/login` → salvar tokens.
2. `GET /auth/me` ou `GET /workspaces` → obter lista de workspaces e roles.
3. Persistir workspace ativo (ex.: localStorage).
4. Enviar `X-Workspace-Id` em todas as chamadas de leads, dashboard, loss-reasons e users.
5. Gerenciar membros em `POST /workspaces/:id/members` (configurações do workspace).

Workspace default legado (migração): `00000000-0000-4000-8000-000000000001`.

## Estrutura das respostas de erro

As exceções HTTP são formatadas pelo `AllExceptionsFilter` no padrão:

```json
{
  "statusCode": 400,
  "message": "Mensagem ou array de erros",
  "error": "BadRequestException",
  "path": "/rota",
  "timestamp": "2025-03-15T12:00:00.000Z"
}
```

Erros comuns de workspace:

| Status | Mensagem típica |
| ------ | ---------------- |
| **400** | Header `x-workspace-id` é obrigatório para esta rota |
| **403** | Você não tem acesso a este workspace / permissão insuficiente |
| **404** | Workspace não encontrado |
