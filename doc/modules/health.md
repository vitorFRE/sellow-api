# Health module

This module checks the health of the application.

Load balancers and monitoring systems can call this route.

**Controller:** `HealthController`  
**Prefix:** `/health`

## Routes

### GET /health

- **Public:** yes
- **Token:** no
- **Body:** no
- **Description:** Returns the status and the timestamp of the application.

**Request example:** `GET /health` (no special headers).

**Response example:**

```json
{
  "status": "ok",
  "timestamp": "2025-03-15T12:00:00.000Z"
}
```
