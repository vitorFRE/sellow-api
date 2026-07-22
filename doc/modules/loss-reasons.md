# Loss Reasons module

This module lets you create, read, change, and remove loss reasons in a workspace.

Use loss reasons when a lead moves to `LOST`.

Routes need an access token, the header `X-Workspace-Id`, and a workspace role as shown below.

**Controller:** `LossReasonController`  
**Prefix:** `/loss-reasons`

## How to sign in and authorize

**Required headers:**

```
Authorization: Bearer <access_token>
X-Workspace-Id: <workspace-uuid>
```

| Route | Workspace roles |
| ----- | --------------- |
| `GET /loss-reasons`, `GET /loss-reasons/:id` | `OWNER`, `ADMIN`, `MEMBER` |
| `POST`, `PATCH`, `DELETE` | `OWNER`, `ADMIN` |

- User without membership in the workspace → **403 Forbidden**.
- The name of a reason is unique in the workspace (`workspaceId` + `name`).

---

## POST /loss-reasons/create

Creates a new loss reason in the active workspace.

**Body (JSON):**

| Field | Required | Notes |
| ----- | -------- | ----- |
| `name` | yes | string; unique in the workspace |
| `description` | no | string |

**Responses:**

- **201** — created `LossReason` object.
- **409** — `Motivo de perda já cadastrado` (duplicate name in the workspace).

---

## GET /loss-reasons

Lists the loss reasons of the active workspace.

The list is sorted by name (`asc`).

**Response:** array of `LossReason`.

---

## GET /loss-reasons/:id

Gets a loss reason by UUID in the active workspace.

**Parameter:** `id` — UUID v4.

**Responses:**

- **200** — `LossReason` object.
- **404** — `Motivo de perda não encontrado` (id does not exist or belongs to another workspace).

---

## PATCH /loss-reasons/:id

Changes the name and/or the description of a loss reason.

**Parameter:** `id` — UUID v4.

**Body (JSON):**

| Field | Required | Notes |
| ----- | -------- | ----- |
| `name` | no | string; unique in the workspace |
| `description` | no | string |

**Responses:**

- **200** — changed `LossReason` object.
- **404** — `Motivo de perda não encontrado`.
- **409** — `Já existe um motivo de perda com esse nome` (name conflict in the workspace).

---

## DELETE /loss-reasons/:id

Removes a loss reason by UUID.

**Parameter:** `id` — UUID v4.

**Rule:** if leads in the workspace have `lossReasonId` set to this reason, the system blocks the removal with **409** (`Motivo de perda está vinculado a N lead(s) e não pode ser removido`).

**Responses:**

- **200** — `{ "data": "Motivo de perda \"<name>\" removido." }`.
- **404** — `Motivo de perda não encontrado`.
- **409** — the reason is in use by leads.
