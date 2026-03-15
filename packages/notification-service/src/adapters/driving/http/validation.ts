import { Request, Response, NextFunction } from "express";
import { createValidateBody } from "@pgic/shared";
import { z } from "zod";
import { createNotificationSchema } from "../../../application/dtos/create-notification.dto";

const uuidSchema = z.string().uuid("Invalid ID format");

export const validateIdParam = (req: Request, res: Response, next: NextFunction): void => {
  const parsed = uuidSchema.safeParse(req.params.id);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID format", message: parsed.error.message });
    return;
  }
  next();
};

export const validateCreateNotification = createValidateBody(createNotificationSchema);
