# PGIC — Runbook LGPD Operacional (MVP)

Data: 2026-05-25

## Objetivo

Estabelecer práticas mínimas executáveis para LGPD no contexto técnico atual da PGIC:

- minimização de dados pessoais;
- anonimização de conta de usuário por solicitação do titular;
- retenção e expurgo de dados de autenticação e logs de acesso.

## Escopo atual (MVP técnico)

Coberto por scripts neste runbook:

1. **Anonimização de usuário no identity-service** (mantém integridade referencial por `userId`).
2. **Expurgo por retenção** de tabelas com dados pessoais de autenticação.

Ainda pendente (fora deste MVP):

- fluxo jurídico completo (base legal por finalidade e aprovação formal DPO);
- expurgo/anonimização cross-service de conteúdo textual livre (comentários, descrições) quando houver dados pessoais inseridos manualmente;
- portal de autoatendimento do titular.

## Dados pessoais técnicos mapeados (identity-service)

- `users`: `email`, `login`, `name`, `phone`, `department`, `job_title`, `photo_url`, `preferred_language`, `time_zone`
- `auth_sessions`: `ip`, `user_agent`
- `password_reset_tokens`: `requester_ip`
- `access_logs`: `identifier`, `ip`, `user_agent`, `path`

## Scripts

- `pnpm privacy:anonymize-user -- --user-id <uuid> [--dry-run]`
- `pnpm privacy:prune-identity -- [--dry-run] [--access-logs-days N] [--password-reset-days N] [--revoked-sessions-days N]`

### 1. Anonimização de usuário

Dry-run:

```bash
pnpm privacy:anonymize-user -- --user-id 11111111-1111-4111-8111-111111111111 --dry-run
```

Execução real:

```bash
pnpm privacy:anonymize-user -- --user-id 11111111-1111-4111-8111-111111111111
```

Efeito:

- força `status=inactive`;
- substitui `email/login/name` por identificadores anônimos técnicos únicos;
- limpa campos opcionais pessoais;
- revoga sessões ativas;
- remove tokens de reset e contas OAuth associadas.

### 2. Retenção e expurgo

Dry-run com política default:

```bash
pnpm privacy:prune-identity -- --dry-run
```

Execução real com política customizada:

```bash
pnpm privacy:prune-identity -- --access-logs-days 180 --password-reset-days 30 --revoked-sessions-days 90
```

## Política de retenção sugerida (MVP)

- `access_logs`: 180 dias
- `password_reset_tokens`: 30 dias
- `auth_sessions` revogadas: 90 dias

## Evidência mínima para checklist LGPD

Guardar por execução:

1. comando executado;
2. timestamp;
3. saída JSON (dry-run ou execução);
4. ID técnico do operador responsável.

## Agendamento recomendado

Executar expurgo automaticamente (cron/pipeline):

```bash
pnpm privacy:prune-identity -- --access-logs-days 180 --password-reset-days 30 --revoked-sessions-days 90
```

Frequência sugerida: diária ou semanal, conforme volume.

Template consolidado:

- `infra/cron/pgic-ops-maintenance.cron` (inclui backup + prune + healthcheck)
