import { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "@pgic/shared";
import type { RegisterUseCase } from "../../../application/use-cases/register.use-case";
import type { LoginUseCase } from "../../../application/use-cases/login.use-case";
import type { GetCurrentUserUseCase } from "../../../application/use-cases/get-current-user.use-case";
import type { OAuthCallbackUseCase } from "../../../application/use-cases/oauth-callback.use-case";
import type { IOAuthProvider } from "../../../application/ports/oauth-provider.port";
import type { ICacheService } from "@pgic/shared";
import type { ITokenService } from "../../../application/ports/token-service.port";
import type { IUserRepository } from "../../../application/ports/user-repository.port";
import type { IAuthCredentialRepository } from "../../../application/ports/auth-credential-repository.port";
import type { IAuthSessionRepository } from "../../../application/ports/auth-session-repository.port";
import type { IPasswordResetTokenRepository } from "../../../application/ports/password-reset-token-repository.port";
import type { IPasswordHasher } from "../../../application/ports/password-hasher.port";
import type { IAccessLogRepository } from "../../../application/ports/access-log-repository.port";
import type { RegisterDto } from "../../../application/dtos/register.dto";
import type { LoginDto } from "../../../application/dtos/login.dto";
import type { AuthResponseDto } from "../../../application/dtos/auth-response.dto";
import type { OAuthCallbackResponseDto } from "../../../application/dtos/oauth-callback-response.dto";
import {
  oauthCallbackQuerySchema,
  type OAuthCallbackQueryDto,
} from "../../../application/dtos/oauth-callback-query.dto";
import { formatExpiresIn } from "./utils/format-expires-in";
import { performOAuthRedirect, OAUTH_STATE_PREFIX } from "./utils/oauth-redirect";
import { createRefreshToken, hashToken } from "./utils/refresh-token";
import { sendError, sendValidationError } from "@pgic/shared";
import { ExpiredRefreshTokenError, InvalidPasswordResetTokenError, InvalidRefreshTokenError } from "../../../application/errors";
import type { ForgotPasswordDto } from "../../../application/dtos/forgot-password.dto";
import type { ResetPasswordDto } from "../../../application/dtos/reset-password.dto";
import type { RefreshTokenDto } from "../../../application/dtos/refresh-token.dto";

type AuthRequestWithSession = AuthenticatedRequest & { sessionId?: string };

export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    private readonly oauthCallbackUseCase: OAuthCallbackUseCase,
    private readonly googleProvider: IOAuthProvider | null,
    private readonly githubProvider: IOAuthProvider | null,
    private readonly baseUrl: string,
    private readonly cache: ICacheService,
    private readonly jwtExpiresInSeconds: number,
    private readonly refreshTokenExpiresInSeconds: number,
    private readonly tokenService: ITokenService,
    private readonly userRepository: IUserRepository,
    private readonly authCredentialRepository: IAuthCredentialRepository,
    private readonly authSessionRepository: IAuthSessionRepository,
    private readonly passwordResetTokenRepository: IPasswordResetTokenRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly accessLogRepository: IAccessLogRepository,
    private readonly exposeResetTokenInResponse: boolean
  ) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto: RegisterDto = req.body;
      const result = await this.registerUseCase.execute(dto);
      const session = await this.createSessionForUser(result.user.id, req);
      const accessToken = this.tokenService.sign({
        sub: result.user.id,
        email: result.user.email,
        login: result.user.login ?? result.user.email,
        role: result.user.role ?? "user",
        sid: session.id,
      });
      const body: AuthResponseDto = {
        user: result.user,
        accessToken,
        expiresIn: formatExpiresIn(this.jwtExpiresInSeconds),
      };
      if (session.refreshToken) body.refreshToken = session.refreshToken;
      if (session.id) body.sessionId = session.id;
      await this.logAccess(req, "auth.register", "success", 201, result.user.id, result.user.email);
      res.status(201).json(body);
    } catch (err) {
      await this.logAccess(req, "auth.register", "failure", 400, undefined, (req.body as { email?: string })?.email);
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto: LoginDto = req.body;
      const result = await this.loginUseCase.execute(dto);
      const session = await this.createSessionForUser(result.user.id, req);
      const accessToken = this.tokenService.sign({
        sub: result.user.id,
        email: result.user.email,
        login: result.user.login ?? result.user.email,
        role: result.user.role ?? "user",
        sid: session.id,
      });
      const body: AuthResponseDto = {
        user: result.user,
        accessToken,
        expiresIn: formatExpiresIn(this.jwtExpiresInSeconds),
      };
      if (session.refreshToken) body.refreshToken = session.refreshToken;
      if (session.id) body.sessionId = session.id;
      await this.logAccess(req, "auth.login", "success", 200, result.user.id, dto.identifier || dto.email || dto.login);
      res.status(200).json(body);
    } catch (err) {
      await this.logAccess(req, "auth.login", "failure", 401, undefined, (req.body as { identifier?: string })?.identifier);
      next(err);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequestWithSession;
      const user = await this.getCurrentUserUseCase.execute(authReq.userId);
      if (!user) {
        sendError(res, 404, "User not found");
        return;
      }
      res.json(user);
    } catch (err) {
      next(err);
    }
  };

  /** async + await performOAuthRedirect para compatibilidade com asyncHandler e propagação de erros. */
  googleRedirect = async (req: Request, res: Response): Promise<void> => {
    if (!this.googleProvider) {
      sendError(res, 503, "Google OAuth is not configured");
      return;
    }
    await performOAuthRedirect(this.googleProvider, "google", res, this.cache, this.baseUrl);
  };

  googleCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleOAuthCallback(req, res, next, this.googleProvider, "google");
  };

  /** async + await performOAuthRedirect para compatibilidade com asyncHandler e propagação de erros. */
  githubRedirect = async (req: Request, res: Response): Promise<void> => {
    if (!this.githubProvider) {
      sendError(res, 503, "GitHub OAuth is not configured");
      return;
    }
    await performOAuthRedirect(this.githubProvider, "github", res, this.cache, this.baseUrl);
  };

  githubCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleOAuthCallback(req, res, next, this.githubProvider, "github");
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto: RefreshTokenDto = req.body;
      const tokenHash = hashToken(dto.refreshToken);
      const existing = await this.authSessionRepository.findByRefreshTokenHash(tokenHash);
      if (!existing || existing.revokedAt) {
        throw new InvalidRefreshTokenError("Invalid refresh token");
      }
      if (existing.expiresAt.getTime() <= Date.now()) {
        throw new ExpiredRefreshTokenError("Refresh token expired");
      }
      const user = await this.userRepository.findById(existing.userId);
      if (!user || user.status !== "active") {
        throw new InvalidRefreshTokenError("Invalid refresh token");
      }

      await this.authSessionRepository.revoke(existing.id, "rotated");
      const session = await this.createSessionForUser(user.id, req);
      const accessToken = this.tokenService.sign({
        sub: user.id,
        email: user.email.value,
        login: user.profile.login,
        role: user.role,
        sid: session.id,
      });
      await this.logAccess(req, "auth.refresh", "success", 200, user.id, user.email.value);
      res.status(200).json({
        accessToken,
        refreshToken: session.refreshToken,
        sessionId: session.id,
        expiresIn: formatExpiresIn(this.jwtExpiresInSeconds),
      });
    } catch (err) {
      await this.logAccess(req, "auth.refresh", "failure", 401);
      next(err);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequestWithSession;
      if (authReq.sessionId) {
        await this.authSessionRepository.revoke(authReq.sessionId, "logout");
      }
      await this.logAccess(req, "auth.logout", "success", 204, authReq.userId, authReq.userEmail);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  logoutOthers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequestWithSession;
      if (authReq.sessionId) {
        await this.authSessionRepository.revokeAllExcept(authReq.userId, authReq.sessionId);
      }
      await this.logAccess(req, "auth.logout_others", "success", 204, authReq.userId, authReq.userEmail);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  listSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequestWithSession;
      const sessions = await this.authSessionRepository.listByUserId(authReq.userId);
      res.status(200).json({
        items: sessions.map((session) => ({
          id: session.id,
          ip: session.ip,
          userAgent: session.userAgent,
          lastActivityAt: session.lastActivityAt.toISOString(),
          expiresAt: session.expiresAt.toISOString(),
          revokedAt: session.revokedAt?.toISOString() ?? null,
          revokeReason: session.revokeReason,
          createdAt: session.createdAt.toISOString(),
          current: authReq.sessionId === session.id,
        })),
      });
    } catch (err) {
      next(err);
    }
  };

  revokeSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const sessionId = req.params.sessionId;
      const sessions = await this.authSessionRepository.listByUserId(authReq.userId);
      const canRevoke = sessions.some((session) => session.id === sessionId);
      if (!canRevoke && authReq.userRole !== "admin") {
        sendError(res, 403, "Forbidden");
        return;
      }
      await this.authSessionRepository.revoke(sessionId, "manual_revoke");
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto: ForgotPasswordDto = req.body;
      const user = await this.userRepository.findByIdentifier(dto.identifier);
      let resetToken: string | undefined;
      if (user) {
        resetToken = createRefreshToken();
        await this.passwordResetTokenRepository.create({
          userId: user.id,
          tokenHash: hashToken(resetToken),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          requesterIp: req.ip ?? null,
        });
      }

      const body: Record<string, string> = {
        message: "If the account exists, recovery instructions were sent.",
      };
      if (resetToken && this.exposeResetTokenInResponse) {
        body.resetToken = resetToken;
      }
      await this.logAccess(req, "auth.forgot_password", "success", 200, user?.id, dto.identifier);
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto: ResetPasswordDto = req.body;
      const tokenHash = hashToken(dto.token);
      const tokenRecord = await this.passwordResetTokenRepository.findByTokenHash(tokenHash);
      if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt.getTime() <= Date.now()) {
        throw new InvalidPasswordResetTokenError("Invalid or expired reset token");
      }
      const user = await this.userRepository.findById(tokenRecord.userId);
      if (!user) {
        throw new InvalidPasswordResetTokenError("Invalid or expired reset token");
      }

      const passwordHash = await this.passwordHasher.hash(dto.password);
      await this.authCredentialRepository.save(user.id, passwordHash);
      await this.passwordResetTokenRepository.markUsed(tokenRecord.id);
      await this.authSessionRepository.revokeAllByUserId(user.id, "password_reset");

      await this.logAccess(req, "auth.reset_password", "success", 204, user.id, user.email.value);
      res.status(204).send();
    } catch (err) {
      await this.logAccess(req, "auth.reset_password", "failure", 400);
      next(err);
    }
  };

  private handleOAuthCallback = async (
    req: Request,
    res: Response,
    next: NextFunction,
    provider: IOAuthProvider | null,
    providerName: string
  ): Promise<void> => {
    if (!provider) {
      sendError(res, 503, providerName + " OAuth is not configured");
      return;
    }
    const code = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;
    const state = Array.isArray(req.query.state) ? req.query.state[0] : req.query.state;
    const parsed = oauthCallbackQuerySchema.safeParse({ code, state });
    if (!parsed.success) {
      sendValidationError(res, parsed.error);
      return;
    }
    const query: OAuthCallbackQueryDto = parsed.data;
    const stateKey = OAUTH_STATE_PREFIX + query.state;
    const stateValid = await this.cache.get<string>(stateKey);
    if (!stateValid) {
      sendError(res, 400, "Invalid or expired state");
      return;
    }
    await this.cache.delete(stateKey);

    try {
      const redirectUri = this.baseUrl + "/api/auth/" + providerName + "/callback";
      const result = await this.oauthCallbackUseCase.execute(query.code, redirectUri, provider);
      const session = await this.createSessionForUser(result.user.id, req);
      const accessToken = this.tokenService.sign({
        sub: result.user.id,
        email: result.user.email,
        login: result.user.login ?? result.user.email,
        role: result.user.role ?? "user",
        sid: session.id,
      });
      const body: OAuthCallbackResponseDto = {
        user: result.user,
        accessToken,
        expiresIn: formatExpiresIn(this.jwtExpiresInSeconds),
      };
      if (session.refreshToken) body.refreshToken = session.refreshToken;
      if (session.id) body.sessionId = session.id;
      res.json(body);
    } catch (err) {
      next(err);
    }
  };

  private async createSessionForUser(userId: string, req: Request): Promise<{ id: string; refreshToken: string }> {
    const refreshToken = createRefreshToken();
    const refreshTokenHash = hashToken(refreshToken);
    const session = await this.authSessionRepository.create({
      userId,
      refreshTokenHash,
      ip: req.ip ?? null,
      userAgent: this.getUserAgent(req),
      expiresAt: new Date(Date.now() + this.refreshTokenExpiresInSeconds * 1000),
    });
    return { id: session.id, refreshToken };
  }

  private async logAccess(
    req: Request,
    eventType: string,
    result: "success" | "failure",
    statusCode: number,
    userId?: string,
    identifier?: string
  ): Promise<void> {
    await this.accessLogRepository.create({
      eventType,
      result,
      statusCode,
      userId: userId ?? null,
      identifier: identifier ?? null,
      ip: req.ip ?? null,
      userAgent: this.getUserAgent(req),
      method: req.method,
      path: req.path,
    });
  }

  private getUserAgent(req: Request): string | null {
    const header = req.headers["user-agent"];
    if (Array.isArray(header)) {
      return header.join(" ");
    }
    return header ?? null;
  }
}
