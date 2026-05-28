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

