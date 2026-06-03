# PGIC — Política LGPD v1

**Data de Publicação:** 2026-05-31  
**Versão:** 1.0  
**Status:** Operacional (MVP)

## 1. Objetivo
Esta política formaliza as diretrizes mínimas necessárias para assegurar a conformidade da Plataforma de Gestão de Incidentes Corporativos (PGIC) com a Lei Geral de Proteção de Dados Pessoais (LGPD), estabelecendo regras para inventário, retenção, anonimização e expurgo de dados pessoais.

## 2. Inventário de Dados Pessoais

Os dados pessoais tratados pelo sistema estão restritos aos seguintes domínios e serviços:

### 2.1. Domínio de Identidade (`identity-service`)
Armazenamento: Banco de Dados PostgreSQL (`pgic_identity`)
*   **`users`**: `email`, `login`, `name`, `phone`, `department`, `job_title`, `photo_url`, `preferred_language`, `time_zone`
*   **`auth_sessions`**: `ip`, `user_agent`
*   **`password_reset_tokens`**: `requester_ip`
*   **`access_logs`**: `identifier`, `ip`, `user_agent`, `path`

### 2.2. Domínio Transacional (`incident-service`, `request-service`, `problem-change-service`)
Armazenamento: Bancos transacionais específicos
*   **Tickets e Fluxos**: Apenas chaves estrangeiras (`requesterId`, `assignedToId`) que apontam para o serviço de identidade. Não armazenamos PII de forma duplicada.
*   **Campos de Texto Livre**: Descrições e comentários podem conter dados pessoais inseridos acidentalmente pelo usuário. Estes campos são regidos pela política de expurgo por tempo ou deleção em cascata mediante solicitação.

### 2.3. Auditoria Transversal (`audit-service`)
Armazenamento: Banco `pgic_audit`
*   **`audit_entries`**: `actor_id` (vinculado ao identity), histórico de alterações (que pode referenciar PII caso tenha sido alterado).

## 3. Base Legal e Finalidade

O processamento de dados pessoais na PGIC baseia-se primordialmente no **Legítimo Interesse** da corporação em manter um ambiente de tecnologia e serviços seguro, rastreável e operante, e na **Execução de Contrato** de trabalho, sendo essencial para autenticar usuários e responsabilizá-los por aprovações e ações críticas (ITSM).

## 4. Política de Retenção e Descarte

Definimos os seguintes prazos para retenção e eliminação automática (via rotinas de expurgo/prune):

*   **Logs de acesso (`access_logs`)**: 180 dias.
*   **Tokens de redefinição de senha (`password_reset_tokens`)**: 30 dias.
*   **Sessões de autenticação revogadas (`auth_sessions`)**: 90 dias.
*   **Tickets de ITSM (Incidentes, Requisições, etc)**: Retidos de acordo com as políticas corporativas de retenção (default de 5 anos), com expurgo automático após este período.

## 5. Fluxo de Anonimização e Exclusão (Direito do Titular)

Caso o titular (usuário corporativo) solicite a anonimização ou exclusão:
1.  **Validação**: O DPO/Compliance valida a solicitação junto à área de Gestão de Identidades.
2.  **Execução Técnica**: É executado o fluxo de anonimização no `identity-service` (ver `docs/LGPD_OPERACIONAL_RUNBOOK.md`).
3.  **Resultado Técnico**:
    *   Substituição do `email`, `login` e `name` por identificadores anônimos irreversíveis (ex: `anon_123abc`).
    *   Limpeza definitiva de campos de perfil opcionais.
    *   Revogação instantânea de todas as sessões e tokens ativos.
    *   A integridade referencial dos IDs (`userId`) em tickets passados é mantida para não corromper relatórios e métricas de SLA.

## 6. Pontos de Auditoria
Qualquer operação de expurgo ou anonimização de dados executada deverá gerar um registro de auditoria, contendo:
*   Data e hora da execução;
*   Comando executado;
*   ID técnico do operador responsável pela execução;
*   Log em JSON do resultado operacional (conforme runbook).
