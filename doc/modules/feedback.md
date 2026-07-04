# Módulo Feedback

Envio de feedback pelos usuários logados e gerenciamento pela plataforma (`SUPER_ADMIN`). O feedback é **global** (não isolado por workspace na listagem), mas no envio o sistema grava o **workspace ativo** como contexto (`workspaceId`).

**Controller:** `FeedbackController`  
**Prefixo:** `/feedback`

## Conceitos

| Conceito | Descrição |
| -------- | --------- |
| **Envio** | Qualquer membro do workspace ativo (`MEMBER`, `ADMIN`, `OWNER`) pode criar feedback. |
| **Histórico próprio** | Usuário autenticado lista apenas os feedbacks que ele enviou (`GET /feedback/mine`). |
| **Gerenciamento** | Apenas `SUPER_ADMIN` lista todos e atualiza status/nota interna. |
| **Contexto de workspace** | `workspaceId` é preenchido automaticamente no create a partir do header `X-Workspace-Id`. |

## Enums

### `FeedbackType`

`BUG` · `SUGGESTION` · `OTHER`

### `FeedbackStatus`

`OPEN` · `IN_REVIEW` · `RESOLVED` · `CLOSED`

Padrão no banco ao criar: `OPEN`.

---

## Autenticação e autorização

| Rota | `Authorization` | `X-Workspace-Id` | Quem acessa |
| ---- | ----------------- | ------------------ | ----------- |
| `POST /feedback/create` | access token | **sim** | `MEMBER`, `ADMIN`, `OWNER` no workspace |
| `GET /feedback/mine` | access token | não | usuário autenticado (só os próprios) |
| `GET /feedback` | access token | não | `SUPER_ADMIN` |
| `PATCH /feedback/:id` | access token | não | `SUPER_ADMIN` |

Rotas com `@SkipWorkspace()` (`mine`, listagem admin, patch) **não** exigem `X-Workspace-Id`.

---

## POST /feedback/create

Cria um feedback no workspace ativo. Status inicial: `OPEN`.

**Headers:**

```
Authorization: Bearer <access_token>
X-Workspace-Id: <uuid-do-workspace>
```

**Body (JSON):**

| Campo | Obrigatório | Observação |
| ----- | ----------- | ---------- |
| `type` | sim | enum `FeedbackType` |
| `message` | sim | string; mínimo 10, máximo 2000 caracteres |

**Exemplo:**

```json
{
  "type": "BUG",
  "message": "Não está movendo leads no pipeline."
}
```

**Resposta:** objeto `Feedback` com relações `user` (`id`, `name`, `email`) e `workspace` (`id`, `name`).

**Erros comuns:**

| Status | Situação |
| ------ | -------- |
| **400** | Validação do body (mensagem curta, tipo inválido) |
| **400** | Header `x-workspace-id` ausente |
| **403** | Sem membership no workspace |

---

## GET /feedback/mine

Lista paginada dos feedbacks **do usuário autenticado**, ordenados por `createdAt` descendente. Não exige `X-Workspace-Id`.

**Query (opcional):**

| Parâmetro | Tipo | Padrão | Observação |
| --------- | ---- | ------ | ---------- |
| `page` | int ≥ 1 | `1` | Página |
| `limit` | int 1–100 | `20` | Itens por página |

**Resposta:**

```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "workspaceId": "uuid",
      "type": "BUG",
      "message": "Não está movendo leads no pipeline.",
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

Lista paginada de **todos** os feedbacks da plataforma. Apenas **`SUPER_ADMIN`**. Não exige `X-Workspace-Id`.

**Query (opcional):**

| Parâmetro | Tipo | Observação |
| --------- | ---- | ---------- |
| `page` | int ≥ 1 | Padrão `1` |
| `limit` | int 1–100 | Padrão `20` |
| `status` | `FeedbackStatus` | Filtra por status |
| `type` | `FeedbackType` | Filtra por categoria |
| `workspaceId` | UUID | Filtra por workspace de origem |
| `search` | string (max 200) | Busca em mensagem, nome/e-mail do usuário e nome do workspace |
| `createdFrom` | ISO 8601 date | Data inicial (inclusive) |
| `createdTo` | ISO 8601 date | Data final (inclusive, até 23:59:59 UTC) |

Filtros ativos são combinados com **AND**.

**Exemplo:**

```
GET /feedback?status=OPEN&type=BUG&search=pipeline&createdFrom=2026-07-01&page=1&limit=10
```

**Resposta:** mesmo formato `{ data, meta }` de `GET /feedback/mine`, com todos os feedbacks que atendem aos filtros.

**Erros:**

| Status | Situação |
| ------ | -------- |
| **403** | Usuário sem role `SUPER_ADMIN` |

---

## PATCH /feedback/:id

Atualiza status e/ou nota interna de um feedback. Apenas **`SUPER_ADMIN`**. Não exige `X-Workspace-Id`.

**Parâmetro:** `id` — UUID v4 do feedback.

**Body (JSON):**

| Campo | Obrigatório | Observação |
| ----- | ----------- | ---------- |
| `status` | não | enum `FeedbackStatus` |
| `adminNote` | não | string (max 2000); envie `null` para limpar |

Pelo menos um campo deve ser enviado no body.

**Exemplo:**

```json
{
  "status": "IN_REVIEW",
  "adminNote": "Investigando o problema no pipeline."
}
```

**Resposta:** objeto `Feedback` atualizado (com `user` e `workspace`).

**Erros:**

| Status | Situação |
| ------ | -------- |
| **403** | Usuário sem role `SUPER_ADMIN` |
| **404** | `Feedback não encontrado` |

---

## Modelo `Feedback` (Prisma)

| Campo | Tipo | Observação |
| ----- | ---- | ---------- |
| `id` | UUID | PK |
| `userId` | UUID | FK → `User` (cascade on delete) |
| `workspaceId` | UUID? | FK → `Workspace` (set null on delete) |
| `type` | `FeedbackType` | Categoria do feedback |
| `message` | string | Conteúdo enviado pelo usuário |
| `status` | `FeedbackStatus` | Padrão `OPEN` |
| `adminNote` | string? | Nota interna visível só para super admin |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

---

## Fluxo recomendado no front-end

1. **Enviar feedback:** modal na sidebar → `POST /feedback/create` com `X-Workspace-Id` do workspace ativo.
2. **Histórico do usuário:** Configurações → Meus feedbacks → `GET /feedback/mine` (sem header de workspace).
3. **Painel super admin:** Configurações → Feedbacks → `GET /feedback` com filtros; `PATCH /feedback/:id` para status e nota interna.
