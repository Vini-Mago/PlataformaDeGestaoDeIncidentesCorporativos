import { Request, Response, NextFunction } from "express";
import { createValidateBody } from "@pgic/shared";
import { z } from "zod";
import { createIncidentSchema } from "../../../application/dtos/create-incident.dto";
import { changeIncidentStatusSchema } from "../../../application/dtos/change-incident-status.dto";
import { assignIncidentSchema } from "../../../application/dtos/assign-incident.dto";
import { addIncidentCommentSchema } from "../../../application/dtos/add-incident-comment.dto";

const uuidSchema = z.string().uuid("Invalid incident ID format");

export const validateIdParam: (req: Request, res: Response, next: NextFunction) => void = (req, res, next) => {
  const parsed = uuidSchema.safeParse(req.params.id);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid incident ID format", message: parsed.error.message });
    return;
  }
  next();
};

export const validateCreateIncident = createValidateBody(createIncidentSchema);
export const validateChangeIncidentStatus = createValidateBody(changeIncidentStatusSchema);
export const validateAssignIncident = createValidateBody(assignIncidentSchema);
export const validateAddIncidentComment = createValidateBody(addIncidentCommentSchema);
