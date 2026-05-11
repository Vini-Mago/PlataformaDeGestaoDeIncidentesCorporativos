import type { ServiceCatalogItem } from "./entities/service-catalog-item.entity";

/**
 * Itens com `approvalFlow === "none"` saltam a fila humana após submissão (Submitted → Approved num único passo "send-for-approval").
 * `single` / `sequential` / `parallel` entram em **InApproval** após enviar; `approval_state` no pedido regista o progresso
 * (`sequential`: ordem em `approverRoleIds`; `parallel`: cada papel distinto em `approverRoleIds` deve aprovar uma vez).
 */
export function catalogRequiresInApprovalQueue(item: ServiceCatalogItem): boolean {
  return item.approvalFlow !== "none";
}
