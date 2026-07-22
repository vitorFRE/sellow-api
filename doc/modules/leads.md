# Leads module

This module lets you create, read, change, and remove leads in the active workspace.
You can also import leads.

Routes need:

- an access token
- the header `X-Workspace-Id`
- a workspace role as shown below (`WorkspaceRolesGuard`)

**Controller:** `LeadsController`  
**Prefix:** `/leads`

## How to sign in and authorize

**Required headers:**

```
Authorization: Bearer <access_token>
X-Workspace-Id: <workspace-uuid>
```

| Route | Workspace roles |
| ----- | --------------- |
| `GET /leads`, `GET /leads/:id` | `OWNER`, `ADMIN`, `MEMBER` |
| `GET /leads/:id/notes`, `GET /leads/:id/follow-up` | `OWNER`, `ADMIN`, `MEMBER` |
| `POST /leads/create`, `POST /leads/import/google-maps` | `OWNER`, `ADMIN`, `MEMBER` |
| `PATCH /leads/:id`, `PATCH /leads/:id/status`, `PATCH /leads/:id/import-review` | `OWNER`, `ADMIN`, `MEMBER` |
| `PUT /leads/:id/notes`, `PUT /leads/:id/follow-up`, `DELETE /leads/:id/follow-up` | `OWNER`, `ADMIN`, `MEMBER` |
| `DELETE /leads/delete/:id` | `OWNER`, `ADMIN` |

For async import with Apify (scrape + import), see [integrations.md](./integrations.md).

The sync endpoint above stays valid for a body with `items[]`.

`MEMBER` is the seller profile.
A `MEMBER` can do the full sales flow on leads.
A `MEMBER` cannot remove a lead.

- User without membership in the workspace → **403 Forbidden**.
- Global `SUPER_ADMIN` bypasses the role check, but still needs the header with a valid workspace.

## Enum `LeadImportReview`

Accepted values in `PATCH /leads/:id/import-review` and in `GET /leads?importReview=`:

`POSITIVE` · `NEGATIVE` · `UNEVALUATED`

`UNEVALUATED` is only for the list filter.
It means leads that are not yet reviewed (`importReview` is null in the database).

---

## Enum `LeadStatus`

Accepted values in:

- `CreateLeadDto.status` (when sent)
- `GET /leads?status=`
- the body of `PATCH /leads/:id/status`

Values:

`IMPORTED` · `NEW` · `CONTACTED` · `QUALIFYING` · `BRIEFING` · `PROPOSAL_SENT` · `NEGOTIATION` · `WON` · `LOST`

Default in the database if omitted: `NEW`.

Google Maps import (`POST /leads/import/google-maps`) always stores `status: IMPORTED` (create and upsert).

---

## POST /leads/create

Creates a lead manually.

**Body (JSON):**

| Field | Required | Notes |
| ----- | -------- | ----- |
| `name` | yes | string |
| `email` | no | unique in the workspace; conflict → **409** |
| `phone` | no | BR format (`@IsPhoneNumber('BR')`); unique in the workspace; conflict → **409** |
| `budget` | no | number ≥ 0 |
| `status` | no | enum `LeadStatus` |
| `source` | no | string |
| `totalScore`, `reviewsCount` | no | numbers (Google Maps / metrics) |
| `city`, `state` | no | strings |
| `latitude`, `longitude` | no | numbers (map; −90..90 / −180..180) |
| `url`, `website` | no | valid URLs |
| `instagram`, `facebook` | no | valid URLs (social networks) |
| `categoryName` | no | string |
| `googlePlaceId` | no | string; unique in the workspace if filled |

**Response:** `Lead` object (Prisma).
The object has `id`, `createdAt`, and `updatedAt`.

Decimal fields such as `budget` can appear as strings in JSON.

---

## GET /leads

Lists the leads of the active workspace.
The list has pagination and optional filters.

If several filters are active at the same time, the system combines them with **AND**.

If only one filter is active, the server builds a simple `where` (no outer `AND`).

**Sort:** stable tie-break with `id` ascending in all cases.

Main sort field and direction:

| `sortBy` (default `updatedAt`) | Main `orderBy` | Notes |
| ------------------------------ | -------------- | ----- |
| `updatedAt` | `updatedAt` | Legacy list behavior |
| `totalScore` | `totalScore` | Needs non-null `totalScore` in `where`. Leads without a score are excluded |
| `reviewsCount` | `reviewsCount` | Needs non-null `reviewsCount` in `where` |

**`sortDir`:** `asc` or `desc`. Default **`desc`**.

This applies to the field selected in `sortBy`.
For `updatedAt`, the default order shows the newest first.

**Query:**

| Parameter | Default | Notes |
| --------- | ------- | ----- |
| `page` | `1` | integer ≥ 1 |
| `limit` | `20` | integer 1–100 |
| `status` | — | optional; enum `LeadStatus`. List and `meta` include only leads with that status |
| `search` | — | optional; string (max. 200). After `trim`, keep leads where `name` or `phone` contains the term (`OR`). Match is a substring of the stored value. Phone is usually E.164. On SQLite/Prisma, search is `contains` and is case-sensitive |
| `minTotalScore` | — | optional; number ≥ 0. Only leads with non-null `totalScore` and `totalScore` ≥ value |
| `minReviewsCount` | — | optional; integer ≥ 0. Only leads with non-null `reviewsCount` and `reviewsCount` ≥ value |
| `hasWebsite` | — | optional; in the query string use `true` or `false`. `true`: `website` is not null and not empty. `false`: `website` is null or empty string. Does not use `instagram` or `facebook` |
| `importReview` | — | optional; `POSITIVE` · `NEGATIVE` · `UNEVALUATED`. Filters by like/dislike triage on import. Omitted: all |
| `sortBy` | `updatedAt` | `updatedAt` · `totalScore` · `reviewsCount` (literal values in the URL) |
| `sortDir` | `desc` | `asc` · `desc` |

**Response:**

```json
{
  "data": [
    /* Lead[] */
  ],
  "meta": {
    "total": 0,
    "page": 1,
    "limit": 20,
    "totalPages": 0
  }
}
```

`meta.total` and `meta.totalPages` show the set after all active filters.

When the lead is in `LOST`, the field `lossReason` returns as text (reason name), not only as an id.

**Examples:**

- `GET /leads?page=1&limit=20` — all leads, page 1 (sorted by `updatedAt` desc, tie-break `id` asc).
- `GET /leads?status=NEW&page=1&limit=20` — only leads in `NEW`.
- `GET /leads?search=acme&page=1&limit=20` — name or phone contains `acme` (case-sensitive on SQLite).
- `GET /leads?status=CONTACTED&search=1199&page=1&limit=20` — status `CONTACTED` and (`name` or `phone` contains `1199`).
- `GET /leads?hasWebsite=true&minTotalScore=4&sortBy=totalScore&sortDir=desc&page=1&limit=20` — with website, score ≥ 4, sorted by `totalScore` descending.
- `GET /leads?minReviewsCount=10&sortBy=reviewsCount&page=1&limit=20` — at least 10 reviews, sorted by `reviewsCount` descending (default `sortDir`).
- `GET /leads?status=IMPORTED&importReview=POSITIVE&page=1&limit=20` — imported leads marked as liked in triage.
- `GET /leads?status=IMPORTED&importReview=UNEVALUATED&page=1&limit=20` — imported leads not yet reviewed.

**400** — invalid query parameters (`class-validator` validation).

---

## GET /leads/:id

Gets a lead by UUID.

**Parameter:** `id` — UUID v4.

**Responses:**

- **200** — lead found in the workspace (includes `lossReason` as text when applicable)
- **404** — `Lead não encontrado`

The detail response does not include the notes text or the follow-up object.

Use the sub-resources below.

---

## GET /leads/:id/notes

Returns the free-text notes of the lead (field `notes` on model `Lead`).

**Parameter:** `id` — UUID v4.

**Response (200):**

```json
{
  "body": ""
}
```

`body` is always a string.

If there is no stored note, the value is an empty string.

**404** — `Lead não encontrado`

---

## PUT /leads/:id/notes

Fully replaces the notes text.
This is equal to one textarea in the front end.
The limit is `maxLength` of 8000 characters.

**Parameter:** `id` — UUID v4.

**Body (JSON):**

| Field | Required | Notes |
| ----- | -------- | ----- |
| `body` | yes | string; maximum **8000** characters |

**Response (200):** same shape as `GET /leads/:id/notes` with the stored `body`.

**404** — `Lead não encontrado`  
**400** — validation failure (for example, `body` above 8000 characters).

On save, the server sets `lastManualUpdateAt` of the lead.
This is consistent with Google Maps import.

---

## GET /leads/:id/follow-up

Returns the scheduled follow-up of the lead, if it exists.

The data is in table `LeadFollowUp` (1:1 relation with `Lead` via `leadId`).

When the lead is removed, the follow-up is removed in cascade.

**Parameter:** `id` — UUID v4.

**Response (200):**

- **`null`** — no follow-up record (no stored schedule).
- **Object** — active follow-up:

```json
{
  "nextContactAt": "2026-05-01T10:00:00.000Z",
  "channel": "WhatsApp",
  "ownerLabel": "Owner name",
  "reminder": "Optional text or null"
}
```

| Field | Type | Notes |
| ----- | ---- | ----- |
| `nextContactAt` | string | date/time in **ISO 8601** |
| `channel` | string | exactly one of: `WhatsApp`, `Ligação`, `E-mail`, `Visita` |
| `ownerLabel` | string | free label of the owner (max. 500 characters in the API) |
| `reminder` | string | optional on input; on output can be `null` if there is no reminder |

**404** — `Lead não encontrado`

---

## PUT /leads/:id/follow-up

Creates or changes the follow-up of the lead (`upsert` on `LeadFollowUp`).

Sets `lastManualUpdateAt` of the lead.

**Parameter:** `id` — UUID v4.

**Body (JSON):**

| Field | Required | Notes |
| ----- | -------- | ----- |
| `nextContactAt` | yes | string in ISO date format (`@IsDateString`) |
| `channel` | yes | one of: `WhatsApp`, `Ligação`, `E-mail`, `Visita` |
| `ownerLabel` | yes | string; maximum 500 characters |
| `reminder` | no | string; maximum 500 characters if sent |

**Response (200):** same object returned by `GET /leads/:id/follow-up` when a follow-up exists.

**404** — `Lead não encontrado`  
**400** — validation failure (invalid channel, invalid date, string limits, and similar cases).

---

## DELETE /leads/:id/follow-up

Removes the follow-up record of the lead (UI “clear” semantics).

Sets `lastManualUpdateAt` of the lead.

**Parameter:** `id` — UUID v4.

**Response (200):** `null` (JSON body `null`).

**404** — `Lead não encontrado`

---

## PATCH /leads/:id/status

Changes only the `status` of the lead.
Example: drag a card on the Kanban.

**Parameter:** `id` — UUID v4.

**Body (JSON):**

| Field | Required | Notes |
| ----- | -------- | ----- |
| `status` | yes | enum `LeadStatus` |
| `lossReasonId` | yes (when `status = LOST`) | UUID of an existing `LossReason` |
| `lossReasonNote` | no | free complementary text for the reason |

**Rules:**

- Move to `LOST` without `lossReasonId` returns **400** (`É obrigatório informar o motivo de perda ao mover o lead para LOST`).
- `lossReasonId` that does not exist in this workspace returns **404** (`Motivo de perda não encontrado`).
- When you move to any status other than `LOST`, the system clears `lossReasonId` and `lossReasonNote`.

**Response:** changed `Lead` object (includes `updatedAt`).

**404** if the id does not exist (`Lead não encontrado`).

---

## PATCH /leads/:id

Partially changes the profile data of the lead.

Omitted fields in the body stay unchanged.

Send `null` to clear optional fields.

**Parameter:** `id` — UUID v4.

**Body (JSON) — all optional; at least one field required:**

| Field | Notes |
| ----- | ----- |
| `name` | string |
| `email` | valid email or `null` |
| `phone` | BR format (`@IsPhoneNumber('BR')`) or `null` |
| `budget` | number ≥ 0 or `null` |
| `source` | string or `null` |
| `city` | string or `null` |
| `state` | string or `null` |
| `latitude` | number or `null` (−90..90) |
| `longitude` | number or `null` (−180..180) |
| `url` | valid URL or `null` |
| `website` | valid URL or `null` |
| `instagram` | valid URL or `null` |
| `facebook` | valid URL or `null` |
| `categoryName` | string or `null` |

**Outside this route** (use the dedicated endpoints): `status`, `importReview`, `notes`, `follow-up`, `totalScore`, `reviewsCount`, `googlePlaceId`.

**Rules:**

- Empty body `{}` returns **400** (`Informe ao menos um campo para atualizar`).
- `email` or `phone` already used by another lead in the workspace → **409** (same messages as create).
- On save, the server sets `lastManualUpdateAt` (consistent with Google Maps import).

**Response:** changed `Lead` object (includes `lossReason` as text when applicable).

**404** — `Lead não encontrado`  
**400** — validation failure or empty body.

---

## PATCH /leads/:id/import-review

Sets or clears the like/dislike triage of an imported lead (`importReview`).

**Parameter:** `id` — UUID v4.

**Body (JSON):**

| Field | Required | Notes |
| ----- | -------- | ----- |
| `importReview` | yes | `POSITIVE` · `NEGATIVE` · `null` (clear triage) |

**Rules:**

- The review stays when you move the lead to another status (example: `IMPORTED` → `NEW`).
- Does not set `lastManualUpdateAt` (triage does not block Google Maps re-import).

**Response:** changed `Lead` object.
The object has `importReview`.

**404** if the id does not exist (`Lead não encontrado`).  
**400** — invalid value in `importReview`.

---

## DELETE /leads/delete/:id

Removes a lead by UUID.

**Parameter:** `id` — UUID v4.

**Response:**

```json
{
  "data": "Lead <name> deletado."
}
```

**404** if the id does not exist.

---

## POST /leads/import/google-maps

Batch import in the active workspace from items in Google Maps format (scrape / export).

- **Headers:** `Authorization` + `X-Workspace-Id`
- **Body:** `{ "items": [ /* 1 to 500 items */ ] }`
- Each item follows `ImportGoogleMapsLeadItemDto` (main fields: `title` required; others optional).

**Response:** result summary:

```json
{
  "created": 0,
  "updated": 0,
  "skipped": 0,
  "failed": 0
}
```

`failed` counts items that could not be stored.

Details are not sent in the response (server log only).

The system ignores these items and counts them in `skipped`:

- items without `title`
- items without a valid phone and without `googlePlaceId` from `url`

See mapper `mapGoogleMapsItemToLead`.

Items with `googlePlaceId` do upsert in the workspace (`workspaceId` + `googlePlaceId`).

They change the existing lead only when there is no manual edit after the last import (`lastManualUpdateAt <= lastImportedAt`).

If there is a later manual edit (`lastManualUpdateAt > lastImportedAt`), the item is skipped.
This avoids overwrite.

Other valid items are created.
Phone deduplication applies in the workspace where applicable.

Item shape details: [leads-import-google-maps.md](./leads-import-google-maps.md).
