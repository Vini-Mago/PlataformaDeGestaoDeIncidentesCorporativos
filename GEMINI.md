# Shared Agentic Instructions: PGIC

This file documents critical instructions and engineering standards for any AI agent interacting with the Plataforma de Gestão de Incidentes Corporativos (PGIC) workspace.

## 1. Technical Communication Standard
*   **English ONLY**: All technical documentation, logs, code comments, commit messages, and internal communications must be authored in English. This guarantees maximum alignment with standard code structures and maintains logical consistency.

## 2. Core Engineering Protocols

### 2.1 Agentic TDD (Test-Driven Development)
*   **Rule**: Never implement a feature, transition, or fix a bug without first creating/running a test script that reproduces the failure or validates the requirement.
*   **Validation**: Tasks are only considered complete once all automated tests pass (`vitest` / integration suite).

### 2.2 Leaf Node Pattern & Modularization
*   **Modularity**: Decompose large files or functions into independent, single-responsibility units ("Leaf Nodes") that fit within the context window.
*   **Thought Decomposition**: For any non-trivial task, use planning mode to decompose the problem into a Multi-Level Reasoning graph before changing code.

### 2.3 Security-First
*   **Rule**: Always verify that new routes, event handlers, or database operations do not introduce SQL injection, expose sensitive credentials, or violate OWASP Top 10 guidelines. Ensure tokens or passwords are never stored or transmitted in plain text.

---

## 3. Project Specific Guidelines

### 3.1 Domain-Driven Event Infrastructure
*   RabbitMQ contracts are maintained under `packages/shared`.
*   Ensure that any new outbox pattern event aligns with established contracts.
*   Verify schemas using:
    ```bash
    pnpm test:contract:events
    ```

### 3.2 Resilience & Retry Patterns
*   Always implement exponential backoff with jitter for outbound integrations.
*   Always use a Dead Letter Queue (DLQ) for transit failures or exhausted attempts.
*   Do not allow duplicate processing (deduplication via unique transaction/event identifiers).
