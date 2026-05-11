import Ajv, { type ValidateFunction, type ErrorObject } from "ajv";
import { FormDataValidationError, InvalidCatalogFormSchemaError } from "../errors";

const ajv = new Ajv({ allErrors: true, strict: false, coerceTypes: true });
const validators = new Map<string, ValidateFunction>();

function schemaCacheKey(schema: object): string {
  return JSON.stringify(schema);
}

function isEffectivelyEmptySchema(schema: unknown): boolean {
  if (schema === null || schema === undefined) return true;
  if (typeof schema !== "object" || Array.isArray(schema)) return true;
  return Object.keys(schema as object).length === 0;
}

function getValidator(schema: object): ValidateFunction {
  const key = schemaCacheKey(schema);
  let fn = validators.get(key);
  if (!fn) {
    try {
      fn = ajv.compile(schema);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new InvalidCatalogFormSchemaError(msg);
    }
    validators.set(key, fn);
  }
  return fn;
}

/**
 * RF-6.1: valida `formData` contra o JSON Schema do catálogo quando definido.
 * Sem schema (null / vazio) não restringe `formData` (continua opcional no DTO).
 */
export function validateServiceRequestFormData(
  formData: Record<string, unknown> | null,
  formSchema: Record<string, unknown> | null
): void {
  if (isEffectivelyEmptySchema(formSchema)) {
    return;
  }
  const schema = formSchema as object;
  const validate = getValidator(schema);
  const data = formData === null ? {} : formData;
  const ok = validate(data);
  if (!ok && validate.errors) {
    const details = formatAjvErrors(validate.errors);
    throw new FormDataValidationError(details);
  }
}

function formatAjvErrors(errors: ErrorObject[]): string[] {
  return errors.map((e) => {
    const path = e.instancePath?.length ? e.instancePath : "(root)";
    return `${path}: ${e.message ?? "invalid"}`.trim();
  });
}
