# Issues da Fase 2 (Confiabilidade de produção)

Data de criação: 2026-05-26  
Fonte: `docs/REQUISITOS_PARCIAIS_E_PLANO.md` + `docs/BACKLOG_EXECUCAO_FASEADO.md`

## Ordem recomendada de execução

1. `F2-01` Backup automatizado + restore testado
2. `F2-02` Observabilidade mínima de produção
3. `F2-03` Plano de rollback e resposta a incidentes
4. `F2-08` Política uniforme de retry/DLQ/reprocessamento

## Regra de pronto (DoD da fase)

- Toda issue com PR, testes e evidência operacional anexada.
- Pelo menos uma simulação operacional executada (restore e rollback).
- Atualização de runbooks e links de dashboard em `docs/ops/`.

## Status atualizado (2026-05-27)

| Item | Status |
|---|---|
| `F2-01` Backup automatizado + restore testado | Feito técnico — scripts/runbook/cron/smoke test versionados; operação contínua depende do ambiente |
| `F2-02` Observabilidade mínima de produção | Feito técnico — `/metrics`, Prometheus, Grafana, alert rules e simulação versionados; ativação contínua em homolog/prod pendente |
| `F2-03` Plano de rollback e resposta a incidentes | Pendente |
| `F2-08` Política uniforme de retry/DLQ/reprocessamento | Pendente |

Pendências dependentes de deploy/homologação/produção estão consolidadas em `docs/ops/DEPLOYMENT_PENDING_CHECKLIST.md`.
