# PGIC — Requisitos Parciais e Plano de Fechamento

Data de referência: 2026-05-26  
Fonte base: `docs/STATUS_FINAL_REQUISITOS.md`

## 1) Requisitos atualmente parciais

1. **RF-1 Gestão de usuários**  
   Base forte (cadastro, sessão, RBAC), mas AD/LDAP e partes de recuperação ainda evolutivas.
2. **RF-3 Auditoria e rastreamento**  
   Versionamento RF-3.3 fechado em problemas/mudanças, porém cobertura transversal total pendente.
3. **RF-4 Dashboards/KPIs**  
   Base de reporting existe; KPIs executivos completos e exportação pesada pendentes.
4. **RF-5 Incidentes**  
   Fluxo principal implementado; amarrações completas de SLA/UX ainda em evolução.
5. **RF-6 Requisições**  
   Catálogo e fluxo principal prontos; cenários avançados de aprovação pendentes.
6. **RF-7 Problemas/Mudanças**  
   Problemas bem cobertos; mudanças com fluxo principal e melhorias de governança em andamento.
7. **RF-8 SLA/Escalonamento**  
   Serviços e base implementados; cobertura completa de regras/canais pendente.
8. **RF-9 Integrações externas**  
   Entrada e saída MVP implementadas (inclui RF-9.2), com logs/DLQ/retry; maturidade de conectores produtivos pendente.
9. **RF-10 Assíncrono (jobs/retry/DLQ)**  
   Outbox/relay e DLQ presentes; padronização total de jobs pesados pendente.
10. **Segurança NFR (RC §3.1)**  
    SQLi/rate-limit base, backup e LGPD operacional MVP implementados; formalização jurídica e produção pendentes.
11. **Performance NFR (RC §3.2)**  
    Índices e base técnica presentes; metas p95/p99 e observabilidade de performance pendentes.
12. **Escalabilidade NFR (RC §3.3)**  
    Arquitetura desacoplada pronta; HA/auto scaling de produção pendentes.
13. **Disponibilidade NFR (RC §3.4)**  
    Healthcheck, monitoramento operacional MVP e runbook de failover implementados; HA/failover automático em produção pendentes.
14. **Interoperabilidade NFR (RC §3.5)**  
    REST/JSON e contratos base prontos; política global de versionamento/contratos formais ainda evolutiva.

## 2) Plano de fechamento (priorizado)

### Objetivo
Transformar os itens parciais em estado **Feito**, com evidência técnica, operacional e de governança.

### Critérios de conclusão por item

- Implementação funcional completa no serviço/módulo afetado.
- Testes automatizados (unitário + integração; e2e quando aplicável) cobrindo cenário principal e cenários críticos.
- Evidência operacional/documental (runbook, métrica, alerta, contrato, política ou checklist atualizado).
- Atualização do status em `docs/STATUS_FINAL_REQUISITOS.md`.

### Fase 1 — Fechar lacunas funcionais críticas (RF-1, RF-5, RF-6, RF-7, RF-8)

1. RF-1: concluir integração AD/LDAP e fluxos pendentes de recuperação de acesso.
2. RF-5 + RF-8: fechar acoplamento Incidente ↔ SLA/Escalonamento (regras, transições, notificações, rastreabilidade).
3. RF-6: concluir aprovações avançadas (múltiplos aprovadores, trilhas e exceções).
4. RF-7: endurecer governança de mudanças (janelas, validações e política de edição por status).

**Entregáveis da fase**
- Casos de teste de regressão por fluxo.
- Matriz RF x endpoint x teste atualizada.
- Evidências de execução em ambiente local/homologação.

### Fase 2 — Fechar capacidades de integração e processamento assíncrono (RF-9, RF-10)

1. RF-9: consolidar conectores produtivos prioritários e contratos de integração por versão.
2. RF-10: padronizar jobs pesados com retry, DLQ, idempotência e observabilidade comum.
3. Definir e aplicar política única para reprocessamento e descarte de mensagens.

**Entregáveis da fase**
- Contratos versionados e verificados em pipeline.
- Dashboards de fila/erro/reprocessamento.
- Runbook de incidentes de integração.

### Fase 3 — Fechar NFRs de produção (Segurança, Performance, Escalabilidade, Disponibilidade, Interoperabilidade)

1. Segurança (RC §3.1): formalizar controles jurídicos/LGPD e trilha de conformidade operacional.
2. Performance (RC §3.2): estabelecer SLOs (p95/p99), baseline e alertas por serviço.
3. Escalabilidade (RC §3.3): definir estratégia de HA/auto scaling e validar teste de carga.
4. Disponibilidade (RC §3.4): operacionalizar failover automático e validar RTO/RPO com evidência.
5. Interoperabilidade (RC §3.5): consolidar política global de versionamento e compatibilidade de contratos.

**Entregáveis da fase**
- SLOs e painéis por serviço.
- Testes de carga com relatório.
- Runbooks e políticas revisados/aprovados.

### Fase 4 — Consolidação e auditoria de fechamento

1. Revisar `STATUS_FINAL_REQUISITOS.md` e marcar cada bloco com evidência concreta.
2. Executar checklist final de rastreabilidade: requisito -> implementação -> teste -> evidência operacional.
3. Publicar relatório de fechamento com pendências remanescentes (se houver) e plano residual.

## 3) Sequência recomendada de execução

1. RFs críticos de operação diária: RF-5, RF-8, RF-6.  
2. Identidade e governança: RF-1, RF-7.  
3. Integração e assíncrono: RF-9, RF-10.  
4. NFRs de produção: RC §3.1 a §3.5.  
5. Auditoria final e atualização de status.

## 4) Indicadores de progresso sugeridos

- `% de requisitos parciais convertidos para Feito` por quinzena.
- `% de cobertura de testes por requisito crítico`.
- `MTTR` de incidentes de integração (RF-9/RF-10).
- Cumprimento de SLO p95/p99 por serviço crítico.
- `% de evidências operacionais atualizadas (runbooks, dashboards, contratos)`.

## 5) Backlog executável (issues por fase)

- Fase 1 (já existente): `docs/issues/fase-1/`
- Fase 2 (confiabilidade de produção): `docs/issues/fase-2/`
- Fase 3 (compliance e segurança): `docs/issues/fase-3/`
- Fase 4 (fechamento RFs parciais): `docs/issues/fase-4/`

Cada fase possui `README.md` com ordem de execução e Definition of Done, além de issues com objetivo, escopo, tarefas técnicas, critérios de aceite e evidências esperadas.
