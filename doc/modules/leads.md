# Módulo Leads

CRUD e importação de leads. Todas as rotas exigem **access token** e papel **`ADMIN`** (`RolesGuard`).

**Controller:** `LeadsController`  
**Prefixo:** `/leads`

## Autenticação e autorização

- Header: `Authorization: Bearer <access_token>`
- Usuário com `role` diferente de `ADMIN` recebe **403 Forbidden**.

## Enum `LeadStatus`

Valores aceitos em `CreateLeadDto.status` (quando enviado), em `GET /leads?status=` e no body de `PATCH /leads/:id/status`:

`IMPORTED` · `NEW` · `CONTACTED` · `QUALIFYING` · `BRIEFING` · `PROPOSAL_SENT` · `NEGOTIATION` · `WON` · `LOST`

Padrão no banco se omitido: `NEW`.

Importação Google Maps (`POST /leads/import/google-maps`) grava sempre `status: IMPORTED` (create e upsert).

---

## POST /leads/create

Cria um lead manualmente.

**Body (JSON):**

| Campo                        | Obrigatório | Observação                                                     |
| ---------------------------- | ----------- | -------------------------------------------------------------- |
| `name`                       | sim         | string                                                         |
| `email`                      | não         | único no sistema; conflito → **409**                           |
| `phone`                      | não         | formato BR (`@IsPhoneNumber('BR')`); único; conflito → **409** |
| `budget`                     | não         | número ≥ 0                                                     |
| `status`                     | não         | enum `LeadStatus`                                              |
| `source`                     | não         | string                                                         |
| `totalScore`, `reviewsCount` | não         | números (Google Maps / métricas)                               |
| `city`, `state`              | não         | strings                                                        |
| `url`, `website`             | não         | URLs válidas                                                   |
| `categoryName`               | não         | string                                                         |
| `googlePlaceId`              | não         | string; único se preenchido                                    |

**Resposta:** objeto `Lead` (Prisma), incluindo `id`, `createdAt`, `updatedAt`. Campos `budget` (Decimal) podem vir como string na serialização JSON.

---

## GET /leads

Lista leads com paginação e filtros opcionais. Vários filtros ativos ao mesmo tempo são combinados com **AND** (interseção). Com **apenas um** filtro, o servidor monta um `where` simples (sem `AND` externo redundante).

**Ordenação:** desempate estável com **`id` ascendente** em todos os casos. Campo principal de ordenação e direção:

| `sortBy` (padrão `updatedAt`) | `orderBy` principal | Observação |
| ------------------------------- | -------------------- | ---------- |
| `updatedAt`                     | `updatedAt`        | Comportamento legado da listagem. |
| `totalScore`                    | `totalScore`       | Exige `totalScore` **não nulo** no `where` (leads sem nota não entram na lista). |
| `reviewsCount`                  | `reviewsCount`     | Exige `reviewsCount` **não nulo** no `where`. |

**`sortDir`:** `asc` ou `desc`. Padrão **`desc`**. Vale para o campo escolhido em `sortBy` (incluindo `updatedAt`: mais recentes primeiro quando omitido).

**Query:**

| Parâmetro         | Padrão      | Observação |
| ----------------- | ----------- | ---------- |
| `page`            | `1`         | inteiro ≥ 1 |
| `limit`           | `20`        | inteiro 1–100 |
| `status`          | —           | opcional; enum `LeadStatus`. Lista e `meta` consideram só leads nesse status. |
| `search`          | —           | opcional; string (máx. 200). Após `trim`, filtra em que **`name`** **ou** **`phone`** contém o termo (`OR`). Substring no valor armazenado (telefone costuma estar em E.164; o cliente pode enviar `+55…` ou só dígitos conforme o que bater no texto salvo). Com SQLite/Prisma, a busca é **`contains` sem modo case-insensitive** (sensível a maiúsculas/minúsculas conforme o dado gravado). |
| `minTotalScore`   | —           | opcional; número ≥ 0. Só leads com `totalScore` **não nulo** e `totalScore` **≥** valor. |
| `minReviewsCount` | —           | opcional; inteiro ≥ 0. Só leads com `reviewsCount` **não nulo** e `reviewsCount` **≥** valor. |
| `hasWebsite`      | —           | opcional; na query string use `true` ou `false`. `true`: `website` não nulo e não vazio. `false`: `website` nulo ou string vazia. |
| `sortBy`          | `updatedAt` | `updatedAt` · `totalScore` · `reviewsCount` (valores literais na URL). |
| `sortDir`         | `desc`      | `asc` · `desc`. |

**Resposta:**

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

`meta.total` e `meta.totalPages` refletem o conjunto após aplicar **todos** os filtros ativos.

Quando o lead estiver em `LOST`, o campo `lossReason` já é retornado em texto (nome do motivo), em vez de apenas id.

**Exemplos:**

- `GET /leads?page=1&limit=20` — todos os leads, página 1 (ordenado por `updatedAt` desc, desempate `id` asc).
- `GET /leads?status=NEW&page=1&limit=20` — só leads em `NEW`.
- `GET /leads?search=acme&page=1&limit=20` — nome ou telefone contém `acme` (case-sensitive no SQLite).
- `GET /leads?status=CONTACTED&search=1199&page=1&limit=20` — status `CONTACTED` **e** (`name` ou `phone` contém `1199`).
- `GET /leads?hasWebsite=true&minTotalScore=4&sortBy=totalScore&sortDir=desc&page=1&limit=20` — com website, nota ≥ 4, ordenados por `totalScore` descendente.
- `GET /leads?minReviewsCount=10&sortBy=reviewsCount&page=1&limit=20` — pelo menos 10 avaliações, ordenados por `reviewsCount` descendente (padrão de `sortDir`).

**400** — parâmetros de query inválidos (validação `class-validator`).

---

## GET /leads/:id

Busca um lead por UUID.

**Parâmetro:** `id` — UUID v4.

**Respostas:**

- **200** — lead encontrado (inclui `lossReason` em texto quando aplicável)
- **404** — `Lead não encontrado`

A resposta de detalhe **não** inclui o texto de anotações nem o objeto de follow-up; use os sub-recursos abaixo.

---

## GET /leads/:id/notes

Retorna o texto livre de anotações do lead (campo `notes` no modelo `Lead`).

**Parâmetro:** `id` — UUID v4.

**Resposta (200):**

```json
{
  "body": ""
}
```

`body` é sempre uma string. Se não houver nota gravada, vem string vazia.

**404** — `Lead não encontrado`

---

## PUT /leads/:id/notes

Substitui integralmente o texto de anotações (equivalente a um único textarea no front; alinhado a `maxLength` de 8000 caracteres).

**Parâmetro:** `id` — UUID v4.

**Body (JSON):**

| Campo  | Obrigatório | Observação                          |
| ------ | ----------- | ----------------------------------- |
| `body` | sim         | string; máximo **8000** caracteres |

**Resposta (200):** mesmo shape de `GET /leads/:id/notes` com o `body` persistido.

**404** — `Lead não encontrado`  
**400** — falha de validação (por exemplo, `body` acima de 8000 caracteres).

Ao salvar, o servidor atualiza `lastManualUpdateAt` do lead (coerente com importação Google Maps).

---

## GET /leads/:id/follow-up

Retorna o follow-up agendado do lead, se existir. Os dados ficam na tabela **`LeadFollowUp`** (relação 1:1 com `Lead` via `leadId`; ao apagar o lead, o follow-up é removido em cascata).

**Parâmetro:** `id` — UUID v4.

**Resposta (200):**

- **`null`** — não há registro de follow-up (nenhum agendamento persistido).
- **Objeto** — follow-up ativo:

```json
{
  "nextContactAt": "2026-05-01T10:00:00.000Z",
  "channel": "WhatsApp",
  "ownerLabel": "Nome do responsável",
  "reminder": "Texto opcional ou null"
}
```

| Campo           | Tipo   | Observação                                                                 |
| --------------- | ------ | -------------------------------------------------------------------------- |
| `nextContactAt` | string | data/hora em **ISO 8601**                                                  |
| `channel`       | string | exatamente um de: `WhatsApp`, `Ligação`, `E-mail`, `Visita`                |
| `ownerLabel`    | string | rótulo livre do responsável (máx. 500 caracteres na API)                   |
| `reminder`      | string | opcional na entrada; na saída pode ser `null` se não houver lembrete       |

**404** — `Lead não encontrado`

---

## PUT /leads/:id/follow-up

Cria ou atualiza o follow-up do lead (`upsert` em `LeadFollowUp`). Atualiza `lastManualUpdateAt` do lead.

**Parâmetro:** `id` — UUID v4.

**Body (JSON):**

| Campo           | Obrigatório | Observação                                                                 |
| --------------- | ----------- | -------------------------------------------------------------------------- |
| `nextContactAt` | sim         | string em formato de data ISO (`@IsDateString`)                            |
| `channel`       | sim         | um de: `WhatsApp`, `Ligação`, `E-mail`, `Visita`                           |
| `ownerLabel`    | sim         | string; máximo 500 caracteres                                              |
| `reminder`      | não         | string; máximo 500 caracteres se enviado                                   |

**Resposta (200):** mesmo objeto retornado por `GET /leads/:id/follow-up` quando há follow-up.

**404** — `Lead não encontrado`  
**400** — falha de validação (canal inválido, data inválida, limites de string, etc.).

---

## DELETE /leads/:id/follow-up

Remove o registro de follow-up do lead (semântica de “limpar” na UI). Atualiza `lastManualUpdateAt` do lead.

**Parâmetro:** `id` — UUID v4.

**Resposta (200):** `null` (corpo JSON `null`).

**404** — `Lead não encontrado`

---

## PATCH /leads/:id/status

Altera apenas o `status` do lead (ex.: arrastar card no Kanban).

**Parâmetro:** `id` — UUID v4.

**Body (JSON):**

| Campo            | Obrigatório                  | Observação                         |
| ---------------- | ---------------------------- | ---------------------------------- |
| `status`         | sim                          | enum `LeadStatus`                  |
| `lossReasonId`   | sim (quando `status = LOST`) | UUID de um `LossReason` existente  |
| `lossReasonNote` | não                          | texto livre complementar ao motivo |

**Regras:**

- Mover para `LOST` sem `lossReasonId` retorna **400** (`É obrigatório informar o motivo de perda ao mover o lead para LOST`).
- `lossReasonId` inexistente retorna **404** (`Motivo de perda não encontrado`).
- Ao mover para qualquer status diferente de `LOST`, os campos `lossReasonId` e `lossReasonNote` são limpos automaticamente.

**Resposta:** objeto `Lead` atualizado (inclui `updatedAt`).

**404** se o id não existir (`Lead não encontrado`).

---

## DELETE /leads/delete/:id

Remove um lead por UUID.

**Parâmetro:** `id` — UUID v4.

**Resposta:**

```json
{
  "data": "Lead <nome> deletado."
}
```

**404** se o id não existir.

---

## POST /leads/import/google-maps

Importação em lote a partir de itens no formato Google Maps (scraping / export).

- **Body:** `{ "items": [ /* 1 a 500 itens */ ] }`
- Cada item segue `ImportGoogleMapsLeadItemDto` (campos principais: `title` obrigatório; demais opcionais).

**Resposta:** agregado de processamento:

```json
{
  "created": 0,
  "updated": 0,
  "skipped": 0,
  "failed": 0
}
```

`failed` conta itens que não puderam ser persistidos; detalhes não são enviados na resposta (apenas log no servidor).

Itens **sem `title`** ou **sem telefone válido e sem `googlePlaceId` extraído da `url`** são ignorados e entram em `skipped` (ver mapper `mapGoogleMapsItemToLead`). Itens com `googlePlaceId` atualizam o lead existente apenas quando não há edição manual após a última importação (`lastManualUpdateAt <= lastImportedAt`). Se houver edição manual posterior (`lastManualUpdateAt > lastImportedAt`), o item é **skipped** para evitar sobrescrita. Demais válidos são **create**, com deduplicação por telefone onde aplicável.

Detalhes do shape de cada item: [leads-import-google-maps.md](./leads-import-google-maps.md).
