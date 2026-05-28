# F2-01 — Backup automatizado + restore testado

- Prioridade: `P0`
- Esforço: `L`
- Owner sugerido: DevOps/SRE
- Dependências: nenhuma

## Objetivo

Garantir recuperação previsível de dados com rotina automatizada de backup, retenção e restore periódico validado.

## Escopo

- Automatizar backup de bancos críticos.
- Definir política de retenção por ambiente.
- Rodar restore smoke test periódico com evidência.
- Medir e registrar RTO/RPO real por execução.

## Tarefas técnicas

- Revisar e consolidar scripts em `scripts/db/`.
- Parametrizar agendamento (cron/runner) por ambiente.
- Criar relatório operacional de execução (timestamp, duração, sucesso/falha).
- Validar restauração em base temporária e consulta de sanidade.
- Atualizar runbook com passo a passo e troubleshooting.

## Critérios de aceite

- Backup automatizado ativo em homologação.
- Restore testado com evidência e tempos medidos.
- Runbook atualizado com política de retenção e verificação pós-restore.

## Evidências esperadas

- PR com scripts/ajustes de operação.
- Log de execução de backup e restore.
- Registro de RTO/RPO medido.

