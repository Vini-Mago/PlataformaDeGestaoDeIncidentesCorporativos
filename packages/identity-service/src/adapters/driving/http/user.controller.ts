import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { CreateUserUseCase } from "../../../application/use-cases/create-user.use-case";
import { GetUserByIdUseCase } from "../../../application/use-cases/get-user-by-id.use-case";
import { UpdateUserUseCase } from "../../../application/use-cases/update-user.use-case";
import type { CreateUserDto } from "../../../application/dtos/create-user.dto";
import type { UpdateUserDto } from "../../../application/dtos/update-user.dto";
import type { AuthenticatedRequest } from "@pgic/shared";
import { sendError } from "@pgic/shared";
import { InvalidUserIdError } from "../../../application/errors";

const uuidParamSchema = z.string().uuid();

/**
 * Adapter (entrada): controller HTTP que delega aos casos de uso.
 * Rotas protegidas por authMiddleware (+ requireRole em create).
 */
export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase
  ) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const dto: CreateUserDto = authReq.body;
      const result = await this.createUserUseCase.execute(dto);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = authReq.params;
      const parsed = uuidParamSchema.safeParse(id);
      if (!parsed.success) {
        next(new InvalidUserIdError("Invalid user id format"));
        return;
      }
      const userId = parsed.data;
      if (authReq.userId !== userId && authReq.userRole !== "admin") {
        sendError(res, 403, "Forbidden");
        return;
      }
      const user = await this.getUserByIdUseCase.execute(userId);
      res.json(user);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = authReq.params;
      const parsed = uuidParamSchema.safeParse(id);
      if (!parsed.success) {
        next(new InvalidUserIdError("Invalid user id format"));
        return;
      }
      const userId = parsed.data;
      if (authReq.userId !== userId && authReq.userRole !== "admin") {
        sendError(res, 403, "Forbidden");
        return;
      }
      const dto: UpdateUserDto = authReq.body;
      const user = await this.updateUserUseCase.execute(userId, dto);
      res.json(user);
    } catch (err) {
      next(err);
    }
  };
}
