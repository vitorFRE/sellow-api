# Dashboard module

This module gives a summary for the home screen of the active workspace.

The summary shows:

- the count of leads for each status
- the recent leads
- the next follow-ups

You must send an access token and the header `X-Workspace-Id`.

You must have the role `OWNER`, `ADMIN`, or `MEMBER` in the workspace.

**Controller:** `DashboardController`  
**Prefix:** `/dashboard`

## How to sign in and authorize

**Required headers:**

```
Authorization: Bearer <access_token>
X-Workspace-Id: <workspace-uuid>
```

- User without membership in the workspace → **403 Forbidden**.
- The data includes only the leads of the workspace in the header.

---

## GET /dashboard

- **Public:** no
- **Token:** access token (JWT)
- **Header:** `X-Workspace-Id`
- **Body:** no
- **Description:** The server runs these tasks in parallel:
  1. Count leads by `status` in the workspace
  2. Get up to 10 workspace leads. Sort by `updatedAt` from newest to oldest. Tie-break: `id` from low to high
  3. Get up to 10 follow-ups of workspace leads. Sort by `nextContactAt` from soon to late
  4. Build the funnel series for the last 6 months
  5. Count new leads in each month
  6. Count sales as `WON` leads with `updatedAt` in that month. Run helper queries for that series

Leads in `recentLeads` use the same mapping as the list in `GET /leads`.

Example: when the lead is in `LOST`, `lossReason` comes as text (reason name).
The response has no `lossReasonId`.

**Request example:**

```
GET /dashboard
Authorization: Bearer <access_token>
X-Workspace-Id: 00000000-0000-4000-8000-000000000001
```

**Response example (sample fields):**

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
      "name": "Company X",
      "status": "NEGOTIATION",
      "lossReason": null,
      "updatedAt": "2026-04-17T12:00:00.000Z"
    }
  ],
  "upcomingFollowUps": [
    {
      "leadId": "11111111-1111-1111-1111-111111111111",
      "leadName": "Company X",
      "nextContactAt": "2026-04-18T14:00:00.000Z",
      "channel": "WhatsApp",
      "ownerLabel": "Sales",
      "reminder": null
    }
  ]
}
```

| Field | Type | Notes |
| ----- | ---- | ----- |
| `totalLeads` | number | Sum of counts in `countsByStatus` (total leads in the workspace) |
| `countsByStatus` | object | One key for each value of enum `LeadStatus` (see [leads.md](./leads.md) § `LeadStatus`). Status with no leads shows count 0 |
| `funnelChart` | array | Exactly 6 points, one per month (rolling window to the current month). `month` in format `YYYY-MM` (UTC). `leadsCreated`: leads with `createdAt` in that month. `salesWon`: leads with `WON` whose `updatedAt` falls in that month |
| `recentLeads` | array | Up to 10 `Lead` objects in the same format as in `GET /leads` |
| `upcomingFollowUps` | array | Up to 10 items. `channel` uses the accepted follow-up values: `WhatsApp`, `Ligação`, `E-mail`, `Visita` (see `GET /leads/:id/follow-up` in [leads.md](./leads.md)) |

**401** — missing or invalid token.  
**403** — no access to the workspace or insufficient role.  
**400** — missing header `X-Workspace-Id`.

For paginated lists, search filters, and other sorts, use `GET /leads` as in [leads.md](./leads.md).
