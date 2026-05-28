# PGIC — Status Final de Requisitos

Data de consolidação: 2026-05-27
Fonte: `docs/ChecklistContextoCorporativoCompleto.md` + `docs/ChecklistCompletoDetalhadoPassoAPasso.md`

## Resumo executivo

- **Feito `[x]`**: requisitos com implementação e evidência objetiva no repositório.
- **Parcial `[~]`**: implementado em nível MVP/técnico, pendendo maturidade operacional/jurídica/produção.
- **Falta `[ ]`**: não implementado ou sem evidência suficiente.

## Matriz consolidada (alto nível)

| Bloco | Status | Observação objetiva |
|---|---|---|
| RF-1 Gestão de usuários | Parcial | Base forte (cadastro, sessão, RBAC); recuperação de senha por e-mail fechada na Fase 1; AD/LDAP ainda evolutivo. |
| RF-2 Controle de acesso | Feito | Autorização e permissões por módulo/ação em backend com logs de acesso. |
| RF-3 Auditoria e rastreamento | Parcial | Versionamento RF-3.3 fechado em problemas/mudanças; cobertura transversal total ainda pendente. |
| RF-4 Dashboards/KPIs | Parcial | Dashboard operacional mínimo fechado; KPIs executivos completos ainda pendentes. |
| RF-5 Incidentes | Parcial | Fluxo principal implementado; amarrações completas de SLA/UX ainda em evolução. |
| RF-6 Requisições | Feito | Catálogo + fluxo principal prontos; fluxos de aprovação sequencial e paralela avançados integrados em Backend e React Frontend. |
| RF-7 Problemas/Mudanças | Feito | Problemas bem cobertos; mudanças com regras rígidas de janela de execução, travas de edição de campos sensíveis pós-aprovação e validações. |
| RF-8 SLA/Escalonamento | Feito | SLA e Escalonamento integrados ponta a ponta e validados via E2E; incidentes críticos geram SLAs de 15m/120m e breach executa reatribuição via REST. |
| RF-9 Integrações externas | Parcial | Entrada e saída MVP implementadas (inclui RF-9.2), com logs/DLQ/retry; maturidade de conectores produtivos pendente. |
| RF-10 Assíncrono (jobs/retry/DLQ) | Parcial | Outbox/relay e DLQ presentes; padronização total de jobs pesados ainda pendente. |
| Segurança NFR (RC §3.1) | Parcial | SQLi/rate-limit base, backup e LGPD operacional MVP implementados; formalização jurídica e produção pendentes. |
| Performance NFR (RC §3.2) | Parcial | Métricas HTTP Prometheus e alerta p95 versionados; baseline/SLO formal e operação contínua ainda pendentes. |
| Escalabilidade NFR (RC §3.3) | Parcial | Arquitetura desacoplada pronta; HA/auto scaling de produção ainda pendentes. |
| Disponibilidade NFR (RC §3.4) | Parcial | Healthcheck, métricas `/metrics`, regras de alerta, dashboard operacional e runbook implementados; HA/failover automático em produção pendentes. |
| Interoperabilidade NFR (RC §3.5) | Parcial | REST/JSON e contratos base prontos; política global de versionamento/contratos formais ainda evolutiva. |

## Itens que foram fechados neste ciclo

- RF-6: Cenários avançados de aprovação sequencial e paralela implementados em `request-service` e integrados ao Frontend.
- RF-7: Governança de Mudanças (trava de edição em campos críticos, restrição de janelas de execução futuras/passadas e validações em `problem-change-service`).
- RF-8: SLA & Escalonamento E2E integrados via RabbitMQ + HTTP (criação de SLA, simulação de breach e reatribuição automática de equipe).
- RF-3.3: versionamento de dados em `problem-change-service` (`problem_versions`/`change_versions`) + endpoints de consulta.
- RF-9.2: saída assíncrona em `integration-service` (`/api/outbound/v1/deliver`) com timeout/retry/DLQ.
- Endurecimento RF-10.2/RF-9.2: backoff exponencial no retry outbound e envio de body HTTP apenas quando aplicável.
- RF-4.4 (parcial): exportação assíncrona de definições de relatório no `reporting-service` com job persistido (submit + status + download).
- F1-04/RF-4.2: dashboard operacional mínimo fechado com filtros, risco de SLA e concluídos por período usando datas corretas.
- F1-05/RF-2: `read:own` com validação object-level em problemas/mudanças, versões protegidas e endpoint agregado restrito a `read:all`.
- F1-01/RF-5: E2E crítico de incidente fechado com login, criação, atribuição, transições e histórico consultável.
- F1-03/RF-1.6/RF-8.4: recuperação de senha integrada ao notification-service, SMTP/STARTTLS implementado, token não persistido em claro, envio não bloqueia a resposta principal e evento crítico `request.submitted` dispara e-mail ao solicitante quando há `requesterEmail`.
- F1-08: provedor SMTP documentado/configurado com fail-fast em produção.
- Backup/restore: scripts operacionais + retenção + smoke test + cron templates.
- LGPD operacional MVP: anonimização de usuário + expurgo por retenção no `identity-service` + runbook.
- Monitoramento operacional MVP: `ops:healthcheck`, `ops:maintenance`, `ops:evidence` + runbook.
- F2-02: observabilidade mínima versionada com `/metrics` por serviço, Prometheus, alert rules, dashboard Grafana e simulação `pnpm ops:alert:simulate`.
- Failover: runbook de procedimento para Postgres/RabbitMQ/Redis + validação pós-recuperação.
- RTO/RPO: documento base com metas iniciais e template de medição.

## Pendências críticas remanescentes

1. HA real de produção (replicação/cluster para Postgres, RabbitMQ e Redis).
2. Operacionalizar observabilidade centralizada em homologação/produção (Prometheus/Grafana ativos, APM/log centralizado e on-call corporativo).
3. Formalização jurídica LGPD (base legal, DPO, fluxo institucional completo do titular).
4. KPIs executivos completos (MTTR/MTBF/SLA) com exportação pesada assíncrona.
5. Expandir suíte de contrato para demais fluxos de eventos RabbitMQ ainda não cobertos e formalizar versionamento global de contratos.

As tarefas que dependem especificamente de deploy, credenciais, DNS, secret manager ou operação contínua estão consolidadas em `docs/ops/DEPLOYMENT_PENDING_CHECKLIST.md`.
