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

