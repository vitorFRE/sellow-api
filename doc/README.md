# Documentação da API

Documentação dos módulos e rotas da aplicação. A API não utiliza prefixo global; as rotas são expostas na raiz (ex.: `http://localhost:3000/auth/login`).

## Módulos

| Módulo | Descrição | Documentação |
|--------|-----------|--------------|
| Auth | Autenticação, registro, login e refresh de tokens | [auth.md](./modules/auth.md) |
| Leads | CRUD, listagem paginada com filtros, notes, follow-up e importação Google Maps (ADMIN) | [leads.md](./modules/leads.md) |
| Dashboard | Resumo para home: contagens por status, leads recentes, follow-ups e funil (ADMIN) | [dashboard.md](./modules/dashboard.md) |
| Loss Reasons | CRUD de motivos de perda usados ao mover lead para LOST (ADMIN) | [loss-reasons.md](./modules/loss-reasons.md) |
| Health | Verificação de saúde da aplicação | [health.md](./modules/health.md) |
| Users | Listagem paginada e consulta por ID (ADMIN) | [users.md](./modules/users.md) |

Importação Google Maps (shape do item no body): [leads-import-google-maps.md](./modules/leads-import-google-maps.md)

## Autenticação

- Rotas marcadas como **públicas** não exigem token (exceto `/auth/refresh`, que é pública mas exige o **refresh token** no header).
- Rotas protegidas exigem o header `Authorization: Bearer <access_token>`.
- **Refresh token:** usado apenas em `POST /auth/refresh`, no mesmo header `Authorization: Bearer <refresh_token>` (sem body). O login retorna `accessToken` e `refreshToken`; use o refresh para renovar o par quando o access expirar.
- O guard global `JwtAuthGuard` protege todas as rotas exceto as decoradas com `@Public()`.
- Módulos de negócio (Leads, Dashboard, Loss Reasons, Users) exigem ainda role **ADMIN** via `RolesGuard`.

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
