# Issues da Fase 4 (Fechamento dos RFs parciais prioritários)

Data de criação: 2026-05-26  
Fonte: `docs/REQUISITOS_PARCIAIS_E_PLANO.md`

## Ordem recomendada de execução

1. `F4-01` Fechamento Incidentes + SLA/Escalonamento (`RF-5` + `RF-8`)
2. `F4-02` Aprovações avançadas em requisições (`RF-6`)
3. `F4-03` Governança de mudanças (`RF-7`)
4. `F4-04` Auditoria final e atualização de status

## Regra de pronto (DoD da fase)

- Cada RF alvo com evidência de implementação + teste + operação.
- Sem regressão nos fluxos existentes (CI verde nos pacotes afetados).
- Atualização formal de `docs/STATUS_FINAL_REQUISITOS.md`.

## Status atualizado (2026-05-27)

| Item | Status |
|---|---|
| `F4-01` Fechamento Incidentes + SLA/Escalonamento | Parcial avançado — regra de domínio e testes de escalonamento reforçados; falta E2E cross-service |
| `F4-02` Aprovações avançadas em requisições | Feito técnico no backend (`request-service`); falta evidência completa de frontend em homologação |
| `F4-03` Governança de mudanças | Pendente |
| `F4-04` Auditoria final e atualização de status | Pendente |
