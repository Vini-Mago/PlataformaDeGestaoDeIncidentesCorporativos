# Backlog de Execução Faseado (PGIC)

Data de referência: 2026-05-21  
Objetivo: converter lacunas atuais em entregas executáveis por fase.

## Convenções

- Prioridade: `P0` (crítico), `P1` (alto), `P2` (médio).
- Esforço: `S` (1-2 dias), `M` (3-5 dias), `L` (1-2 semanas).
- Dependências: IDs internas deste backlog.

## Fase 1 — MVP operacional fechado (2-4 semanas)

### Produto e fluxos críticos

1. `F1-01` `P0` `L` E2E crítico de jornada principal
- Escopo: login, abertura de incidente, atribuição, mudança de status, conclusão, histórico visível.
- Owner sugerido: Backend + Frontend + QA.
- Dependências: nenhuma.
- Aceite: suíte E2E verde no CI cobrindo jornada completa.

2. `F1-02` `P0` `M` Idempotência de ingestão de webhooks
- Escopo: impedir duplicidade de incidente em reenvio do mesmo evento externo.
- Owner sugerido: Integration + Incident.
- Dependências: nenhuma.
- Aceite: teste automático com reenvio do mesmo payload e resultado idempotente.

3. `F1-03` `P0` `M` Notificação mínima funcional
- Escopo: enviar e-mail transacional (recuperação de senha e notificação de evento crítico).
- Owner sugerido: Identity + Notification.
- Dependências: `F1-08`.
- Aceite: fluxo real em ambiente de homologação (não apenas stub/log).

4. `F1-04` `P1` `M` Painel operacional mínimo
- Escopo: abertos, em risco de SLA, concluídos por período com filtros básicos.
- Owner sugerido: Reporting + Frontend.
- Dependências: `F1-01`.
- Aceite: tela com dados consistentes com consultas backend.

5. `F1-05` `P1` `M` Consolidação de permissões nos fluxos principais
- Escopo: validar enforcement de RBAC para incidentes, requisições, problemas/mudanças.
- Owner sugerido: Identity + Times de domínio.
- Dependências: nenhuma.
- Aceite: testes de autorização (401/403) e matriz de permissão por papel.

### Qualidade e governança técnica

6. `F1-06` `P1` `S` Padronização de warnings de lint
- Escopo: remover `any` evitável nos testes e configurar tolerância explícita por exceção justificada.
- Owner sugerido: Backend.
- Dependências: nenhuma.
- Aceite: lint sem warnings bloqueantes acordados.

7. `F1-07` `P1` `M` Matriz RF x Teste x Evidência
- Escopo: mapear requisitos para casos automatizados e evidência de execução.
- Owner sugerido: QA + Tech Lead.
- Dependências: `F1-01`, `F1-05`.
- Aceite: artefato versionado em `docs/` e atualizado no CI.

8. `F1-08` `P0` `S` Definição operacional de provedor de e-mail
- Escopo: decidir SMTP/SendGrid/etc, credenciais por ambiente, política de fallback.
- Owner sugerido: DevOps + Segurança.
- Dependências: nenhuma.
- Aceite: configuração homologável sem segredo em repositório.

## Fase 2 — Produção segura e compliance (3-5 semanas)

### Confiabilidade operacional

9. `F2-01` `P0` `L` Backup automatizado + restore testado
- Escopo: rotina de backup Postgres, retenção, teste de restore periódico.
- Owner sugerido: DevOps/SRE.
- Dependências: nenhuma.
- Aceite: runbook e evidência de restore com RTO/RPO medidos.

10. `F2-02` `P0` `L` Observabilidade mínima de produção
- Escopo: métricas, logs, alertas para latência, erro 5xx, fila, banco e broker.
- Owner sugerido: DevOps/SRE.
- Dependências: nenhuma.
- Aceite: dashboard e alertas ativos com on-call definido.

11. `F2-03` `P0` `M` Plano de rollback e resposta a incidentes
- Escopo: procedimento por serviço e fluxo de comunicação operacional.
- Owner sugerido: Tech Lead + DevOps.
- Dependências: `F2-01`, `F2-02`.
- Aceite: simulação de rollback executada e documentada.

### Segurança e conformidade

12. `F2-04` `P0` `L` LGPD v1
- Escopo: inventário de dados pessoais, base legal, retenção, exclusão/anonimização, trilha.
- Owner sugerido: Produto + Jurídico/Compliance + Engenharia.
- Dependências: nenhuma.
- Aceite: política versionada + execução técnica mínima nos serviços críticos.

13. `F2-05` `P0` `M` Gestão de segredos e TLS
- Escopo: secret manager/vault, rotação, zero segredo em repo/imagem.
- Owner sugerido: Segurança + DevOps.
- Dependências: nenhuma.
- Aceite: auditoria interna sem vazamento de segredo e TLS válido em ambientes não-locais.

14. `F2-06` `P1` `M` Segurança no CI
- Escopo: SAST/dependency scan e gate de severidade.
- Owner sugerido: DevSecOps.
- Dependências: nenhuma.
- Aceite: pipeline com bloqueio de vulnerabilidade crítica/alta sem exceção formal.

### Contratos e integração resiliente

15. `F2-07` `P1` `M` Testes de contrato entre APIs/eventos
- Escopo: validar producer/consumer (OpenAPI + eventos RabbitMQ).
- Owner sugerido: Arquitetura + times de domínio.
- Dependências: `F1-07`.
- Aceite: pipeline de contrato rodando em PR.

16. `F2-08` `P1` `M` Política uniforme de retry/DLQ/reprocessamento
- Escopo: consolidar estratégia por integração e rastreabilidade por correlation id.
- Owner sugerido: Integration + Platform.
- Dependências: `F2-02`.
- Aceite: documentação + testes de falha/reprocessamento.

## Fase 3 — Escala e maturidade corporativa (4-8 semanas)

### Plataforma e escalabilidade

17. `F3-01` `P1` `L` Orquestração de produção
- Escopo: Kubernetes/ECS/Nomad com readiness/liveness, limites e estratégia de rollout.
- Owner sugerido: DevOps/SRE.
- Dependências: `F2-01`, `F2-02`, `F2-03`.
- Aceite: deploy reprodutível e rollback por serviço.

18. `F3-02` `P1` `M` Autoscaling orientado a métricas
- Escopo: CPU/memória e/ou backlog de fila para serviços stateless.
- Owner sugerido: DevOps/SRE.
- Dependências: `F3-01`.
- Aceite: teste controlado de carga com scale-out/scale-in observado.

19. `F3-03` `P2` `S` Política formal de versionamento de API
- Escopo: `/v1` (ou alternativa), depreciação e sunset.
- Owner sugerido: Arquitetura.
- Dependências: nenhuma.
- Aceite: padrão aplicado em gateway/docs.

### Produto analítico e integrações avançadas

20. `F3-04` `P1` `L` Dashboards executivos completos
- Escopo: MTTR, MTBF, SLA por serviço/equipe, comparativos temporais.
- Owner sugerido: Reporting + Frontend.
- Dependências: `F1-04`, `F2-02`.
- Aceite: números auditáveis e consistentes com backend.

21. `F3-05` `P1` `M` Exportação assíncrona pesada
- Escopo: geração CSV/PDF/Excel em background com notificação e expiração de artefato.
- Owner sugerido: Reporting + Notification.
- Dependências: `F1-03`, `F3-04`.
- Aceite: processamento desacoplado do request e trilha de status.

22. `F3-06` `P1` `L` Integração de saída (ERP/CRM)
- Escopo: conectores outbound com timeout, retry, circuit breaker e observabilidade.
- Owner sugerido: Integration.
- Dependências: `F2-08`.
- Aceite: envio confiável com recuperação operacional.

## Dependências críticas (caminho mínimo)

1. `F1-01` + `F1-02` + `F1-03`  
2. `F2-01` + `F2-02` + `F2-05`  
3. `F2-04` + `F2-07`  
4. `F3-01` + `F3-06`

## Riscos de execução

- Sem `F2-01/F2-02`: risco alto de indisponibilidade sem recuperação previsível.
- Sem `F2-04`: risco jurídico/compliance em produção.
- Sem `F1-01`: risco de regressão nos fluxos de maior valor.
- Sem `F3-06`: integração corporativa fica incompleta para operação expandida.

## Cadência recomendada

1. Planejamento quinzenal com no máximo 2 itens `L` simultâneos.
2. Toda issue com critérios de aceite testáveis.
3. Toda entrega com evidência (link de PR, pipeline, teste, dashboard ou runbook).
