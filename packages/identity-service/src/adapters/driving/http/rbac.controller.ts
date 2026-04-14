import { Request, Response, NextFunction } from "express";
import type { IAuthorizationRepository } from "../../../application/ports/authorization-repository.port";
import type { IAccessLogRepository } from "../../../application/ports/access-log-repository.port";

export class RbacController {
  constructor(
    private readonly authorizationRepository: IAuthorizationRepository,
    private readonly accessLogRepository: IAccessLogRepository
  ) {}

  listRoles = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const roles = await this.authorizationRepository.listRoles();
      res.status(200).json({ items: roles });
    } catch (err) {
      next(err);
    }
  };

  listPermissions = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const permissions = await this.authorizationRepository.listPermissions();
      res.status(200).json({ items: permissions });
    } catch (err) {
      next(err);
    }
  };

  updateRolePermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const roleName = req.params.roleName;
      const permissionIds = ((req.body as { permissionIds?: string[] }).permissionIds ?? []).filter(Boolean);
      await this.authorizationRepository.setRolePermissions(roleName, permissionIds);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  updateUserPermissionOverrides = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.params.id;
      const overrides = (req.body as { overrides?: Array<{ permissionId: string; granted: boolean }> }).overrides ?? [];
      await this.authorizationRepository.setUserPermissionOverrides(userId, overrides);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  listAccessLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 20;
      const from = req.query.from ? new Date(String(req.query.from)) : undefined;
      const to = req.query.to ? new Date(String(req.query.to)) : undefined;

      const result = await this.accessLogRepository.list({
        userId: req.query.userId ? String(req.query.userId) : undefined,
        eventType: req.query.eventType ? String(req.query.eventType) : undefined,
        result: req.query.result === "success" || req.query.result === "failure" ? req.query.result : undefined,
        from,
        to,
        page,
        pageSize,
      });

      res.status(200).json({
        total: result.total,
        page,
        pageSize,
        items: result.items.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
        })),
      });
    } catch (err) {
      next(err);
    }
  };
}
