# integration-service

Microsserviço de **integrações externas** (RF-9.x): webhooks de monitoramento, logs de integração e publicação assíncrona de eventos para criação automática de incidentes.

## Endpoints

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/webhooks/v1/monitoring` | `X-API-Key` (+ HMAC opcional) | Ingestão de alertas → `integration.incident_ingest` |
| GET | `/api/integration-logs` | JWT | Consulta logs de integração |
| GET | `/health` | — | Health check |

## Variáveis

- `INTEGRATION_DATABASE_URL`
- `INTEGRATION_WEBHOOK_API_KEY` — obrigatória para webhooks
- `INTEGRATION_WEBHOOK_SECRET` — se definida, exige `X-Signature` HMAC-SHA256
- `INTEGRATION_SYSTEM_USER_ID` — `requesterId` dos incidentes automáticos
- `RABBITMQ_URL` — outbox → exchange `integration.events`

## Fluxo

1. Sistema externo envia POST ao webhook.
2. Serviço valida, regista `integration_logs` e grava outbox.
3. Relay publica em `integration.events` / `incident_ingest`.
4. `incident-service` consome `incident.integration_ingest` e cria incidente (idempotente por `externalSource` + `externalId`).

## Exemplo

```bash
curl -X POST http://localhost:3011/api/webhooks/v1/monitoring \
  -H "X-API-Key: dev-integration-webhook-key" \
  -H "Content-Type: application/json" \
  -d '{"externalId":"alert-1","title":"CPU 95%","severity":"high","serviceAffected":"api-gateway"}'
```
