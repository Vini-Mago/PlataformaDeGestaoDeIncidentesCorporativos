# PGIC — Checklist de Pendências de Deploy

Data: 2026-05-27  
Escopo: tarefas que dependem de homologação/produção, infraestrutura, DNS, secret manager ou operação contínua. Não são pendências de código para o MVP técnico.

## Como usar

- Marque cada item quando houver evidência no ambiente alvo.
- Anexe links/logs reais sempre que possível.
- Se um item não se aplicar ao ambiente atual, registre justificativa e owner.

## 1. E-mail transacional — Brevo

Status técnico no repo: implementado via SMTP/STARTTLS no `notification-service` e documentado em `docs/ops/EMAIL_PROVIDER_DECISION.md`.

Checklist de deploy:

- [ ] Criar conta/projeto Brevo para homologação.
- [ ] Criar conta/projeto Brevo para produção, ou separar credenciais por ambiente na mesma organização.
- [ ] Validar remetente/domínio na Brevo.
- [ ] Configurar DNS do domínio remetente: SPF, DKIM e DMARC.
- [ ] Criar credenciais SMTP Brevo por ambiente.
- [ ] Injetar segredos no secret manager/ambiente, sem commit no repositório:
  - `EMAIL_PROVIDER=smtp`
  - `EMAIL_FROM_ADDRESS`
  - `EMAIL_FROM_NAME`
  - `SMTP_HOST=smtp-relay.brevo.com`
  - `SMTP_PORT=587`
  - `SMTP_SECURE=false`
  - `SMTP_REQUIRE_TLS=true`
  - `SMTP_USERNAME`
  - `SMTP_PASSWORD`
- [ ] Executar envio real em homologação para recuperação de senha.
- [ ] Executar envio real em homologação para evento crítico `request.submitted`.
- [ ] Registrar evidência de entrega: message id, timestamp, destinatário de teste e screenshot/log da Brevo.
- [ ] Definir owner operacional para falhas de e-mail e limites/quota Brevo.

## 2. Observabilidade — Prometheus/Grafana

Status técnico no repo: `/metrics` por serviço, Prometheus, alert rules, dashboard Grafana e simulação local em `pnpm ops:alert:simulate`.

Checklist de deploy:

- [ ] Subir Prometheus no ambiente alvo ou integrar as regras ao Prometheus corporativo.
- [ ] Subir Grafana no ambiente alvo ou importar dashboard no Grafana corporativo.
- [ ] Ajustar targets de `infra/observability/prometheus/prometheus.yml` para DNS/serviços reais do ambiente.
- [ ] Importar dashboard `infra/observability/grafana/dashboards/pgic-operational-overview.json`.
- [ ] Ativar regras de alerta `infra/observability/prometheus/pgic-alerts.yml`.
- [ ] Configurar canal de alerta real: e-mail, Slack, Teams, PagerDuty, Opsgenie ou equivalente.
- [ ] Definir on-call/owner e severidade para cada alerta.
- [ ] Validar scrape de todos os serviços em `/metrics`.
- [ ] Executar simulação real de alerta em homologação e registrar evidência.
- [ ] Registrar URLs reais:
  - Prometheus: `TODO`
  - Grafana dashboard: `TODO`
  - Alertmanager/canal de alerta: `TODO`
- [ ] Definir retenção de métricas e política de acesso ao dashboard.

## 3. Backup e restore

Status técnico no repo: scripts `db:backup*`, `db:restore:test`, cron templates e runbook `docs/BACKUP_RESTORE_RUNBOOK.md`.

Checklist de deploy:

- [ ] Definir volume/storage de backup por ambiente.
- [ ] Configurar `BACKUP_DIR`, `BACKUP_RETENTION_DAYS`, `BACKUP_KEEP_MIN`, `BACKUP_MAX_AGE_HOURS`.
- [ ] Configurar `BACKUP_ALERT_WEBHOOK_URL` ou canal corporativo equivalente.
- [ ] Agendar backup periódico em homologação.
- [ ] Agendar backup periódico em produção.
- [ ] Executar `pnpm db:backup:run` em homologação.
- [ ] Executar `pnpm db:backup:check` em homologação.
- [ ] Executar `pnpm db:restore:test` em homologação.
- [ ] Medir e registrar RTO/RPO real em `docs/ops/RTO_RPO_TARGETS.md`.
- [ ] Registrar evidência de restore: timestamp, duração, DB restaurado, contagem/sanity check.
- [ ] Validar permissões de acesso aos backups e criptografia do storage, quando aplicável.

## 4. Segredos, TLS e hardening

Status técnico no repo: variáveis documentadas; produção exige segredos reais e TLS fora do código.

Checklist de deploy:

- [ ] Definir secret manager oficial: Kubernetes Secrets, Vault, AWS Secrets Manager, GCP Secret Manager, Azure Key Vault ou equivalente.
- [ ] Gerar `JWT_SECRET` forte e único por ambiente.
- [ ] Injetar todas as `*_DATABASE_URL` por ambiente.
- [ ] Injetar credenciais RabbitMQ/Redis/Postgres por ambiente.
- [ ] Validar que nenhum segredo real está versionado.
- [ ] Configurar TLS nos endpoints externos: frontend, BFF/gateway, APIs públicas e Grafana.
- [ ] Validar cadeia TLS e renovação automática de certificados.
- [ ] Configurar CORS/allowed hosts para domínios reais.
- [ ] Restringir portas internas para rede privada.
- [ ] Executar smoke test pós-deploy com HTTPS.

## 5. Alta disponibilidade e failover

Status técnico no repo: runbook em `docs/ops/FAILOVER_RUNBOOK.md`; HA real depende da plataforma de deploy.

Checklist de deploy:

- [ ] Definir estratégia HA para Postgres: serviço gerenciado, réplica, PITR ou cluster.
- [ ] Definir estratégia HA para RabbitMQ: cluster/quorum queues ou serviço gerenciado.
- [ ] Definir estratégia HA para Redis: serviço gerenciado, sentinel/cluster ou cache não crítico com fallback.
- [ ] Configurar réplicas dos serviços stateless.
- [ ] Configurar readiness/liveness checks no orquestrador.
- [ ] Validar rollout/rollback sem downtime para um serviço canário.
- [ ] Executar simulação de falha de serviço e validar alertas.
- [ ] Executar simulação de indisponibilidade de infra em homologação.
- [ ] Registrar RTO/RPO medidos após simulação.

## 6. Logs centralizados e APM

Status técnico no repo: logs estruturados com `pino` e `x-request-id`; APM/log centralizado dependem da plataforma.

Checklist de deploy:

- [ ] Escolher stack de logs: Loki, ELK/OpenSearch, Cloud Logging ou equivalente.
- [ ] Coletar stdout/stderr dos containers/processos.
- [ ] Indexar campos mínimos: `service`, `level`, `requestId`, `method`, `path`, `statusCode`, `durationMs`.
- [ ] Configurar retenção de logs por ambiente.
- [ ] Definir mascaramento/redação para dados sensíveis.
- [ ] Escolher APM/tracing: OpenTelemetry, Grafana Tempo, Jaeger, Datadog, New Relic ou equivalente.
- [ ] Validar correlação entre log, métrica e incidente operacional.

## 7. Evidência mínima para marcar deploy como pronto

- [ ] URL do ambiente de homologação registrada.
- [ ] Build/deploy com versão/hash registrado.
- [ ] Migrações aplicadas com log.
- [ ] Smoke test funcional executado.
- [ ] Envio Brevo real validado.
- [ ] Prometheus/Grafana ativos com dashboard acessível.
- [ ] Pelo menos um alerta simulado recebido no canal real.
- [ ] Backup e restore testados com RTO/RPO medidos.
- [ ] TLS válido nos endpoints externos.
- [ ] Secret manager configurado e auditado.
- [ ] Owner/on-call definidos para incidentes de produção.

## 8. Rollback, resposta a incidentes e game day

Status técnico no repo: runbook de rollback/resposta versionado em `docs/ops/ROLLBACK_INCIDENT_RESPONSE_RUNBOOK.md` + failover básico em `docs/ops/FAILOVER_RUNBOOK.md`; execução de game day real ainda pendente.

Checklist de deploy:

- [ ] Criar runbook de rollback por tipo de deploy: aplicação, migração, configuração, infraestrutura.
- [ ] Definir critérios objetivos para rollback vs hotfix.
- [ ] Definir fluxo de comunicação operacional: canal, responsáveis, atualizações e encerramento.
- [ ] Definir severidade e matriz de acionamento.
- [ ] Executar game day de rollback controlado em homologação.
- [ ] Registrar linha do tempo da simulação: início, detecção, decisão, execução, validação e encerramento.
- [ ] Registrar impacto observado e melhorias incorporadas ao runbook.
- [ ] Validar rollback de pelo menos um serviço stateless.
- [ ] Validar procedimento para falha de migração ou incompatibilidade de schema.

## 9. LGPD, governança de dados e DPO

Status técnico no repo: scripts e runbook técnico em `docs/LGPD_OPERACIONAL_RUNBOOK.md`; formalização jurídica ainda depende da organização.

Checklist de deploy:

- [ ] Nomear DPO ou responsável formal por privacidade.
- [ ] Publicar política LGPD v1 revisada por jurídico/compliance.
- [ ] Catalogar dados pessoais por serviço e tabela.
- [ ] Registrar base legal e finalidade por fluxo principal.
- [ ] Definir canal de solicitação do titular.
- [ ] Validar anonimização de usuário em homologação com `pnpm privacy:anonymize-user`.
- [ ] Validar expurgo de dados de autenticação em homologação com `pnpm privacy:prune-identity`.
- [ ] Definir política de retenção por ambiente.
- [ ] Registrar evidência auditável de execução: operador, timestamp, comando e saída.
- [ ] Avaliar campos livres cross-service: comentários, descrições, anexos e formulários dinâmicos.

## 10. CI/CD, segurança e qualidade antes de go-live

Status técnico no repo: pipeline base existe; `docs/issues/fase-3/F2-06-seguranca-ci.md` planeja gates de segurança.

Checklist de deploy:

- [ ] Garantir branch principal protegida.
- [ ] Exigir code review antes de merge.
- [ ] Rodar lint, build, unitários, integração e contrato no pipeline principal.
- [ ] Adicionar SAST no CI.
- [ ] Adicionar varredura de dependências/CVEs no CI.
- [ ] Adicionar verificação de segredos no CI.
- [ ] Definir thresholds de bloqueio para vulnerabilidades alta/crítica.
- [ ] Definir processo formal de exceção com owner e prazo.
- [ ] Executar teste de carga para endpoints críticos de listagem, dashboard e autenticação.
- [ ] Executar teste de segurança/pentest pontual antes de go-live público.
- [ ] Publicar relatório de pipeline/release com versão, commit e artefatos.

## 11. Contratos, versionamento e integrações

Status técnico no repo: contratos OpenAPI/eventos possuem verificação; política em `docs/API_VERSIONING_POLICY.md`.

Checklist de deploy:

- [ ] Executar `pnpm test:contract` no pipeline de release.
- [ ] Publicar OpenAPI da versão implantada.
- [ ] Confirmar que endpoints públicos novos usam `/v1` ou estratégia versionada equivalente.
- [ ] Registrar breaking changes em changelog técnico.
- [ ] Definir janela de convivência/depreciação para endpoints legados.
- [ ] Validar consumidores externos de webhook/API em homologação.
- [ ] Validar HMAC/API key/allowlist nos webhooks de integração.
- [ ] Registrar exemplos de payload aceito e rejeitado para integrações críticas.

## 12. Retry, DLQ e reprocessamento operacional

Status técnico no repo: política versionada em `docs/ops/MESSAGING_RETRY_DLQ_POLICY.md` e fluxo crítico implementado no `integration-service`; uniformização total cross-service ainda pendente.

Checklist de deploy:

- [ ] Definir política padrão de retry/backoff por tipo de erro.
- [ ] Definir critérios de envio para DLQ.
- [ ] Definir processo seguro de reprocessamento.
- [ ] Garantir correlation id ponta a ponta em mensagens críticas.
- [ ] Criar dashboard/consulta operacional de DLQ.
- [ ] Validar reprocessamento controlado em homologação.
- [ ] Registrar trilha completa de uma mensagem: produção, retry, DLQ e reprocessamento.
- [ ] Definir owner operacional para filas e integrações.

## 13. Go-live e pós-produção 48–72h

Status técnico no repo: checklist detalhado em `docs/ChecklistCompletoDetalhadoPassoAPasso.md`, Fase 17.

Checklist de deploy:

- [ ] Comunicar usuários piloto: data, janela, limitações conhecidas e canal de suporte.
- [ ] Abrir war room ou canal dedicado para incidentes da plataforma.
- [ ] Definir escala de acompanhamento nas primeiras 48–72 horas.
- [ ] Monitorar saúde dos serviços, filas, banco, erro 5xx, latência p95 e envio de e-mail.
- [ ] Coletar feedback estruturado de usuários piloto.
- [ ] Ajustar limites operacionais conforme uso real: rate limit, tamanho de anexo, timeouts e thresholds.
- [ ] Registrar incidentes, decisões e ações corretivas.
- [ ] Publicar relatório de encerramento do go-live: o que funcionou, o que falhou e dívidas técnicas priorizadas.

## Referências

- `docs/ops/EMAIL_PROVIDER_DECISION.md`
- `docs/ops/PLATFORM_OBSERVABILITY_RUNBOOK.md`
- `docs/BACKUP_RESTORE_RUNBOOK.md`
- `docs/ops/RTO_RPO_TARGETS.md`
- `docs/ops/FAILOVER_RUNBOOK.md`
- `docs/issues/fase-2/F2-02-observabilidade-producao.md`
- `docs/issues/fase-2/F2-03-rollback-resposta-incidentes.md`
- `docs/issues/fase-2/F2-08-politica-retry-dlq.md`
- `docs/issues/fase-3/F2-04-lgpd-v1.md`
- `docs/issues/fase-3/F2-05-segredos-tls.md`
- `docs/issues/fase-3/F2-06-seguranca-ci.md`
- `docs/API_VERSIONING_POLICY.md`
- `docs/ChecklistCompletoDetalhadoPassoAPasso.md`
