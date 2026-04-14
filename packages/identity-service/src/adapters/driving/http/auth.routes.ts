import { Router, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "@pgic/shared";
import { AuthController } from "./auth.controller";
import {
  validateRegister,
  validateLogin,
  validateRefreshToken,
  validateForgotPassword,
  validateResetPassword,
} from "./auth.validation";

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20, // login + register combined per IP
  message: { error: "Too many attempts, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const oauthRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 30, // redirects + callbacks per IP
  message: { error: "Too many OAuth attempts, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many password recovery attempts, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

export function createAuthRoutes(
  controller: AuthController,
  authMiddleware: (req: Request, res: Response, next: NextFunction) => void
): Router {
  const router = Router();

  router.post("/auth/register", authRateLimiter, validateRegister, asyncHandler(controller.register.bind(controller)));
  router.post("/auth/login", authRateLimiter, validateLogin, asyncHandler(controller.login.bind(controller)));
  router.post("/auth/refresh", validateRefreshToken, asyncHandler(controller.refresh.bind(controller)));
  router.post("/auth/logout", authMiddleware, asyncHandler(controller.logout.bind(controller)));
  router.post("/auth/logout-others", authMiddleware, asyncHandler(controller.logoutOthers.bind(controller)));
  router.get("/auth/sessions", authMiddleware, asyncHandler(controller.listSessions.bind(controller)));
  router.delete("/auth/sessions/:sessionId", authMiddleware, asyncHandler(controller.revokeSession.bind(controller)));
  router.post(
    "/auth/forgot-password",
    forgotPasswordRateLimiter,
    validateForgotPassword,
    asyncHandler(controller.forgotPassword.bind(controller))
  );
  router.post("/auth/reset-password", validateResetPassword, asyncHandler(controller.resetPassword.bind(controller)));
  router.get("/auth/me", authMiddleware, asyncHandler(controller.me.bind(controller)));

  router.get("/auth/google", oauthRateLimiter, asyncHandler(controller.googleRedirect.bind(controller)));
  router.get("/auth/google/callback", oauthRateLimiter, asyncHandler(controller.googleCallback.bind(controller)));

  router.get("/auth/github", oauthRateLimiter, asyncHandler(controller.githubRedirect.bind(controller)));
  router.get("/auth/github/callback", oauthRateLimiter, asyncHandler(controller.githubCallback.bind(controller)));

  return router;
}
