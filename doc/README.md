# API documentation

This document describes the modules and the routes of the application.

The API does not use a global path prefix.
The routes are at the root.

Example: `http://localhost:3000/auth/login`.

## Modules

| Module | Description | Documentation |
| ------ | ----------- | ------------- |
| Auth | Sign-in, registration, login, and token refresh | [auth.md](./modules/auth.md) |
| Workspaces | Workspaces, members, and multi-tenant isolation | [workspaces.md](./modules/workspaces.md) |
| Leads | Create, read, change, and remove leads. List with filters. Notes, follow-up, and Google Maps import | [leads.md](./modules/leads.md) |
| Integrations | Async integrations (Apify → Google Maps leads) | [integrations.md](./modules/integrations.md) |
| Dashboard | Home summary: counts by status, recent leads, follow-ups, and funnel | [dashboard.md](./modules/dashboard.md) |
| Loss Reasons | Create, read, change, and remove loss reasons. Use them when a lead moves to LOST | [loss-reasons.md](./modules/loss-reasons.md) |
| Feedback | Feedback from signed-in users. Super admin controls feedback | [feedback.md](./modules/feedback.md) |
| Health | Health check of the application | [health.md](./modules/health.md) |
| Users | List of members in the current workspace | [users.md](./modules/users.md) |

Related documents:

- Sync Google Maps import (item shape in the body): [leads-import-google-maps.md](./modules/leads-import-google-maps.md)
- Async Google Maps import with Apify: [integrations.md](./modules/integrations.md)

## Environment variables

See the full list in [`.env.example`](../.env.example).

Summary:

| Group | Variables | Use |
| ----- | --------- | --- |
| App | `PORT`, `NODE_ENV`, `FRONTEND_URL`, `ALLOW_REGISTRATION` | Server, CORS, and registration |
| Local DB | `LOCAL_DATABASE_URL` | SQLite in development |
| Production DB | `DATABASE_URL`, `DATABASE_AUTH_TOKEN` | Turso/libSQL (required in production) |
| JWT | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_EXPIRES` | Auth |
| Apify | `APIFY_TOKEN`, `APIFY_GOOGLE_MAPS_ACTOR_ID`, `APIFY_WEBHOOK_SECRET`, `APIFY_WEBHOOK_BASE_URL` | Integrations (required in production) |

For Apify details, see [integrations.md](./modules/integrations.md#environment-variables-apify).

## How to sign in

Public routes do not need a token.

Exception: `POST /auth/refresh` is public, but you must send the refresh token in the header.

On protected routes, send this header:

```
Authorization: Bearer <access_token>
```

Use the refresh token only in `POST /auth/refresh`.

Send it in this header:

```
Authorization: Bearer <refresh_token>
```

Do not send a body.

Login returns `accessToken` and `refreshToken`.

When the access token expires, call the refresh route.
The refresh route returns a new pair of tokens.

The global `JwtAuthGuard` protects all routes.
Routes with `@Public()` are not protected.

## Workspaces (multi-tenancy)

The system isolates business data by workspace.

This includes:

- leads
- integrations
- loss reasons
- dashboard
- users

### Required header

On business routes, send:

```
X-Workspace-Id: <workspace-uuid>
```

These routes do not need this header:

- `GET /auth/me`
- `GET /workspaces`
- `POST /workspaces` (`SUPER_ADMIN` only)
- `GET /feedback/mine`
- `GET /feedback` (`SUPER_ADMIN` only)
- `PATCH /feedback/:id` (`SUPER_ADMIN` only)
- Public `POST /auth/*` routes
- `GET /health`
- `POST /webhooks/apify` (secret in the query)

### Roles

| Level | Values | Use |
| ----- | ------ | --- |
| Global (`User.role`) | `USER`, `SUPER_ADMIN` | `SUPER_ADMIN` creates workspaces. `SUPER_ADMIN` can open any workspace |
| Workspace (`WorkspaceMember.role`) | `OWNER`, `ADMIN`, `MEMBER` | Permissions in the active workspace |

Business modules use `WorkspaceRolesGuard`.

The guard checks the workspace role from the header.
The guard does not check the old global `ADMIN` role.

## Error response structure

The `AllExceptionsFilter` formats HTTP errors as follows:

```json
{
  "statusCode": 400,
  "message": "Message or array of errors",
  "error": "BadRequestException",
  "path": "/route",
  "timestamp": "2025-03-15T12:00:00.000Z"
}
```

Common workspace errors:

| Status | Typical message |
| ------ | --------------- |
| **400** | Header `x-workspace-id` é obrigatório para esta rota |
| **403** | Você não tem acesso a este workspace / permissão insuficiente |
| **404** | Workspace não encontrado |
