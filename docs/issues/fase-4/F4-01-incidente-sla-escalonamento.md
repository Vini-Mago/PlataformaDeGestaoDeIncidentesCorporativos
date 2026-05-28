# F4-01 — Fechamento Incidentes + SLA/Escalonamento (RF-5 + RF-8)

- Prioridade: `P0`
- Esforço: `L`
- Owner sugerido: Incident + SLA + Frontend
- Dependências: `F1-01`, `F2-02`, `F2-08`

## Objetivo

Fechar a operação ponta a ponta entre ciclo de incidente e regras de SLA/escalonamento com rastreabilidade.

## Escopo

- Atribuição e transições de status com impacto em SLA.
- Escalonamento por violação de prazo e criticidade.
- Visibilidade de estado e risco na camada de apresentação.
- Trilha auditável de eventos relevantes.

## Tarefas técnicas

- Revisar mapeamento de eventos entre incident-service e sla/escalation.
- Ajustar regras de transição e gatilhos de escalonamento.
- Garantir exibição consistente no frontend para risco e status.
- Criar testes de integração e cenário E2E de violação/recuperação de SLA.
- Atualizar documentação funcional e operacional.

## Critérios de aceite

- Fluxo principal e cenário de violação de SLA cobertos por testes.
- Escalonamento disparado e rastreável conforme regra definida.
- UI e API consistentes para status e risco operacional.

## Evidências esperadas

- PRs nos serviços/pacotes envolvidos.
- Execução de testes automatizados.
- Registro de caso de escalonamento validado.

## Evidência atual (2026-05-27)

- Cobertura de regra de escalonamento ligada ao ciclo de SLA reforçada:
  - `packages/escalation-service/src/application/use-cases/handle-escalation-domain-event.use-case.ts`
  - condição `no_first_response_minutes` agora responde a evento real de breach de resposta (`sla.breach` com `breachType=response`).
- Testes unitários adicionados para o fluxo incidente→SLA→escalonamento:
  - `packages/escalation-service/src/application/use-cases/handle-escalation-domain-event.use-case.spec.ts`
  - cenários cobertos:
    - criticalidade em `incident.created`;
    - risco de SLA por percentual;
    - breach de primeira resposta;
    - deduplicação por histórico recente.
- Validação local:
  - `pnpm --filter escalation-service test -- src/application/use-cases/handle-escalation-domain-event.use-case.spec.ts` (verde).

## Status

- Parcial avançado: regra e testes de domínio de escalonamento foram fechados.
- Pendente para fechamento completo do F4-01:
  - cenário E2E único cruzando `incident-service` + `sla-service` + `escalation-service`;
  - evidência de visibilidade operacional consolidada no frontend para risco/escalonamento.
