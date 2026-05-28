# Issues da Fase 1 (MVP operacional fechado)

Data de criação: 2026-05-21
Fonte: `docs/BACKLOG_EXECUCAO_FASEADO.md`

## Ordem recomendada de execução

1. `F1-08` Definição operacional de provedor de e-mail
2. `F1-03` Notificação mínima funcional
3. `F1-02` Idempotência de ingestão de webhooks
4. `F1-05` Consolidação de permissões nos fluxos principais
5. `F1-01` E2E crítico de jornada principal
6. `F1-04` Painel operacional mínimo
7. `F1-06` Padronização de warnings de lint
8. `F1-07` Matriz RF x Teste x Evidência

## Regra de pronto (DoD da fase)

- Toda issue com PR, testes automatizados e evidência anexada.
- Sem regressão em `pnpm test` e `pnpm test:integration` nos pacotes afetados.
- Atualização de documentação em `docs/` quando houver mudança de contrato/fluxo.

## Fechamento consolidado

- Relatório final da fase: `docs/RELATORIO_FECHAMENTO_FASE1.md`.
- Matriz de rastreabilidade: `docs/MATRIZ_RF_TESTE_EVIDENCIA_FASE1.md`.

## Status atualizado (2026-05-27)

| Item | Status |
|---|---|
| `F1-01` E2E crítico de jornada principal | Feito |
| `F1-02` Idempotência de ingestão de webhooks | Feito |
| `F1-03` Notificação mínima funcional | Feito |
| `F1-04` Painel operacional mínimo | Feito |
| `F1-05` Consolidação de permissões nos fluxos principais | Feito |
| `F1-06` Padronização de warnings de lint | Feito |
| `F1-07` Matriz RF x Teste x Evidência | Feito |
| `F1-08` Definição operacional de provedor de e-mail | Feito |
