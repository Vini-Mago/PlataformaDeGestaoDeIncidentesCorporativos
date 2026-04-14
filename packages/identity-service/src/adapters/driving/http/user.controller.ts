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

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = authReq.params;
      const parsed = uuidParamSchema.safeParse(id);
      if (!parsed.success) {
        next(new InvalidUserIdError("Invalid user id format"));
        return;
      }
      const userId = parsed.data;
      const status = (authReq.body as { status: "active" | "inactive" }).status;
      const user = await this.updateUserUseCase.execute(userId, { status });
      res.json(user);
    } catch (err) {
      next(err);
    }
  };

  importUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const csv = String((req.body as { csv?: string }).csv ?? "");
      const lines = csv
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        res.status(400).json({ error: "CSV content is required" });
        return;
      }

      const header = lines[0].split(",").map((cell) => cell.trim().toLowerCase());
      const required = ["email", "name"];
      const missing = required.filter((field) => !header.includes(field));
      if (missing.length > 0) {
        res.status(400).json({ error: `Missing required columns: ${missing.join(", ")}` });
        return;
      }

      const indexByName = new Map(header.map((name, idx) => [name, idx]));
      const accepted: Array<{ line: number; id: string; email: string }> = [];
      const rejected: Array<{ line: number; reason: string }> = [];

      for (let i = 1; i < lines.length; i += 1) {
        const row = lines[i].split(",").map((cell) => cell.trim());
        try {
          const dto: CreateUserDto = {
            email: row[indexByName.get("email") ?? -1] ?? "",
            name: row[indexByName.get("name") ?? -1] ?? "",
            login: row[indexByName.get("login") ?? -1] || undefined,
            role: row[indexByName.get("role") ?? -1] || undefined,
            status: (row[indexByName.get("status") ?? -1] as "active" | "inactive") || undefined,
            phone: row[indexByName.get("phone") ?? -1] || undefined,
            department: row[indexByName.get("department") ?? -1] || undefined,
            jobTitle: row[indexByName.get("jobtitle") ?? -1] || undefined,
            photoUrl: row[indexByName.get("photourl") ?? -1] || undefined,
            preferredLanguage: row[indexByName.get("preferredlanguage") ?? -1] || undefined,
            timeZone: row[indexByName.get("timezone") ?? -1] || undefined,
          };
          const created = await this.createUserUseCase.execute(dto);
          accepted.push({ line: i + 1, id: created.id, email: created.email });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          rejected.push({ line: i + 1, reason: message });
        }
      }

      res.status(200).json({
        processed: lines.length - 1,
        acceptedCount: accepted.length,
        rejectedCount: rejected.length,
        accepted,
        rejected,
      });
    } catch (err) {
      next(err);
    }
  };
}
