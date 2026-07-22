# Integrations module

This module is a generic layer for async integrations with external providers.

The first provider is Apify.

The first use case is Google Maps Leads.
The flow is: scrape → automatic lead import in the workspace.

**Controllers:** `GoogleMapsLeadsController`, `IntegrationRunController`, `ApifyWebhookController`  
**Prefixes:** `/integrations/google-maps-leads`, `/integrations/runs`, `/webhooks`

The sync import `POST /leads/import/google-maps` stays available.

After the Actor ends, the Apify integration uses the same `LeadImportService` again.

---

## Concepts

| Concept | Description |
| ------- | ----------- |
| **Provider** | External service (`APIFY`). One platform token (`APIFY_TOKEN`). |
| **Type** | Product use case (`GOOGLE_MAPS_LEADS`). |
| **IntegrationRun** | Local record of one run (status, input, `externalRunId`, `datasetId`, `importSummary`). |
| **Webhook + cron** | The webhook gives low latency. A cron every 1 minute syncs `PENDING`/`RUNNING` runs if the webhook fails. |
| **Raw dataset** | Not stored in the database. The system stores `datasetId` and the import summary. The raw data stays in Apify. |

### Flow

```text
Client
  → POST /integrations/google-maps-leads/runs
  → Backend starts the Actor in Apify and saves IntegrationRun (RUNNING)
  → Backend responds immediately

Apify ends
  → Webhook POST /webhooks/apify  and/or  Cron (1 min)
  → GET run in Apify (source of truth)
  → If SUCCEEDED: status IMPORTING → page dataset → LeadImportService
  → COMPLETED / COMPLETED_WITH_ERRORS (+ importSummary)
```

### Limits (MVP)

- Maximum 1 active run per workspace and type (`PENDING`, `RUNNING`, or `IMPORTING`). A new attempt returns **409**.
- Maximum 10 items in `searchQueries`.
- `maxResults` is between 1 and 200 (default 50).
- Search area: circle with `radiusMeters` between 100 and 50000 (50 km).

---

## Enums

### `IntegrationProvider`

`APIFY`

### `IntegrationType`

`GOOGLE_MAPS_LEADS`

### `IntegrationRunStatus`

| Status | Meaning |
| ------ | ------- |
| `PENDING` | Created locally. Not yet confirmed or started in the provider |
| `RUNNING` | The run is active in Apify |
| `IMPORTING` | Apify returned `SUCCEEDED`. The system imports leads into the workspace |
| `COMPLETED` | Import finished. No item failures |
| `COMPLETED_WITH_ERRORS` | Import finished with `failed > 0` |
| `FAILED` | Failure in Apify or in the import |
| `ABORTED` | Stopped by the user (or mirrored from Apify) |
| `TIMED_OUT` | Timeout in Apify |

---

## Environment variables (Apify)

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `APIFY_TOKEN` | yes (prod) | API token of the platform Apify account (not per workspace). Used in all API v2 calls. |
| `APIFY_GOOGLE_MAPS_ACTOR_ID` | yes (prod) | ID or username/name of the Google Maps Actor (example: `compass~crawler-google-places`). The client does not send `actorId` in the body. |
| `APIFY_WEBHOOK_SECRET` | yes (prod) | Shared secret. Apify calls `POST /webhooks/apify?secret=<value>`. No match → **403**. |
| `APIFY_WEBHOOK_BASE_URL` | yes (prod) | Public API URL (no final path). Used to build the ad-hoc webhook at run start. Example: `https://api.yourdomain.com`. In development with a tunnel, use the ngrok URL. Local only without a public URL: leave empty — the cron still syncs. |

In production, `validate-env` requires the four variables above.

**Example (`.env`):**

```env
APIFY_TOKEN=apify_api_xxx
APIFY_GOOGLE_MAPS_ACTOR_ID=compass~crawler-google-places
APIFY_WEBHOOK_SECRET=a-long-random-secret
APIFY_WEBHOOK_BASE_URL=https://api.example.com
```

When `APIFY_WEBHOOK_BASE_URL` and `APIFY_WEBHOOK_SECRET` are set, each `startRun` registers an ad-hoc webhook in Apify for:

`ACTOR.RUN.SUCCEEDED` · `ACTOR.RUN.FAILED` · `ACTOR.RUN.TIMED_OUT` · `ACTOR.RUN.ABORTED`

Generated URL: `{APIFY_WEBHOOK_BASE_URL}/webhooks/apify?secret={APIFY_WEBHOOK_SECRET}`

---

## How to sign in and authorize

| Route | `Authorization` | `X-Workspace-Id` | Who can access |
| ----- | ----------------- | ------------------ | -------------- |
| `POST /integrations/google-maps-leads/runs` | access token | **yes** | `MEMBER`, `ADMIN`, `OWNER` |
| `GET /integrations/runs` | access token | **yes** | `MEMBER`, `ADMIN`, `OWNER` |
| `GET /integrations/runs/:id` | access token | **yes** | `MEMBER`, `ADMIN`, `OWNER` |
| `POST /integrations/runs/:id/abort` | access token | **yes** | `MEMBER`, `ADMIN`, `OWNER` |
| `POST /webhooks/apify` | no | no | public; authenticates with `?secret=` |

---

## POST /integrations/google-maps-leads/runs

Starts a scrape in Apify.
Creates an `IntegrationRun` in the workspace.

The response is immediate.
The server does not wait for the Actor to end.

**Headers:**

```
Authorization: Bearer <access_token>
X-Workspace-Id: <workspace-uuid>
```

**Body (JSON):**

| Field | Required | Type | Notes |
| ----- | -------- | ---- | ----- |
| `searchQueries` | yes | `string[]` | 1–10 queries (min. 2, max. 200 chars each). Example: `["clinics", "gas station"]` |
| `lat` | yes | number | Latitude of the circle center (−90..90) |
| `lng` | yes | number | Longitude of the circle center (−180..180) |
| `radiusMeters` | yes | number | Radius in meters (100–50000) |
| `maxResults` | no | number | 1–200; default 50. Cap per search in the Actor (`maxCrawledPlacesPerSearch`). |

**Example:**

```json
{
  "searchQueries": ["dental offices", "clinics", "gas station"],
  "lat": -23.5505,
  "lng": -46.6333,
  "radiusMeters": 3000,
  "maxResults": 100
}
```

**Response (example):** `IntegrationRun` object with `status: "RUNNING"`, `externalRunId`, `input`, and related fields.

**Common errors:**

| Status | Situation |
| ------ | --------- |
| **400** | Body validation |
| **409** | An active run already exists (`PENDING` / `RUNNING` / `IMPORTING`) of type `GOOGLE_MAPS_LEADS` in the workspace |
| **500** | Missing `APIFY_TOKEN` / Actor ID, or Apify API failure (local run marked `FAILED`) |

### Input sent to the Actor (Apify)

The backend builds the payload.
The client does not see this payload.

The backend does not send `locationQuery`.
The area comes only from the circle:

```json
{
  "searchStringsArray": ["dental offices", "clinics", "gas station"],
  "customGeolocation": {
    "type": "Point",
    "coordinates": [-46.6333, -23.5505],
    "radiusKm": 3
  },
  "maxCrawledPlacesPerSearch": 100,
  "language": "pt-BR",
  "includeWebResults": false
}
```

`coordinates` follow GeoJSON: `[longitude, latitude]`.

`radiusKm` = `radiusMeters / 1000`.

---

## GET /integrations/runs

Lists the runs of the workspace (newest first), with pagination.

**Query:**

| Param | Type | Notes |
| ----- | ---- | ----- |
| `page` | number | default 1 |
| `limit` | number | default 20, max. 100 |
| `status` | enum | filters by `IntegrationRunStatus` |
| `type` | enum | filters by `IntegrationType` |

**Response:**

```json
{
  "data": [ /* IntegrationRun[] */ ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

## GET /integrations/runs/:id

Returns one run of the workspace.

**Errors:** **404** if the run does not exist or belongs to another workspace.

---

## POST /integrations/runs/:id/abort

Stops the run in Apify (if `externalRunId` exists).
Marks the run locally as `ABORTED`.

Allowed only if the status is `PENDING` or `RUNNING`.

Otherwise → **409**.

---

## POST /webhooks/apify

Apify callback.
Public (`@Public` + `@SkipWorkspace`).

**Query:** `secret` — must match `APIFY_WEBHOOK_SECRET`.

**Body (partial):** Apify sends a payload with `resource.id` = external runId.

The backend does not trust the event alone.

It always calls `GET` on the Apify API.
It then runs the same `syncRun` as the cron.

**Response:** `{ "ok": true }` (or `{ "ok": true, "ignored": true }` if there is no `resource.id`).

**Errors:** **403** if the secret is invalid or missing.

---

## Relevant `IntegrationRun` fields

| Field | Description |
| ----- | ----------- |
| `id` | Internal UUID |
| `workspaceId` | Owner workspace |
| `provider` / `type` | Provider and use case |
| `status` | State machine above |
| `externalRunId` | Run ID in Apify |
| `externalActorId` | Actor used |
| `datasetId` | Default Apify dataset (for re-fetch / debug) |
| `input` | JSON with `searchQueries`, `lat`, `lng`, `radiusMeters`, `maxResults` |
| `importSummary` | `{ itemCount, created, updated, skipped, failed }` after import |
| `errorMessage` | Message on failure / abort |
| `startedAt` / `finishedAt` | Timestamps |
| `createdById` | User who started the run |

---

## Relation to the sync import

| Flow | Endpoint | Who sends the items |
| ---- | -------- | ------------------- |
| Sync | `POST /leads/import/google-maps` | Client (`items` array) |
| Async (Apify) | `POST /integrations/google-maps-leads/runs` | Apify dataset → normalization → same `LeadImportService` |

Item shape after normalization: [leads-import-google-maps.md](./leads-import-google-maps.md).
