# Módulo Dashboard

Resumo agregado para a tela inicial (contagens por status, leads recentes e próximos follow-ups). Todas as rotas exigem **access token** e papel **`ADMIN`** (`RolesGuard`).

**Controller:** `DashboardController`  
**Prefixo:** `/dashboard`

## Autenticação e autorização

- Header: `Authorization: Bearer <access_token>`
- Usuário com `role` diferente de `ADMIN` recebe **403 Forbidden**.

---

## GET /dashboard

- **Pública:** não
- **Token:** access token (JWT)
- **Body:** não
- **Descrição:** Executa em paralelo: (1) contagem de leads por `status`, (2) até **10** leads ordenados por `updatedAt` descendente (desempate `id` ascendente), (3) até **10** registros de follow-up ordenados por `nextContactAt` ascendente (inclui contatos atrasados primeiro, pois a data é menor), (4) série do funil nos **últimos 6 meses** (leads novos no mês e **vendas** = leads com `status` `WON` cuja `updatedAt` cai no mês — aproximação; não há `wonAt` dedicado), (5) consultas auxiliares para montar essa série.

Os leads em `recentLeads` seguem o mesmo mapeamento da listagem em `GET /leads` (por exemplo, quando o lead está em `LOST`, `lossReason` vem como texto — nome do motivo — e não há `lossReasonId` na resposta).

**Exemplo de requisição:** `GET /dashboard`

**Resposta exemplo (campos ilustrativos):**

```json
{
  "totalLeads": 42,
  "countsByStatus": {
    "IMPORTED": 5,
    "NEW": 10,
    "CONTACTED": 3,
    "QUALIFYING": 2,
    "BRIEFING": 1,
    "PROPOSAL_SENT": 4,
    "NEGOTIATION": 6,
    "WON": 8,
    "LOST": 3
  },
  "funnelChart": [
    { "month": "2025-11", "leadsCreated": 3, "salesWon": 2 },
    { "month": "2025-12", "leadsCreated": 5, "salesWon": 4 }
  ],
  "recentLeads": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "name": "Empresa X",
      "status": "NEGOTIATION",
      "lossReason": null,
      "updatedAt": "2026-04-17T12:00:00.000Z"
    }
  ],
  "upcomingFollowUps": [
    {
      "leadId": "11111111-1111-1111-1111-111111111111",
      "leadName": "Empresa X",
      "nextContactAt": "2026-04-18T14:00:00.000Z",
      "channel": "WhatsApp",
      "ownerLabel": "Comercial",
      "reminder": null
    }
  ]
}
```

| Campo | Tipo | Observação |
| ----- | ---- | ---------- |
| `totalLeads` | número | Soma das contagens em `countsByStatus` (total de leads no banco). |
| `countsByStatus` | objeto | Uma chave para **cada** valor do enum `LeadStatus` (ver [leads.md](./leads.md) § `LeadStatus`). Status sem leads aparece com contagem **0**. |
| `funnelChart` | array | Exatamente **6** pontos, um por mês (janela móvel até o mês atual). `month` no formato `YYYY-MM` (UTC). `leadsCreated`: leads com `createdAt` naquele mês. `salesWon`: leads com `WON` cuja `updatedAt` cai naquele mês (pode subcontar se o ganho ocorrer e o lead for editado depois). |
| `recentLeads` | array | Até 10 objetos `Lead` no mesmo formato serializado que em `GET /leads` (inclui `budget` como string JSON quando aplicável, etc.). |
| `upcomingFollowUps` | array | Até 10 itens. `channel` segue os valores aceitos em follow-up: `WhatsApp`, `Ligação`, `E-mail`, `Visita` (ver `GET /leads/:id/follow-up` em [leads.md](./leads.md)). |

**401** — token ausente ou inválido.  
**403** — usuário autenticado sem role `ADMIN`.

Para listagem paginada, filtros de busca e ordenações alternativas, use `GET /leads` conforme [leads.md](./leads.md).
