import { AppError } from "@pgic/shared";

export class CatalogItemNotFoundError extends AppError {
  override name = "CatalogItemNotFoundError";
  constructor(id: string) {
    super(`Catalog item not found: ${id}`);
    Object.setPrototypeOf(this, CatalogItemNotFoundError.prototype);
  }
}

export class ServiceRequestNotFoundError extends AppError {
  override name = "ServiceRequestNotFoundError";
  constructor(id: string) {
    super(`Service request not found: ${id}`);
    Object.setPrototypeOf(this, ServiceRequestNotFoundError.prototype);
  }
}

export class InvalidStatusTransitionError extends AppError {
  override name = "InvalidStatusTransitionError";
  constructor(from: string, to: string) {
    super(`Invalid status transition from ${from} to ${to}`);
    Object.setPrototypeOf(this, InvalidStatusTransitionError.prototype);
  }
}

export class InvalidStatusFilterError extends AppError {
  override name = "InvalidStatusFilterError";
  constructor(value: string) {
    super(`Invalid status filter: ${value}`);
    Object.setPrototypeOf(this, InvalidStatusFilterError.prototype);
  }
}
