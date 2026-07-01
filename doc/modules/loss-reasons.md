# Módulo Loss Reasons (Motivos de Perda)

CRUD de motivos de perda. Todas as rotas exigem **access token** e papel **`ADMIN`** (`RolesGuard`).

**Controller:** `LossReasonController`  
**Prefixo:** `/loss-reasons`

## Autenticação e autorização

- Header: `Authorization: Bearer <access_token>`
- Usuário com `role` diferente de `ADMIN` recebe **403 Forbidden**.

---

## POST /loss-reasons/create

Cria um novo motivo de perda.

**Body (JSON):**

| Campo | Obrigatório | Observação |
| ----- | ----------- | ---------- |
| `name` | sim | string; único no sistema |
| `description` | não | string |

**Respostas:**

- **201** — objeto `LossReason` criado.
- **409** — `Motivo de perda já cadastrado` (nome duplicado).

---

## GET /loss-reasons

Lista todos os motivos de perda ordenados por nome (`asc`).

**Resposta:** array de `LossReason`.

---

## GET /loss-reasons/:id

Busca um motivo de perda por UUID.

**Parâmetro:** `id` — UUID v4.

**Respostas:**

- **200** — objeto `LossReason`.
- **404** — `Motivo de perda não encontrado`.

---

## PATCH /loss-reasons/:id

Atualiza nome e/ou descrição de um motivo de perda.

**Parâmetro:** `id` — UUID v4.

**Body (JSON):**

| Campo | Obrigatório | Observação |
| ----- | ----------- | ---------- |
| `name` | não | string; único no sistema |
| `description` | não | string |

**Respostas:**

- **200** — objeto `LossReason` atualizado.
- **404** — `Motivo de perda não encontrado`.
- **409** — `Já existe um motivo de perda com esse nome` (conflito de nome).

---

## DELETE /loss-reasons/:id

Remove um motivo de perda por UUID.

**Parâmetro:** `id` — UUID v4.

**Regra:** se houver leads com `lossReasonId` apontando para este motivo, a exclusão é **bloqueada** com **409** (`Motivo de perda está vinculado a N lead(s) e não pode ser removido`).

**Respostas:**

- **200** — `{ "data": "Motivo de perda \"<nome>\" removido." }`.
- **404** — `Motivo de perda não encontrado`.
- **409** — motivo em uso por leads.
