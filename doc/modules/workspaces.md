# Workspaces module

This module controls workspaces and members.

Each workspace keeps its own leads, loss reasons, and dashboard.

**Controller:** `WorkspaceController`  
**Prefix:** `/workspaces`

## Concepts

| Concept | Description |
| ------- | ----------- |
| **Workspace** | Data container (leads, loss reasons, and related data) |
| **Membership** | Link between `User` and `Workspace` with a workspace role |
| **Global role** | `USER` (default) or `SUPER_ADMIN` (platform) |
| **Workspace role** | `OWNER` · `ADMIN` · `MEMBER` |

One user can belong to many workspaces.
The user can have a different role in each workspace.

## Headers

| Route | `Authorization` | `X-Workspace-Id` |
| ----- | ----------------- | ------------------ |
| `POST /workspaces` | access token (`SUPER_ADMIN`) | no |
| `GET /workspaces` | access token | no |
| Routes `/workspaces/:id/members/*` | access token | **yes** (must match the workspace `:id`) |

Member routes need membership in the workspace from the header.

Exception: `SUPER_ADMIN` can open any existing workspace.

---

## POST /workspaces

Creates a new workspace.

Only `SUPER_ADMIN` can call this route.

**Body (JSON):**

| Field | Required | Notes |
| ----- | -------- | ----- |
| `name` | yes | string; name of the workspace |
| `ownerUserId` | no | UUID of an existing user. If you send it, that user becomes `OWNER` |

**Response:** `Workspace` object (`id`, `name`, `createdAt`, `updatedAt`).

---

## GET /workspaces

Lists the workspaces that the signed-in user can open.

- Standard user: only workspaces where the user is a member.
- `SUPER_ADMIN`: all workspaces. If the user is not a member, the effective `role` is `OWNER`.

**Response:** array of objects:

```json
[
  {
    "id": "00000000-0000-4000-8000-000000000001",
    "name": "Sellow",
    "role": "OWNER",
    "createdAt": "2026-07-03T12:00:00.000Z",
    "updatedAt": "2026-07-03T12:00:00.000Z"
  }
]
```

For `SUPER_ADMIN`, items can include `memberCount` (total members).

---

## GET /workspaces/:id/members

Lists the members of the workspace.

You must have the role `OWNER` or `ADMIN` in the workspace.

**Headers:** `Authorization` + `X-Workspace-Id: <id>` (same value as `:id`).

**Response:** array with `userId`, `role`, and `user` (email, name, isActive, and related fields).

---

## POST /workspaces/:id/members

Adds a member to the workspace.

The route creates a user or links an existing user.

You must have the role `OWNER` or `ADMIN` in the workspace.

**Body (JSON):**

| Field | Required | Notes |
| ----- | -------- | ----- |
| `email` | yes | valid email |
| `password` | conditional | required if the email does not exist; ignored if the user already exists |
| `name` | no | string; used when the route creates a new user |
| `role` | no | `OWNER` · `ADMIN` · `MEMBER` (default `MEMBER`) |

**Behavior:**

- New email → creates `User` and `WorkspaceMember`.
- Existing email → creates only `WorkspaceMember`. The current password does not change.
- Already a member → **409** (`Usuário já é membro deste workspace`).

**Response:**

```json
{
  "linked": false,
  "member": { /* WorkspaceMember + user */ }
}
```

`linked: true` means the user already existed.
In that case, the route only linked the user.

---

## PATCH /workspaces/:id/members/:userId

Changes the role of a member.

You must have the role `OWNER` or `ADMIN` in the workspace.

**Body (JSON):**

| Field | Required | Notes |
| ----- | -------- | ----- |
| `role` | no | `OWNER` · `ADMIN` · `MEMBER` |

Only `OWNER` can set a member to `OWNER`.

You cannot set the only `OWNER` of the workspace to a lower role.

---

## DELETE /workspaces/:id/members/:userId

Removes membership.

Only `OWNER` can call this route.

You cannot remove the only `OWNER` of the workspace.

**Account policy:** when a user with global role `USER` loses the last membership, the system removes the account.

The system never removes `SUPER_ADMIN` users in this flow, even if they have no membership.

**Response:**

```json
{
  "data": "Membro removido do workspace.",
  "userDeleted": true
}
```

| Field | Description |
| ----- | ----------- |
| `data` | Confirmation message |
| `userDeleted` | `true` if the system removed the global user account; `false` if the account still exists (another workspace or `SUPER_ADMIN`) |

After the system removes the account, tokens of that user return **401** on signed-in routes.
