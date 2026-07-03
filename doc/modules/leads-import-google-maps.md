# Import Google Maps — shape do item

Usado em `POST /leads/import/google-maps` no array `items`.

**Headers obrigatórios:** `Authorization: Bearer <access_token>` e `X-Workspace-Id: <uuid-do-workspace>`. A importação cria/atualiza leads **apenas no workspace indicado**; deduplicação por `googlePlaceId` e `phone` é por workspace.

## `ImportGoogleMapsLeadItemDto`

| Campo | Obrigatório | Tipo | Notas |
| ----- | ----------- | ---- | ----- |
| `title` | sim | string | Vira `name` do lead; se vazio após trim, item é descartado |
| `totalScore` | não | number | |
| `reviewsCount` | não | number | |
| `street` | não | string | Não mapeado direto no lead atual |
| `city` | não | string | |
| `state` | não | string | UF normalizada para nome completo (BR) quando reconhecida |
| `countryCode` | não | string | Não usado no mapper atual |
| `website` | não | string | |
| `phone` | não | string | Normalizado para E.164 (`+55…` ou `+` + dígitos se já vier com 55) |
| `categories` | não | string[] | |
| `categoryName` | não | string | Se vazio, pode usar `categories[0]` |
| `url` | não | string | Usada para extrair `query_place_id` → `googlePlaceId` |

## Regras de aceite no mapper

1. `title` obrigatório e não vazio.
2. É necessário **telefone válido após normalização** **ou** **`googlePlaceId`** obtido de `url` (`?query_place_id=`).
3. `source` fixo: `google_maps`.

Sem (2), o item não vira lead válido e incrementa `skipped` no total do import.
