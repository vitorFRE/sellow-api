# Users module

This module lists the members of the active workspace.

It does not list all users of the platform.

Only `OWNER` or `ADMIN` in the workspace can call these routes.

**Controller:** `UsersController`  
**Prefix:** `/users`

## How to sign in and authorize

**Required headers:**

```
Authorization: Bearer <access_token>
X-Workspace-Id: <workspace-uuid>
```

- All routes need a JWT access token and membership in the workspace.
- You must have the role `OWNER` or `ADMIN` in the workspace (`WorkspaceRolesGuard`).
- **Body:** no route in this module sends a body (GET only).

To add or remove members, use the routes in [workspaces.md](./workspaces.md).

Examples: `POST /workspaces/:id/members` and related routes.

---

## Routes

### GET /users

- **Public:** no
- **Token:** yes — access token
- **Header:** `X-Workspace-Id`
- **Body:** no
- **Description:** Lists the members of the workspace with pagination.

**Query params:**

| Parameter | Type | Required | Default | Maximum | Description |
|-----------|------|----------|---------|---------|-------------|
| page | number | no | 1 | — | Current page |
| limit | number | no | 20 | 100 | Items per page |

**Request example:**

```
GET /users?page=1&limit=20
Authorization: Bearer <access_token>
X-Workspace-Id: 00000000-0000-4000-8000-000000000001
```

**Response example:**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "User Name",
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

`workspaceRole` is the role of the user in this workspace (`OWNER`, `ADMIN`, or `MEMBER`).

This list does not return the global field `User.role` (`USER` / `SUPER_ADMIN`).

---

### GET /users/:id

- **Public:** no
- **Token:** yes — access token
- **Header:** `X-Workspace-Id`
- **Body:** no
- **Description:** Returns one member by `userId`, if that user belongs to the active workspace.
- **Parameters:** `id` in the URL (user UUID).

**Request example:**

```
GET /users/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <access_token>
X-Workspace-Id: 00000000-0000-4000-8000-000000000001
```

**Response:** same shape as one item in `GET /users` (includes `workspaceRole`).

**404** — `Usuário não encontrado neste workspace`.
