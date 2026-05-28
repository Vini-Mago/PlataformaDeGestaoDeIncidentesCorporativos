# F2-03 — Plano de rollback e resposta a incidentes

- Prioridade: `P0`
- Esforço: `M`
- Owner sugerido: Tech Lead + DevOps
- Dependências: `F2-01`, `F2-02`

## Objetivo

Padronizar rollback por serviço e o fluxo de resposta operacional para reduzir tempo de contenção.

## Escopo

- Procedimento de rollback por tipo de deploy.
- Fluxo de comunicação operacional.
- Critérios de acionamento e encerramento de incidente.
- Simulação prática de rollback com registro.

## Tarefas técnicas

- Definir playbook por serviço crítico.
- Criar checklist de decisão: rollback vs hotfix.
- Definir responsáveis, canais e janelas de comunicação.
- Executar game day de rollback controlado.
- Incorporar aprendizados no runbook final.

## Critérios de aceite

- Runbook de rollback aprovado e versionado.
- Simulação executada com timeline e resultado.
- Critérios de acionamento claros e reproduzíveis.

## Evidências esperadas

- Documento de playbook final.
- Registro da simulação (início/fim, decisão, impacto).
- PR com atualização de documentação.

## Evidência atual (2026-05-27)

- Runbook técnico criado e versionado:
  - `docs/ops/ROLLBACK_INCIDENT_RESPONSE_RUNBOOK.md`
- Runbook de failover já existente e referenciado para camada de infraestrutura:
  - `docs/ops/FAILOVER_RUNBOOK.md`
- Procedimento cobre:
  - critérios de acionamento;
  - decisão rollback vs hotfix;
  - fluxo de comunicação operacional;
  - timeline padrão de incidente;
  - checklist de encerramento;
  - roteiro de game day.

## Status de fechamento

- Feito técnico para escopo de documentação e procedimento versionado.
- Pendente operacional fora do repositório:
  - executar game day real em homologação e anexar evidência temporal;
  - validar rollback em pipeline/deploy real do ambiente.
