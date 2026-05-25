const SENSITIVE_KEY_PATTERNS = [
  "password",
  "passwd",
  "token",
  "secret",
  "authorization",
  "api_key",
  "apikey",
  "cookie",
  "set-cookie",
  "credential",
];

function shouldMaskKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEY_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export function maskSensitivePayload(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map((item) => maskSensitivePayload(item));
  }
  if (input == null || typeof input !== "object") {
    return input;
  }

  const source = input as Record<string, unknown>;
  const masked: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if (shouldMaskKey(key)) {
      masked[key] = "[redacted]";
      continue;
    }
    masked[key] = maskSensitivePayload(value);
  }
  return masked;
}
