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
| `website` | não | string | Classificado na importação (ver abaixo) |
| `phone` | não | string | Normalizado para E.164 (`+55…` ou `+` + dígitos se já vier com 55) |
| `categories` | não | string[] | |
| `categoryName` | não | string | Se vazio, pode usar `categories[0]` |
| `url` | não | string | Usada para extrair `query_place_id` → `googlePlaceId` e gravada em `Lead.url` |

## Classificação do campo `website`

O valor de `website` do item **não** vai direto para `Lead.website`. O mapper analisa o link e grava em **um** campo:

| Link reconhecido | Campo no lead |
| ---------------- | ------------- |
| Instagram (`instagram.com`, subdomínios) | `instagram` |
| Facebook (`facebook.com`, `fb.com`, `fb.me`, subdomínios) | `facebook` |
| Qualquer outra URL | `website` |
| Vazio / ausente | `website`, `instagram` e `facebook` ficam `null` |

O campo `url` do item (link do Google Maps) **não** entra nessa classificação; serve só para `googlePlaceId` e `Lead.url`.

## Regras de aceite no mapper

1. `title` obrigatório e não vazio.
2. É necessário **telefone válido após normalização** **ou** **`googlePlaceId`** obtido de `url` (`?query_place_id=`).
3. `source` fixo: `google_maps`.

Sem (2), o item não vira lead válido e incrementa `skipped` no total do import.
