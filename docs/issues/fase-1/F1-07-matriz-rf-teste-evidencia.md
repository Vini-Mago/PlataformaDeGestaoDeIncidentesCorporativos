# F1-07 — Matriz RF x Teste x Evidência

- Prioridade: `P1`
- Esforço: `M`
- Owner sugerido: QA + Tech Lead
- Dependências: `F1-01`, `F1-05`

## Objetivo

Criar rastreabilidade objetiva entre requisito funcional, cobertura de teste e evidência de execução.

## Escopo

- RFs prioritários de MVP.
- Casos de teste unitário, integração e E2E.
- Evidência de pipeline/logs para cada RF.

## Tarefas técnicas

- Criar documento versionado da matriz em `docs/`.
- Mapear lacunas de cobertura por RF.
- Definir regra de atualização da matriz em cada PR relevante.
- Referenciar suites e jobs reais do CI.

## Critérios de aceite

- Matriz publicada com links verificáveis.
- Lacunas explícitas com owner e prazo.
- Time consegue responder “qual teste cobre qual RF”.

## Riscos

- Matriz virar documento estático sem manutenção.

## Evidências esperadas

- Arquivo da matriz + checklist de atualização em PR template (se aplicável).
