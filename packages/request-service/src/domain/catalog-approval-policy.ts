import type { ServiceCatalogItem } from "./entities/service-catalog-item.entity";

/**
 * Itens com `approvalFlow === "none"` saltam a fila humana após submissão (Submitted → Approved num único passo "send-for-approval").
 * `single` / `sequential` / `parallel` tratam-se como "requer aprovação" nesta versão (estado InApproval até approve/reject).
 */
export function catalogRequiresInApprovalQueue(item: ServiceCatalogItem): boolean {
  return item.approvalFlow !== "none";
}
