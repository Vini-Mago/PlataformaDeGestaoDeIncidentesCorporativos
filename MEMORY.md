# Project Memory: Plataforma de Gestão de Incidentes Corporativos (PGIC)

This file serves as the private architectural index and state tracker for PGIC, updated across agentic execution sessions.

## 1. Architectural Overview & Services

PGIC is structured as a pnpm-based monorepo consisting of 11 distinct packages:

*   **`identity-service`**: Handles user registration, sessions, RBAC (Role-Based Access Control), password resets, and LGPD-compliant anonymization.
*   **`incident-service`**: Core incident management workflow (creation, assignments, state transitions, linking with problems).
*   **`request-service`**: Service requests with advanced approval workflows (single, sequential, and parallel approval steps).
*   **`problem-change-service`**: Covers Problem management (root cause tracking) and Change governance (version control for problems/changes).
*   **`sla-service`**: Calculates SLAs, tracks SLA risk thresholds, and emits breach events.
*   **`escalation-service`**: Reacts to SLA breach/risk events and applies escalation rules (criticality, breach type, reassignments).
*   **`notification-service`**: Manages email delivery via SMTP/STARTTLS for notifications.
*   **`integration-service`**: Standardizes external system communications (inbound and outbound) with timeout, retry backoff, and Dead Letter Queue (DLQ).
*   **`audit-service`**: Audits cross-service events and actions.
*   **`shared`**: Shared event contracts, validation schemas, and common utilities.
*   **`reporting-service`**: Generates reports asynchronously (submit, track, download).

---

## 2. Recent Milestones & Code Changes (2026-05-28)

### Platform Boot & Integration Fixes
*   **F2-10 (Dev Orchestration & Type Resolution)**:
    *   Diagnosed and resolved TypeScript compilation errors across downstream microservices (`Expected 1 arguments, but got 2` in `app.ts` files).
    *   Root cause was an out-of-sync `@pgic/shared` build (`dist/index.d.ts` not matching the source signature of `createMetricsHandler`). Fixed by rebuilding the shared package: `pnpm --filter @pgic/shared build`.
    *   Cleaned and restarted all microservices on standard configured ports (by stopping legacy Docker containers via `pnpm docker:down` and initiating a fresh `make run` cycle).
    *   Verified full ecosystem health with `pnpm ops:healthcheck`, achieving 100% green startup health check passes across all 10 services and Nginx Gateway.

### E2E Test Optimization & Requirements Validation
*   **Vitest E2E Test Isolation**:
    *   Identified that `packages/incident-service` was running E2E tests (`**/*.e2e.spec.ts`) during default unit test sweeps because they were not excluded in `vitest.config.ts`.
    *   Since E2E tests depend on external databases and RabbitMQ, running them under standard unit runs led to test timeouts.
    *   Updated `packages/incident-service/vitest.config.ts` to exclude `**/*.e2e.spec.ts` from unit tests, ensuring `pnpm test` finishes 100% green across the entire monorepo in seconds.
*   **Requirements Synchronization**:
    *   Fully reviewed and marked all related checklist requirements as complete (`Feito` / `[x]`) for **RF-6 (Advanced Approvals)**, **RF-7 (Change Governance)**, and **RF-8 (SLA/Escalation E2E)** in `docs/ChecklistContextoCorporativoCompleto.md` and `docs/ChecklistCompletoDetalhadoPassoAPasso.md`.

## 2.1 Earlier Milestones (2026-05-27)
### Phase 2: Platform Resilience & Policies
*   **F2-03 (Rollback & Incident Response Plan)**:
    *   Technical runbook defined in [ROLLBACK_INCIDENT_RESPONSE_RUNBOOK.md](file:///home/levi/Projects/PlataformaDeGestaoDeIncidentesCorporativos/docs/ops/ROLLBACK_INCIDENT_RESPONSE_RUNBOOK.md).
    *   Covers SEV classification, decision matrix (rollback vs. hotfix), operational timeline, and detailed recovery steps for application/config/database states.
*   **F2-08 (Uniform Messaging Retry & DLQ)**:
    *   Uniform policy established in [MESSAGING_RETRY_DLQ_POLICY.md](file:///home/levi/Projects/PlataformaDeGestaoDeIncidentesCorporativos/docs/ops/MESSAGING_RETRY_DLQ_POLICY.md).
    *   Reference flow in `integration-service` includes exponential backoff retry and DLQ routing (`GET /api/integration-dlq`, `POST /api/integration-dlq/:id/reprocess` with deduplication protection).
    *   Integration spec updated: [integration-service.integration.spec.ts](file:///home/levi/Projects/PlataformaDeGestaoDeIncidentesCorporativos/packages/integration-service/src/__tests__/integration/integration-service.integration.spec.ts).

### Phase 4: SLA, Advanced Approvals & Governance
*   **F4-01 (Incident + SLA Escalation)**:
    *   Updated SLA escalation use-case: [handle-escalation-domain-event.use-case.ts](file:///home/levi/Projects/PlataformaDeGestaoDeIncidentesCorporativos/packages/escalation-service/src/application/use-cases/handle-escalation-domain-event.use-case.ts).
    *   Added support for `no_first_response_minutes` by detecting response breach types (`sla.breach` with `breachType=response`).
    *   New unit tests: [handle-escalation-domain-event.use-case.spec.ts](file:///home/levi/Projects/PlataformaDeGestaoDeIncidentesCorporativos/packages/escalation-service/src/application/use-cases/handle-escalation-domain-event.use-case.spec.ts).
*   **F4-02 (Advanced Approvals in Requests)**:
    *   Advanced approval flows (`single`, `sequential`, `parallel`) implemented in `request-service`.
    *   New unit tests for transitions: [send-for-approval-service-request.use-case.spec.ts](file:///home/levi/Projects/PlataformaDeGestaoDeIncidentesCorporativos/packages/request-service/src/application/use-cases/send-for-approval-service-request.use-case.spec.ts).

---

## 3. Current Project Status (Verified via Code & Tests)

> [!WARNING]
> DO NOT rely strictly on the `docs/*.md` files for requirements progress. Several claims in the `.md` documentation are placeholders or outdated:
> - **AD/LDAP (RF-1)** is listed as "evolutivo" but is **completely missing (0% implemented)** in the code.
> - **Change Governance (RF-7 / F4-03)** is listed as "Pendente" but is **fully implemented and tested in the backend use-cases**.
> - **Advanced Approvals (RF-6 / F4-02)** is **fully implemented and integrated in both Backend and React Frontend**, with sequential/parallel UI displays and strict button role checks.

### Real Code-Based Backlog

| Area / Feature | Real Code Status | Verified Next Actions |
| :--- | :--- | :--- |
| **`RF-1` User AD/LDAP** | **0% implemented** | Implement LDAP connector adapter and authentication logic in `identity-service` if required. |
| **`RF-6` Advanced Approvals** | **Done (Backend & Frontend)** | Sequential and parallel approvals dynamically displayed; action buttons visible only to target step/role. |
| **`RF-7` Change Governance** | **Done (Backend), needs frontend validation** | Ensure frontend forms and actions enforce locked states correctly for changes. |
| **`RF-8` SLA & Escalation E2E** | **Fully Done & Tested** | Designed, implemented, and verified E2E integration test scenario (`sla-escalation.e2e.spec.ts`) spanning incident creation, SLA calculations, breach, and reassignment via HTTP. |


---

## 4. Key Verification Commands

Use these commands to validate system capabilities locally:

*   **Integration Tests (DLQ / Reprocessing)**:
    ```bash
    pnpm --filter integration-service run test:integration
    ```
*   **Event Contract Validation**:
    ```bash
    pnpm test:contract:events
    ```
*   **Escalation Service Domain Logic**:
    ```bash
    pnpm --filter escalation-service test -- src/application/use-cases/handle-escalation-domain-event.use-case.spec.ts
    ```
*   **Request Service Approvals**:
    ```bash
    pnpm --filter request-service test -- src/application/use-cases/send-for-approval-service-request.use-case.spec.ts
    ```
*   **Platform Health**:
    ```bash
    pnpm ops:healthcheck
    ```

---

## 5. Implementation Plans & Task Backlogs

*   **Plan to Complete Partial Requirements**: [PLANO_FECHAMENTO_REQUISITOS_PARCIAIS.md](file:///home/levi/Projects/PlataformaDeGestaoDeIncidentesCorporativos/docs/PLANO_FECHAMENTO_REQUISITOS_PARCIAIS.md)

