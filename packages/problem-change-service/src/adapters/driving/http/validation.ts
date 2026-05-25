import { Request, Response, NextFunction } from "express";
import { createValidateBody } from "@pgic/shared";
import { z } from "zod";
import { createProblemSchema } from "../../../application/dtos/create-problem.dto";
import { createChangeSchema } from "../../../application/dtos/create-change.dto";
import { linkIncidentToProblemSchema } from "../../../application/dtos/link-incident-to-problem.dto";
import { updateProblemSchema } from "../../../application/dtos/update-problem.dto";
import { updateChangeSchema } from "../../../application/dtos/update-change.dto";
import { linkProblemToChangeSchema } from "../../../application/dtos/link-problem-to-change.dto";

const uuidSchema = z.string().uuid("Invalid ID format");
const listVersionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

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
export const validateLinkIncidentBody = createValidateBody(linkIncidentToProblemSchema);
export const validateUpdateProblem = createValidateBody(updateProblemSchema);
export const validateUpdateChange = createValidateBody(updateChangeSchema);
export const validateLinkProblemToChangeBody = createValidateBody(linkProblemToChangeSchema);

/** Query `incidentIds`: vírgulas entre UUIDs (máx. 100). */
export const validateLinkedForIncidentsQuery: (req: Request, res: Response, next: NextFunction) => void = (
  req,
  res,
  next
) => {
  const raw = req.query.incidentIds;
  if (typeof raw !== "string" || !raw.trim()) {
    res.status(400).json({ error: "Missing incidentIds query parameter" });
    return;
  }
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const schema = z.array(z.string().uuid()).min(1).max(100);
  const parsed = schema.safeParse(ids);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid incidentIds", message: parsed.error.message });
    return;
  }
  (req as Request & { validatedIncidentIds?: string[] }).validatedIncidentIds = parsed.data;
  next();
};

export const validateProblemIncidentParams: (req: Request, res: Response, next: NextFunction) => void = (
  req,
  res,
  next
) => {
  const idParsed = uuidSchema.safeParse(req.params.id);
  const incidentParsed = uuidSchema.safeParse(req.params.incidentId);
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid ID format", message: idParsed.error.message });
    return;
  }
  if (!incidentParsed.success) {
    res.status(400).json({ error: "Invalid incident ID format", message: incidentParsed.error.message });
    return;
  }
  next();
};

export const validateChangeProblemParams: (req: Request, res: Response, next: NextFunction) => void = (
  req,
  res,
  next
) => {
  const idParsed = uuidSchema.safeParse(req.params.id);
  const problemParsed = uuidSchema.safeParse(req.params.problemId);
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid ID format", message: idParsed.error.message });
    return;
  }
  if (!problemParsed.success) {
    res.status(400).json({ error: "Invalid problem ID format", message: problemParsed.error.message });
    return;
  }
  next();
};

export const validateListVersionsQuery: (req: Request, res: Response, next: NextFunction) => void = (
  req,
  res,
  next
) => {
  const parsed = listVersionsQuerySchema.safeParse({
    limit: req.query.limit,
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query", message: parsed.error.message });
    return;
  }
  next();
};
