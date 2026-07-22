# Auth for the front end

This guide shows how to connect the client to the `/auth` routes.

**Controller:** `AuthController`  
**Prefix:** `/auth`

## Main ideas

- **Access token:** Use this token on protected routes (`/auth/me`, `/auth/logout`, and other protected routes).
- **Refresh token:** Use this token only in `POST /auth/refresh`.
- Send each token in the header `Authorization: Bearer <token>`.
- `POST /auth/logout` removes the refresh token from the database.
- The current access token stays valid until it expires.

## Recommended flow in the front end

1. Call `POST /auth/login`.
2. Store `accessToken` and `refreshToken`.
3. Call `GET /auth/me` or `GET /workspaces`.
4. Select the active workspace.
5. On all business calls, send `accessToken` and the header `X-Workspace-Id`.
6. If you get `401` because the token expired, call `POST /auth/refresh` with `refreshToken`.
7. Replace both tokens with the values from the refresh response.
8. Send the original request again.
9. On logout, call `POST /auth/logout`.
10. Clear the tokens and the active workspace.

## Token rules

- `GET /auth/me` and `POST /auth/logout` — send the access token. Do not send `X-Workspace-Id`.
- `POST /auth/refresh` — send the refresh token.
- `POST /auth/login` and `POST /auth/register` — do not send a token.

## Routes

### POST /auth/register

- Public: yes
- Body:

```json
{
  "email": "user@example.com",
  "password": "password12345",
  "name": "User Name"
}
```

- Response: same format as login (`accessToken`, `refreshToken`, `user`)

### POST /auth/login

- Public: yes
- Body:

```json
{
  "email": "user@example.com",
  "password": "password12345"
}
```

- Response:

```json
{
  "accessToken": "jwt_access",
  "refreshToken": "jwt_refresh",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "USER",
    "isActive": true
  }
}
```

### POST /auth/refresh

- Public: yes (you must still send a token)
- Required header:

```
Authorization: Bearer <refresh_token>
```

- Body: none
- Response:

```json
{
  "accessToken": "new_jwt_access",
  "refreshToken": "new_jwt_refresh"
}
```

### GET /auth/me

- Public: no
- Required header:

```
Authorization: Bearer <access_token>
```

- Body: none
- Response: the signed-in user profile.
- The response does not include the password or the refresh token.
- The response includes workspaces:

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "role": "USER",
  "isActive": true,
  "createdAt": "2026-07-03T12:00:00.000Z",
  "updatedAt": "2026-07-03T12:00:00.000Z",
  "workspaces": [
    {
      "id": "00000000-0000-4000-8000-000000000001",
      "name": "Sellow",
      "role": "OWNER"
    }
  ]
}
```

`workspaces` lists the workspaces of the user.
Each item shows the role of the user in that workspace.

Use this list to build the workspace selector in the front end.

This route does not need the header `X-Workspace-Id`.

### POST /auth/logout

- Public: no
- Required header:

```
Authorization: Bearer <access_token>
```

- Status: `204 No Content`
- Body: none
- Effect on the server: the server removes the stored refresh token for the user.
- Effect on the client: the access token can still work until it expires.
- After that, you cannot renew the session with the refresh token.
