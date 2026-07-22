# Google Maps import — item shape

Use this shape in `POST /leads/import/google-maps` in the `items` array.

The Apify integration uses the same shape after the Actor ends.

Flow: `POST /integrations/google-maps-leads/runs` → dataset → `LeadImportService`.

See [integrations.md](./integrations.md).

**Required headers:**

```
Authorization: Bearer <access_token>
X-Workspace-Id: <workspace-uuid>
```

The import creates or changes leads only in the workspace from the header.

The system deduplicates by `googlePlaceId` and by `phone` in each workspace.

## `ImportGoogleMapsLeadItemDto`

| Field | Required | Type | Notes |
| ----- | -------- | ---- | ----- |
| `title` | yes | string | Becomes the lead `name`. If empty after trim, the system discards the item. |
| `totalScore` | no | number | |
| `reviewsCount` | no | number | |
| `street` | no | string | Not mapped directly to the current lead |
| `city` | no | string | |
| `state` | no | string | BR state code becomes the full name when the system knows it |
| `latitude` | no | number | −90..90; stored in `Lead.latitude` (map) |
| `longitude` | no | number | −180..180; stored in `Lead.longitude` (map) |
| `countryCode` | no | string | Not used in the current mapper |
| `website` | no | string | Classified during import (see below) |
| `phone` | no | string | Normalized to E.164 (`+55…` or `+` + digits if it already includes 55) |
| `categories` | no | string[] | |
| `categoryName` | no | string | If empty, the mapper can use `categories[0]` |
| `url` | no | string | Used to get `query_place_id` → `googlePlaceId`. Also stored in `Lead.url` |

## How the system classifies `website`

The item `website` value does not go directly to `Lead.website`.

The mapper reads the link.
The mapper stores the link in one field only:

| Known link | Lead field |
| ---------- | ---------- |
| Instagram (`instagram.com`, subdomains) | `instagram` |
| Facebook (`facebook.com`, `fb.com`, `fb.me`, subdomains) | `facebook` |
| Any other URL | `website` |
| Empty / missing | `website`, `instagram`, and `facebook` stay `null` |

The item `url` field (Google Maps link) is not part of this classification.

It is used only for `googlePlaceId` and `Lead.url`.

## Acceptance rules in the mapper

1. `title` is required and must not be empty.
2. The item needs a valid phone after normalization, or a `googlePlaceId` from `url` (`?query_place_id=`).
3. `source` is fixed: `google_maps`.

If rule (2) fails, the item is not a valid lead.
The import increases `skipped` in the total.
