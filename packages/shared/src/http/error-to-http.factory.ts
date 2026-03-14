import type { HttpErrorMapping } from "./error-mapping";

/** Constructor of any Error subclass (accepts application errors with custom constructor signatures). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentional: error classes have varying constructor signatures
type ErrorCtor = new (...args: any[]) => Error;

const DEFAULT: HttpErrorMapping = { statusCode: 500, message: "Internal server error" };

/**
 * Cria uma função que mapeia erros de aplicação para resposta HTTP.
 * Cada serviço passa seus erros e status codes; erros desconhecidos retornam o default.
 */
export function createErrorToHttpMapper(
  mappings: Array<[ErrorCtor, number]>,
  defaultMapping: HttpErrorMapping = DEFAULT
): (err: unknown) => HttpErrorMapping {
  return (err: unknown): HttpErrorMapping => {
    for (const [Ctor, statusCode] of mappings) {
      if (err instanceof Ctor) {
        return { statusCode, message: (err as Error).message };
      }
    }
    return defaultMapping;
  };
}
