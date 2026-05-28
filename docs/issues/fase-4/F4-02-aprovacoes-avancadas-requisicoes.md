# F4-02 — Aprovações avançadas em requisições (RF-6)

- Prioridade: `P1`
- Esforço: `M`
- Owner sugerido: Request + Frontend
- Dependências: `F1-05`, `F1-01`

## Objetivo

Completar cenários avançados de aprovação para tornar o fluxo de requisições aderente ao uso corporativo.

## Escopo

- Múltiplos aprovadores por etapa.
- Regras de exceção/reprovação com trilha.
- Restrições de ação por perfil.
- Histórico claro da decisão.

## Tarefas técnicas

- Definir estados e transições para aprovação avançada.
- Implementar regras de autorização por ação e etapa.
- Ajustar APIs e payloads necessários para trilha de decisão.
- Adaptar frontend para refletir fluxo e decisões.
- Criar suíte de testes para cenários positivos e negativos.

## Critérios de aceite

- Fluxo com múltiplos aprovadores funcionando de ponta a ponta.
- Ações bloqueadas corretamente por perfil/estado.
- Histórico completo disponível para auditoria.

## Evidências esperadas

- PR com implementação e testes.
- Execução CI verde para request-service/frontend.
- Evidência de caso de exceção e reprovação.

## Evidência atual (2026-05-27)

- Fluxos avançados já implementados no domínio de requisições:
  - aprovação `single`, `sequential` e `parallel` com `approvalState`.
  - enforcement por papel e ordem de aprovação.
  - proteção contra aprovação duplicada no modo paralelo.
- Arquivos de referência:
  - `packages/request-service/src/application/use-cases/approve-service-request.use-case.ts`
  - `packages/request-service/src/application/use-cases/send-for-approval-service-request.use-case.ts`
  - `packages/request-service/src/__tests__/integration/request-service.integration.spec.ts`
- Teste unitário adicional adicionado para reforçar entrada em fila de aprovação:
  - `packages/request-service/src/application/use-cases/send-for-approval-service-request.use-case.spec.ts`
  - cobre transições:
    - `none -> Approved`
    - `sequential -> InApproval (step=0)`
    - `parallel -> InApproval (roles=[])`
- Validação local:
  - `pnpm --filter request-service test -- src/application/use-cases/send-for-approval-service-request.use-case.spec.ts` (verde).

## Status

- Feito técnico para backend de aprovações avançadas (`request-service`).
- Pendente para fechamento total do item:
  - evidência funcional equivalente no frontend para todos os cenários avançados de aprovação/exceção em homologação.
