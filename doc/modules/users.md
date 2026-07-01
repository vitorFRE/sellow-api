# Módulo Users

Listagem e consulta de usuários. Acesso restrito a usuários com role **ADMIN**.

**Controller:** `UsersController`  
**Prefixo:** `/users`

## Autenticação e autorização

- Todas as rotas exigem **JWT access token** no header (guard global).
- Todas as rotas exigem role **ADMIN** (`@UseGuards(RolesGuard)` + `@Roles('ADMIN')`).
- **Body:** nenhuma rota do módulo envia body (são GET). Enviar apenas o token no header.

**Headers em todas as requisições:**

```
Authorization: Bearer <access_token>
```

---

## Rotas

### GET /users

- **Pública:** não
- **Token:** sim — access token (usuário deve ser ADMIN).
- **Body:** não.
- **Descrição:** Lista usuários com paginação.

**Query params:**

| Parâmetro | Tipo    | Obrigatório | Default | Máximo | Descrição              |
|-----------|---------|-------------|---------|--------|------------------------|
| page      | number  | não         | 1       | —      | Página atual           |
| limit     | number  | não         | 20      | 100    | Itens por página       |

**Exemplo de requisição:** `GET /users?page=1&limit=20` com header `Authorization: Bearer <access_token>`.

**Resposta exemplo:**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "usuario@exemplo.com",
      "name": "Nome do Usuário",
      "role": "USER",
      "isActive": true,
      "createdAt": "2025-03-15T12:00:00.000Z",
      "updatedAt": "2025-03-15T12:00:00.000Z"
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

---

### GET /users/:id

- **Pública:** não
- **Token:** sim — access token (usuário deve ser ADMIN).
- **Body:** não.
- **Descrição:** Retorna um usuário pelo ID.
- **Parâmetros:** `id` na URL (path).

**Exemplo de requisição:** `GET /users/550e8400-e29b-41d4-a716-446655440000` com header `Authorization: Bearer <access_token>`.
