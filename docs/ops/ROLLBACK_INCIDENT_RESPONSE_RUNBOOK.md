# PGIC — Runbook de Rollback e Resposta a Incidentes

Data: 2026-05-27
Escopo: F2-03 (plano de rollback e resposta a incidentes)

## Objetivo

Padronizar decisão e execução de rollback/hotfix com rastreabilidade operacional.

## Severidade e acionamento

- `SEV-1`: indisponibilidade total, corrupção de dados, risco de segurança.
- `SEV-2`: degradação relevante (erro/latência acima de SLO) sem parada total.
- `SEV-3`: impacto parcial sem violação de SLO crítico.

Acionar runbook quando houver:

- aumento sustentado de `5xx` ou latência p95 acima de limiar de alerta;
- falha de deploy com regressão funcional crítica;
- falha de migração ou incompatibilidade de schema;
- indisponibilidade de serviço crítico.

## Decisão: rollback vs hotfix

Escolher `rollback` quando:

- a causa está no release atual e rollback reverte com baixo risco;
- há impacto ativo em produção/homologação crítica;
- hotfix exigiria mudança extensa sob incidente aberto.

Escolher `hotfix` quando:

- rollback não resolve (ex.: dado já migrado irreversivelmente);
- a falha é localizada e mitigável rapidamente;
- existe teste objetivo para validar correção imediata.

## Fluxo operacional (timeline)

1. `T0` Detecção e abertura do incidente (canal único).
2. `T0+5` Classificação de severidade e nomeação de `Incident Commander`.
3. `T0+10` Decisão rollback/hotfix e registro da justificativa.
4. `T0+15` Execução técnica.
5. `T0+25` Verificação pós-ação (healthcheck, contrato, fluxo crítico).
6. `T0+35` Comunicação de estabilização e monitoramento reforçado.
7. `T0+60` Encerramento ou reescalonamento.

## Procedimentos de rollback

### 1) Rollback de aplicação (stateless)

1. Reimplantar versão anterior conhecida.
2. Validar:
   - `pnpm ops:healthcheck`
   - smoke de endpoint crítico (`/health`, fluxo principal do serviço)
3. Confirmar queda de `5xx` e normalização de p95.

### 2) Rollback de configuração

1. Restaurar variáveis/segredos da versão anterior.
2. Reiniciar serviços afetados.
3. Reexecutar `pnpm ops:healthcheck`.

### 3) Falha de migração/schema

1. Interromper tráfego de escrita se necessário.
2. Restaurar backup conforme `docs/BACKUP_RESTORE_RUNBOOK.md`.
3. Validar leitura/escrita mínima e integridade.
4. Replanejar release com migração compatível.

### 4) Infraestrutura

Usar `docs/ops/FAILOVER_RUNBOOK.md` para PostgreSQL/RabbitMQ/Redis.

## Comunicação operacional

- Canal único do incidente (war room).
- Atualizações a cada 15 minutos até estabilização.
- Campos obrigatórios por atualização:
  - status atual;
  - impacto;
  - decisão tomada;
  - próximo checkpoint.

## Checklist de encerramento

- Causa raiz preliminar registrada.
- Linha do tempo preenchida.
- Métricas voltaram ao baseline.
- Ações corretivas com owner e prazo.
- Evidências anexadas (comandos, logs, dashboards).

## Simulação recomendada (game day)

1. Escolher serviço stateless (ex.: `reporting-service`).
2. Implantar versão com regressão controlada em homologação.
3. Executar rollback completo pelo fluxo acima.
4. Registrar `início`, `detecção`, `decisão`, `execução`, `validação`, `encerramento`.
5. Publicar lições aprendidas e ajustes no runbook.
