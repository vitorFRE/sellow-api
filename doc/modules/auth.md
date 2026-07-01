# Auth para Front-end

Guia prático para integrar autenticação no cliente usando as rotas de `/auth`.

**Controller:** `AuthController`  
**Prefixo:** `/auth`

## Conceitos importantes

- **Access token:** usado nas rotas protegidas (`/auth/me`, `/auth/logout`, etc.).
- **Refresh token:** usado somente em `POST /auth/refresh`.
- Ambos vão no header `Authorization: Bearer <token>`.
- `POST /auth/logout` invalida o **refresh token** salvo no banco.
- O **access token atual continua válido até expirar**.

## Fluxo recomendado no front-end

1. Fazer `POST /auth/login`.
2. Salvar `accessToken` e `refreshToken`.
3. Enviar `accessToken` em todas as chamadas protegidas.
4. Se receber `401` por token expirado, chamar `POST /auth/refresh` com `refreshToken`.
5. Atualizar os dois tokens com a resposta do refresh e repetir a requisição original.
6. No logout, chamar `POST /auth/logout` e limpar os tokens locais.

## Regras de envio de token

- `GET /auth/me` e `POST /auth/logout` -> enviar **access token**.
- `POST /auth/refresh` -> enviar **refresh token**.
- `POST /auth/login` e `POST /auth/register` -> sem token.

## Rotas

### POST /auth/register

- Pública: sim
- Body:

```json
{
  "email": "usuario@exemplo.com",
  "password": "senha12345",
  "name": "Nome do Usuário"
}
```

- Retorno: mesmo formato do login (`accessToken`, `refreshToken`, `user`)

### POST /auth/login

- Pública: sim
- Body:

```json
{
  "email": "usuario@exemplo.com",
  "password": "senha12345"
}
```

- Retorno:

```json
{
  "accessToken": "jwt_access",
  "refreshToken": "jwt_refresh",
  "user": {
    "id": "uuid",
    "email": "usuario@exemplo.com",
    "name": "Nome do Usuário",
    "role": "USER",
    "isActive": true
  }
}
```

### POST /auth/refresh

- Pública: sim (mas exige token)
- Header obrigatório:

```
Authorization: Bearer <refresh_token>
```

- Body: nenhum
- Retorno:

```json
{
  "accessToken": "novo_jwt_access",
  "refreshToken": "novo_jwt_refresh"
}
```

### GET /auth/me

- Pública: não
- Header obrigatório:

```
Authorization: Bearer <access_token>
```

- Body: nenhum
- Retorno: perfil do usuário autenticado (sem senha e sem refresh token)

### POST /auth/logout

- Pública: não
- Header obrigatório:

```
Authorization: Bearer <access_token>
```

- Status: `204 No Content`
- Body: nenhum
- Efeito no backend: remove o refresh token armazenado para o usuário.
- Impacto no front: o access token ainda pode funcionar até expirar; após isso, não será possível renovar sessão com refresh.
