# F2-06 — Segurança no CI

- Prioridade: `P1`
- Esforço: `M`
- Owner sugerido: DevSecOps
- Dependências: nenhuma

## Objetivo

Adicionar gates automáticos de segurança para reduzir risco de regressão em PR.

## Escopo

- SAST em código e dependências.
- Política de severidade para bloqueio de merge.
- Processo de exceção formal com prazo.
- Relatório consolidado por pipeline.

## Tarefas técnicas

- Selecionar scanners e baseline inicial.
- Configurar execução em PR e branch principal.
- Definir thresholds de severidade.
- Publicar fluxo de exceção com aprovação explícita.
- Integrar relatório de segurança ao fluxo de release.

## Critérios de aceite

- Pipeline falha para vulnerabilidade alta/crítica sem exceção.
- Exceções auditáveis e com prazo.
- Relatório acessível para engenharia e segurança.

## Evidências esperadas

- PR de configuração CI.
- Execução de pipeline com gate ativo.
- Documento de policy de exceção.

