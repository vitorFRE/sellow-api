# Módulo Users

Listagem de **membros do workspace ativo** (não lista todos os usuários da plataforma). Acesso restrito a **`OWNER`** ou **`ADMIN`** no workspace.

**Controller:** `UsersController`  
**Prefixo:** `/users`

## Autenticação e autorização

**Headers obrigatórios:**

```
Authorization: Bearer <access_token>
X-Workspace-Id: <uuid-do-workspace>
```

- Todas as rotas exigem **JWT access token** e membership no workspace.
- Role exigida: **`OWNER`** ou **`ADMIN`** no workspace (`WorkspaceRolesGuard`).
- **Body:** nenhuma rota do módulo envia body (são GET).

Para adicionar ou remover membros, use as rotas em [workspaces.md](./workspaces.md) (`POST /workspaces/:id/members`, etc.).

---

## Rotas

### GET /users

- **Pública:** não
- **Token:** sim — access token
- **Header:** `X-Workspace-Id`
- **Body:** não
- **Descrição:** Lista membros do workspace com paginação.

**Query params:**

| Parâmetro | Tipo    | Obrigatório | Default | Máximo | Descrição              |
|-----------|---------|-------------|---------|--------|------------------------|
| page      | number  | não         | 1       | —      | Página atual           |
| limit     | number  | não         | 20      | 100    | Itens por página       |

**Exemplo de requisição:**

```
GET /users?page=1&limit=20
Authorization: Bearer <access_token>
X-Workspace-Id: 00000000-0000-4000-8000-000000000001
```

**Resposta exemplo:**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "usuario@exemplo.com",
      "name": "Nome do Usuário",
      "isActive": true,
      "createdAt": "2025-03-15T12:00:00.000Z",
      "updatedAt": "2025-03-15T12:00:00.000Z",
      "workspaceRole": "ADMIN"
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

`workspaceRole` é a role do usuário **neste workspace** (`OWNER`, `ADMIN` ou `MEMBER`). O campo global `User.role` (`USER` / `SUPER_ADMIN`) não é retornado nesta listagem.

---

### GET /users/:id

- **Pública:** não
- **Token:** sim — access token
- **Header:** `X-Workspace-Id`
- **Body:** não
- **Descrição:** Retorna um membro pelo `userId`, se pertencer ao workspace ativo.
- **Parâmetros:** `id` na URL (UUID do usuário).

**Exemplo de requisição:**

```
GET /users/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <access_token>
X-Workspace-Id: 00000000-0000-4000-8000-000000000001
```

**Resposta:** mesmo shape de um item em `GET /users` (inclui `workspaceRole`).

**404** — `Usuário não encontrado neste workspace`.
