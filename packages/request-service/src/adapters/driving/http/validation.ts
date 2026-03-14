import { createValidateBody } from "@pgic/shared";
import { createCatalogItemSchema } from "../../../application/dtos/create-catalog-item.dto";
import { createServiceRequestSchema } from "../../../application/dtos/create-service-request.dto";
import { addRequestCommentSchema } from "../../../application/dtos/add-request-comment.dto";

export const validateCreateCatalogItem = createValidateBody(createCatalogItemSchema);
export const validateCreateServiceRequest = createValidateBody(createServiceRequestSchema);
export const validateAddRequestComment = createValidateBody(addRequestCommentSchema);
