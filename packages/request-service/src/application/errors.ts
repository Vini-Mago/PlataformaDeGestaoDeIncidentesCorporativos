import { AppError } from "@pgic/shared";

export class CatalogItemNotFoundError extends AppError {
  constructor(id: string) {
    super(`Catalog item not found: ${id}`);
  }
}

export class ServiceRequestNotFoundError extends AppError {
  constructor(id: string) {
    super(`Service request not found: ${id}`);
  }
}

export class InvalidStatusTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(`Invalid status transition from ${from} to ${to}`);
  }
}

export class InvalidStatusFilterError extends AppError {
  constructor(value: string) {
    super(`Invalid status filter: ${value}`);
  }
}
