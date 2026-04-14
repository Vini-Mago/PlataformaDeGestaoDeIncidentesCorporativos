import jwt from "jsonwebtoken";
import { z } from "zod";
import type { ITokenService, TokenPayload } from "../../../application/ports/token-service.port";
import { logger } from "@pgic/shared";

/** Schema para validar o payload do JWT após decode (exp/iat vindos do jsonwebtoken). */
const jwtPayloadSchema = z.object({
  sub: z.string().min(1),
  email: z.string().optional(),
  login: z.string().optional(),
  role: z.string().optional(),
  sid: z.string().optional(),
  exp: z.number(),
  iat: z.number(),
});

export interface JwtTokenServiceConfig {
  secret: string;
  expiresInSeconds: number;
}

/**
 * Adapter: implementação de ITokenService com JWT.
 */
export class JwtTokenService implements ITokenService {
  constructor(private readonly config: JwtTokenServiceConfig) {}

  sign(payload: Omit<TokenPayload, "iat" | "exp">): string {
    const { sub, email, login, role, sid } = payload;
    return jwt.sign(
      { sub, email, login, role: role ?? "user", sid },
      this.config.secret,
      { expiresIn: this.config.expiresInSeconds, algorithm: "HS256" }
    );
  }

  verify(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.config.secret, {
        algorithms: ["HS256"],
      });
      const result = jwtPayloadSchema.safeParse(decoded);
      if (!result.success) {
        logger.debug({ err: result.error.flatten() }, "JWT payload validation failed");
        return null;
      }
      const data = result.data;
      return {
        sub: data.sub,
        email: data.email ?? "",
        login: data.login,
        role: data.role ?? "user",
        sid: data.sid,
        iat: data.iat,
        exp: data.exp,
      };
    } catch (err) {
      logger.debug({ err }, "JWT verify failed");
      return null;
    }
  }
}
