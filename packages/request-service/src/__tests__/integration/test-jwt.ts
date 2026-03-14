import jwt from "jsonwebtoken";

const TEST_JWT_SECRET = "integration-test-secret-min-32-chars-for-jwt";

export interface TestJwtPayload {
  sub: string;
  email?: string;
  role?: string;
}

/**
 * Creates a valid JWT for integration tests.
 * Uses the same secret as the request-service container in tests.
 */
export function createTestJwt(payload: TestJwtPayload): string {
  return jwt.sign(
    {
      sub: payload.sub,
      email: payload.email,
      role: payload.role ?? "user",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    TEST_JWT_SECRET,
    { algorithm: "HS256" }
  );
}

export { TEST_JWT_SECRET };
