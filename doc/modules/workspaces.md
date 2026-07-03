# Módulo Workspaces

Gerenciamento de workspaces (isolamento de dados) e membros. Cada workspace possui seus próprios leads, motivos de perda e dashboard.

**Controller:** `WorkspaceController`  
**Prefixo:** `/workspaces`

## Conceitos

| Conceito | Descrição |
| -------- | --------- |
| **Workspace** | Container de dados (leads, loss reasons, etc.). |
| **Membership** | Vínculo `User` ↔ `Workspace` com role no workspace. |
| **Role global** | `USER` (padrão) ou `SUPER_ADMIN` (plataforma). |
| **Role no workspace** | `OWNER` · `ADMIN` · `MEMBER`. |

Um usuário pode pertencer a **vários** workspaces com roles diferentes em cada um.

## Headers

| Rota | `Authorization` | `X-Workspace-Id` |
| ---- | ----------------- | ------------------ |
| `POST /workspaces` | access token (`SUPER_ADMIN`) | não |
| `GET /workspaces` | access token | não |
| Rotas `/workspaces/:id/members/*` | access token | **sim** (deve ser o `:id` do workspace) |

Rotas de membros exigem membership no workspace indicado pelo header (exceto `SUPER_ADMIN`, que acessa qualquer workspace existente).

---

## POST /workspaces

Cria um novo workspace. Apenas **`SUPER_ADMIN`**.

**Body (JSON):**

| Campo | Obrigatório | Observação |
| ----- | ----------- | ---------- |
| `name` | sim | string; nome do workspace |
| `ownerUserId` | não | UUID de usuário existente; se enviado, vira `OWNER` do workspace |

**Resposta:** objeto `Workspace` (`id`, `name`, `createdAt`, `updatedAt`).

---

## GET /workspaces

Lista workspaces acessíveis ao usuário autenticado.

- Usuário comum: apenas workspaces em que é membro.
- `SUPER_ADMIN`: todos os workspaces (com `role` efetivo `OWNER` quando não é membro).

**Resposta:** array de objetos:

```json
[
  {
    "id": "00000000-0000-4000-8000-000000000001",
    "name": "Sellow",
    "role": "OWNER",
    "createdAt": "2026-07-03T12:00:00.000Z",
    "updatedAt": "2026-07-03T12:00:00.000Z"
  }
]
```

Para `SUPER_ADMIN`, itens podem incluir `memberCount` (total de membros).

---

## GET /workspaces/:id/members

Lista membros do workspace. Requer role **`OWNER`** ou **`ADMIN`** no workspace.

**Headers:** `Authorization` + `X-Workspace-Id: <id>` (mesmo valor de `:id`).

**Resposta:** array com `userId`, `role`, `user` (email, name, isActive, etc.).

---

## POST /workspaces/:id/members

Adiciona membro ao workspace (cria usuário ou vincula existente). Requer **`OWNER`** ou **`ADMIN`**.

**Body (JSON):**

| Campo | Obrigatório | Observação |
| ----- | ----------- | ---------- |
| `email` | sim | email válido |
| `password` | condicional | obrigatório se o email **não** existe; ignorado se usuário já existe |
| `name` | não | string; usado na criação de novo usuário |
| `role` | não | `OWNER` · `ADMIN` · `MEMBER` (padrão `MEMBER`) |

**Comportamento:**

- Email novo → cria `User` + `WorkspaceMember`.
- Email existente → apenas cria `WorkspaceMember` (senha atual do usuário é mantida).
- Já é membro → **409** (`Usuário já é membro deste workspace`).

**Resposta:**

```json
{
  "linked": false,
  "member": { /* WorkspaceMember + user */ }
}
```

`linked: true` quando o usuário já existia e só foi vinculado.

---

## PATCH /workspaces/:id/members/:userId

Atualiza role de um membro. Requer **`OWNER`** ou **`ADMIN`**.

**Body (JSON):**

| Campo | Obrigatório | Observação |
| ----- | ----------- | ---------- |
| `role` | não | `OWNER` · `ADMIN` · `MEMBER` |

Apenas `OWNER` pode promover alguém a `OWNER`. Não é possível rebaixar o único `OWNER` do workspace.

---

## DELETE /workspaces/:id/members/:userId

Remove membership. Apenas **`OWNER`**.

Não é possível remover o único `OWNER` do workspace.

**Política de conta:** quando um usuário com role global `USER` perde o **último** membership, a conta é **excluída automaticamente**. Usuários `SUPER_ADMIN` nunca são excluídos por este fluxo, mesmo sem membership.

**Resposta:**

```json
{
  "data": "Membro removido do workspace.",
  "userDeleted": true
}
```

| Campo | Descrição |
| ----- | --------- |
| `data` | Mensagem de confirmação |
| `userDeleted` | `true` se a conta global do usuário foi excluída; `false` se ainda existe (outro workspace ou `SUPER_ADMIN`) |

Após exclusão da conta, tokens do usuário removido passam a retornar **401** nas rotas autenticadas.
