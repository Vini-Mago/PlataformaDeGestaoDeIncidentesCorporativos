# PGIC — Runbook de Backup/Restore (PostgreSQL)

Data: 2026-05-25

## Objetivo

Padronizar backup automatizado local/ambiente Docker e teste periódico de restore, com política mínima de retenção.

## Pré-requisitos

- Infra ativa (`pnpm docker:up`)
- Container Postgres disponível (`pgic-postgres` por padrão)
- `.env` com `POSTGRES_USER` e `POSTGRES_PASSWORD`

## Scripts

- `scripts/db/backup-postgres.sh`
- `scripts/db/run-backup-with-alert.sh`
- `scripts/db/check-backup-freshness.sh`
- `scripts/db/restore-postgres.sh`
- `scripts/db/restore-smoke-test.sh`

Atalhos no `package.json`:

- `pnpm db:backup`
- `pnpm db:backup:run`
- `pnpm db:backup:check`
- `pnpm db:restore -- --db <database> [--file <arquivo.sql.gz>] [--create-db]`
- `pnpm db:restore:test [database]`

## Política de retenção (mínima)

Variáveis:

- `BACKUP_RETENTION_DAYS` (default: `14`)
- `BACKUP_KEEP_MIN` (default: `10`)
- `BACKUP_DIR` (default: `./backups/postgres`)
- `BACKUP_MAX_AGE_HOURS` (default: `26`)
- `BACKUP_ALERT_WEBHOOK_URL` (opcional; alerta simples por webhook em falhas)

Regra aplicada:

1. remove backups mais antigos que `BACKUP_RETENTION_DAYS`;
2. nunca deixa menos de `BACKUP_KEEP_MIN` arquivos no diretório.

## Fluxo operacional

### 1. Backup

```bash
pnpm db:backup
```

Resultado esperado:

- arquivos `*.sql.gz` em `backups/postgres`;
- padrão de nome: `<database>_YYYYMMDD-HHMMSS.sql.gz`.

### 2. Restore direcionado

```bash
pnpm db:restore -- --db identity_service
```

Opcional:

```bash
pnpm db:restore -- --db identity_service --file backups/postgres/identity_service_YYYYMMDD-HHMMSS.sql.gz --create-db
```

### 3. Teste periódico de restore (smoke test)

```bash
pnpm db:restore:test
```

Ou para outra base:

```bash
pnpm db:restore:test request_service
```

Esse teste:

1. força backup novo;
2. cria base temporária;
3. restaura dump mais recente;
4. valida contagem de tabelas `public`;
5. remove base temporária.

## Frequência recomendada

- Backup: diário
- Restore smoke test: semanal (mínimo mensal)
- Freshness check: horário (1/1h)

## Agendamento (cron)

Template pronto:

- `infra/cron/pgic-backup.cron`
- `infra/cron/pgic-ops-maintenance.cron` (backup + prune LGPD + healthcheck)

Exemplo de instalação:

```bash
crontab infra/cron/pgic-backup.cron
```

Ajuste antes:

1. Caminho do projeto (`/opt/pgic` no template).
2. Caminho de logs (`/var/log/...`).
3. Variáveis de ambiente (`BACKUP_RETENTION_DAYS`, `BACKUP_KEEP_MIN`, `BACKUP_MAX_AGE_HOURS`).
4. `BACKUP_ALERT_WEBHOOK_URL` para alertas em falha.

## Evidência mínima para checklist

Guardar em artefato de execução:

- log de `pnpm db:backup` com timestamp;
- log de `pnpm db:backup:check` sem stale/missing;
- log de `pnpm db:restore:test` com sucesso;
- registro da política (`BACKUP_RETENTION_DAYS`, `BACKUP_KEEP_MIN`) no ambiente.
