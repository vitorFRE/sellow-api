# Feedback module

Signed-in users can send feedback.

The platform (`SUPER_ADMIN`) controls feedback.

Feedback is global.
The list is not isolated by workspace.

On create, the system stores the active workspace as context (`workspaceId`).

**Controller:** `FeedbackController`  
**Prefix:** `/feedback`

## Concepts

| Concept | Description |
| ------- | ----------- |
| **Send** | Any member of the active workspace (`MEMBER`, `ADMIN`, `OWNER`) can create feedback |
| **Own history** | The signed-in user lists only the feedback that the user sent (`GET /feedback/mine`) |
| **Control** | Only `SUPER_ADMIN` lists all feedback. Only `SUPER_ADMIN` changes status and internal note |
| **Workspace context** | `workspaceId` is set automatically on create from the header `X-Workspace-Id` |

## Enums

### `FeedbackType`

`BUG` · `SUGGESTION` · `OTHER`

### `FeedbackStatus`

`OPEN` · `IN_REVIEW` · `RESOLVED` · `CLOSED`

Default in the database on create: `OPEN`.

---

## How to sign in and authorize

| Route | `Authorization` | `X-Workspace-Id` | Who can access |
| ----- | ----------------- | ------------------ | -------------- |
| `POST /feedback/create` | access token | **yes** | `MEMBER`, `ADMIN`, `OWNER` in the workspace |
| `GET /feedback/mine` | access token | no | signed-in user (own items only) |
| `GET /feedback` | access token | no | `SUPER_ADMIN` |
| `PATCH /feedback/:id` | access token | no | `SUPER_ADMIN` |

Routes with `@SkipWorkspace()` (`mine`, admin list, patch) do not need `X-Workspace-Id`.

---

## POST /feedback/create

Creates feedback in the active workspace.

Initial status: `OPEN`.

**Headers:**

```
Authorization: Bearer <access_token>
X-Workspace-Id: <workspace-uuid>
```

**Body (JSON):**

| Field | Required | Notes |
| ----- | -------- | ----- |
| `type` | yes | enum `FeedbackType` |
| `message` | yes | string; minimum 10, maximum 2000 characters |

**Example:**

```json
{
  "type": "BUG",
  "message": "Leads do not move in the pipeline."
}
```

**Response:** `Feedback` object with relations `user` (`id`, `name`, `email`) and `workspace` (`id`, `name`).

**Common errors:**

| Status | Situation |
| ------ | --------- |
| **400** | Body validation (short message, invalid type) |
| **400** | Missing header `x-workspace-id` |
| **403** | No membership in the workspace |

---

## GET /feedback/mine

Paginated list of feedback of the signed-in user.
The list is sorted by `createdAt` from newest to oldest.

Does not need `X-Workspace-Id`.

**Query (optional):**

| Parameter | Type | Default | Notes |
| --------- | ---- | ------- | ----- |
| `page` | int ≥ 1 | `1` | Page |
| `limit` | int 1–100 | `20` | Items per page |

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "workspaceId": "uuid",
      "type": "BUG",
      "message": "Leads do not move in the pipeline.",
      "status": "OPEN",
      "adminNote": null,
      "createdAt": "2026-07-04T20:34:00.000Z",
      "updatedAt": "2026-07-04T20:34:00.000Z",
      "user": {
        "id": "uuid",
        "name": "Vitor",
        "email": "vitor@teste.com"
      },
      "workspace": {
        "id": "uuid",
        "name": "Sellow"
      }
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

## GET /feedback

Paginated list of all platform feedback.

Only `SUPER_ADMIN`.

Does not need `X-Workspace-Id`.

**Query (optional):**

| Parameter | Type | Notes |
| --------- | ---- | ----- |
| `page` | int ≥ 1 | Default `1` |
| `limit` | int 1–100 | Default `20` |
| `status` | `FeedbackStatus` | Filters by status |
| `type` | `FeedbackType` | Filters by category |
| `workspaceId` | UUID | Filters by source workspace |
| `search` | string (max 200) | Searches in message, user name/email, and workspace name |
| `createdFrom` | ISO 8601 date | Start date (inclusive) |
| `createdTo` | ISO 8601 date | End date (inclusive, until 23:59:59 UTC) |

Active filters are combined with **AND**.

**Example:**

```
GET /feedback?status=OPEN&type=BUG&search=pipeline&createdFrom=2026-07-01&page=1&limit=10
```

**Response:** same format `{ data, meta }` as `GET /feedback/mine`.
The list includes all feedback that matches the filters.

**Errors:**

| Status | Situation |
| ------ | --------- |
| **403** | User without role `SUPER_ADMIN` |

---

## PATCH /feedback/:id

Changes the status and/or the internal note of a feedback item.

Only `SUPER_ADMIN`.

Does not need `X-Workspace-Id`.

**Parameter:** `id` — UUID v4 of the feedback.

**Body (JSON):**

| Field | Required | Notes |
| ----- | -------- | ----- |
| `status` | no | enum `FeedbackStatus` |
| `adminNote` | no | string (max 2000); send `null` to clear |

Send at least one field in the body.

**Example:**

```json
{
  "status": "IN_REVIEW",
  "adminNote": "We check the pipeline issue."
}
```

**Response:** changed `Feedback` object (with `user` and `workspace`).

**Errors:**

| Status | Situation |
| ------ | --------- |
| **403** | User without role `SUPER_ADMIN` |
| **404** | `Feedback não encontrado` |

---

## Model `Feedback` (Prisma)

| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | UUID | PK |
| `userId` | UUID | FK → `User` (cascade on delete) |
| `workspaceId` | UUID? | FK → `Workspace` (set null on delete) |
| `type` | `FeedbackType` | Feedback category |
| `message` | string | Content sent by the user |
| `status` | `FeedbackStatus` | Default `OPEN` |
| `adminNote` | string? | Internal note. Only super admin can see it |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

---

## Recommended flow in the front end

1. **Send feedback:** sidebar modal → `POST /feedback/create` with `X-Workspace-Id` of the active workspace.
2. **User history:** Settings → My feedback → `GET /feedback/mine` (no workspace header).
3. **Super admin panel:** Settings → Feedback → `GET /feedback` with filters; `PATCH /feedback/:id` for status and internal note.
