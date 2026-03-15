import { Request, Response, NextFunction } from "express";
import { createValidateBody } from "@pgic/shared";
import { z } from "zod";
import { createProblemSchema } from "../../../application/dtos/create-problem.dto";
import { createChangeSchema } from "../../../application/dtos/create-change.dto";

const uuidSchema = z.string().uuid("Invalid ID format");

export const validateIdParam: (req: Request, res: Response, next: NextFunction) => void = (
  req,
  res,
  next
) => {
  const parsed = uuidSchema.safeParse(req.params.id);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID format", message: parsed.error.message });
    return;
  }
  next();
};

export const validateCreateProblem = createValidateBody(createProblemSchema);
export const validateCreateChange = createValidateBody(createChangeSchema);
