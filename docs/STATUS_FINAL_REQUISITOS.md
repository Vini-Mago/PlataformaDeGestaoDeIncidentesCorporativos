# PGIC — Status Final de Requisitos

Data de consolidação: 2026-05-25
Fonte: `docs/ChecklistContextoCorporativoCompleto.md` + `docs/ChecklistCompletoDetalhadoPassoAPasso.md`

## Resumo executivo

- **Feito `[x]`**: requisitos com implementação e evidência objetiva no repositório.
- **Parcial `[~]`**: implementado em nível MVP/técnico, pendendo maturidade operacional/jurídica/produção.
- **Falta `[ ]`**: não implementado ou sem evidência suficiente.

## Matriz consolidada (alto nível)

| Bloco | Status | Observação objetiva |
|---|---|---|
| RF-1 Gestão de usuários | Parcial | Base forte (cadastro, sessão, RBAC); AD/LDAP e partes de recuperação ainda evolutivas. |
| RF-2 Controle de acesso | Feito | Autorização e permissões por módulo/ação em backend com logs de acesso. |
| RF-3 Auditoria e rastreamento | Parcial | Versionamento RF-3.3 fechado em problemas/mudanças; cobertura transversal total ainda pendente. |
| RF-4 Dashboards/KPIs | Parcial | Base de reporting existe; KPIs executivos completos e exportação pesada ainda pendentes. |
| RF-5 Incidentes | Parcial | Fluxo principal implementado; amarrações completas de SLA/UX ainda em evolução. |
| RF-6 Requisições | Parcial | Catálogo + fluxo principal prontos; cenários avançados de aprovação ainda pendentes. |
| RF-7 Problemas/Mudanças | Parcial | Problemas bem cobertos; mudanças com fluxo principal e melhorias de governança em andamento. |
| RF-8 SLA/Escalonamento | Parcial | Serviços e base implementados; cobertura completa de regras/canais ainda pendente. |
| RF-9 Integrações externas | Parcial | Entrada e saída MVP implementadas (inclui RF-9.2), com logs/DLQ/retry; maturidade de conectores produtivos pendente. |
| RF-10 Assíncrono (jobs/retry/DLQ) | Parcial | Outbox/relay e DLQ presentes; padronização total de jobs pesados ainda pendente. |
| Segurança NFR (RC §3.1) | Parcial | SQLi/rate-limit base, backup e LGPD operacional MVP implementados; formalização jurídica e produção pendentes. |
| Performance NFR (RC §3.2) | Parcial | Índices e base técnica presentes; metas p95/p99 e observabilidade de performance ainda pendentes. |
| Escalabilidade NFR (RC §3.3) | Parcial | Arquitetura desacoplada pronta; HA/auto scaling de produção ainda pendentes. |
| Disponibilidade NFR (RC §3.4) | Parcial | Healthcheck, monitoramento operacional MVP e runbook de failover implementados; HA/failover automático em produção pendentes. |
| Interoperabilidade NFR (RC §3.5) | Parcial | REST/JSON e contratos base prontos; política global de versionamento/contratos formais ainda evolutiva. |

## Itens que foram fechados neste ciclo

- RF-3.3: versionamento de dados em `problem-change-service` (`problem_versions`/`change_versions`) + endpoints de consulta.
- RF-9.2: saída assíncrona em `integration-service` (`/api/outbound/v1/deliver`) com timeout/retry/DLQ.
- Endurecimento RF-10.2/RF-9.2: backoff exponencial no retry outbound e envio de body HTTP apenas quando aplicável.
- Backup/restore: scripts operacionais + retenção + smoke test + cron templates.
- LGPD operacional MVP: anonimização de usuário + expurgo por retenção no `identity-service` + runbook.
- Monitoramento operacional MVP: `ops:healthcheck`, `ops:maintenance`, `ops:evidence` + runbook.
- Failover: runbook de procedimento para Postgres/RabbitMQ/Redis + validação pós-recuperação.
- RTO/RPO: documento base com metas iniciais e template de medição.

## Pendências críticas remanescentes

1. HA real de produção (replicação/cluster para Postgres, RabbitMQ e Redis).
2. Observabilidade centralizada (métricas, logs, APM, alerting corporativo).
3. Formalização jurídica LGPD (base legal, DPO, fluxo institucional completo do titular).
4. KPIs executivos completos (MTTR/MTBF/SLA) com exportação pesada assíncrona.
5. Expandir suíte de contrato para demais fluxos de eventos RabbitMQ ainda não cobertos e formalizar versionamento global de contratos.
