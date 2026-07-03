# Módulo Loss Reasons (Motivos de Perda)

CRUD de motivos de perda **por workspace**. Usados ao mover lead para `LOST`. Rotas exigem **access token**, header **`X-Workspace-Id`** e role no workspace conforme tabela abaixo.

**Controller:** `LossReasonController`  
**Prefixo:** `/loss-reasons`

## Autenticação e autorização

**Headers obrigatórios:**

```
Authorization: Bearer <access_token>
X-Workspace-Id: <uuid-do-workspace>
```

| Rota | Roles no workspace |
| ---- | ------------------ |
| `GET /loss-reasons`, `GET /loss-reasons/:id` | `OWNER`, `ADMIN`, `MEMBER` |
| `POST`, `PATCH`, `DELETE` | `OWNER`, `ADMIN` |

- Usuário sem membership no workspace → **403 Forbidden**.
- Nome do motivo é único **dentro do workspace** (`workspaceId` + `name`).

---

## POST /loss-reasons/create

Cria um novo motivo de perda no workspace ativo.

**Body (JSON):**

| Campo | Obrigatório | Observação |
| ----- | ----------- | ---------- |
| `name` | sim | string; único no workspace |
| `description` | não | string |

**Respostas:**

- **201** — objeto `LossReason` criado.
- **409** — `Motivo de perda já cadastrado` (nome duplicado no workspace).

---

## GET /loss-reasons

Lista motivos de perda do workspace ativo, ordenados por nome (`asc`).

**Resposta:** array de `LossReason`.

---

## GET /loss-reasons/:id

Busca um motivo de perda por UUID **no workspace ativo**.

**Parâmetro:** `id` — UUID v4.

**Respostas:**

- **200** — objeto `LossReason`.
- **404** — `Motivo de perda não encontrado` (id inexistente ou de outro workspace).

---

## PATCH /loss-reasons/:id

Atualiza nome e/ou descrição de um motivo de perda.

**Parâmetro:** `id` — UUID v4.

**Body (JSON):**

| Campo | Obrigatório | Observação |
| ----- | ----------- | ---------- |
| `name` | não | string; único no workspace |
| `description` | não | string |

**Respostas:**

- **200** — objeto `LossReason` atualizado.
- **404** — `Motivo de perda não encontrado`.
- **409** — `Já existe um motivo de perda com esse nome` (conflito de nome no workspace).

---

## DELETE /loss-reasons/:id

Remove um motivo de perda por UUID.

**Parâmetro:** `id` — UUID v4.

**Regra:** se houver leads **do workspace** com `lossReasonId` apontando para este motivo, a exclusão é **bloqueada** com **409** (`Motivo de perda está vinculado a N lead(s) e não pode ser removido`).

**Respostas:**

- **200** — `{ "data": "Motivo de perda \"<nome>\" removido." }`.
- **404** — `Motivo de perda não encontrado`.
- **409** — motivo em uso por leads.
