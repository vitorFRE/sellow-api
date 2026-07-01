# Módulo Health

Verificação de saúde da aplicação (útil para load balancers e monitoramento).

**Controller:** `HealthController`  
**Prefixo:** `/health`

## Rotas

### GET /health

- **Pública:** sim
- **Token:** não
- **Body:** não (é GET e não exige autenticação).
- **Descrição:** Retorna status e timestamp da aplicação.

**Exemplo de requisição:** `GET /health` (sem headers especiais).

**Resposta exemplo:**

```json
{
  "status": "ok",
  "timestamp": "2025-03-15T12:00:00.000Z"
}
```
