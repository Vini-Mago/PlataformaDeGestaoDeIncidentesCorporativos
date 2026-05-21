import { z } from "zod";

export const INCIDENT_ATTACHMENT_MAX_BYTES = 1_048_576;
export const INCIDENT_ATTACHMENT_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "application/pdf",
  "text/plain",
] as const;

function base64ByteLength(value: string): number {
  return Buffer.byteLength(value, "base64");
}

export const addIncidentAttachmentSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(INCIDENT_ATTACHMENT_ALLOWED_MIME_TYPES),
  contentBase64: z
    .string()
    .min(1)
    .refine((value) => {
      try {
        const normalized = Buffer.from(value, "base64").toString("base64").replace(/=+$/, "");
        return normalized === value.replace(/\s/g, "").replace(/=+$/, "");
      } catch {
        return false;
      }
    }, "contentBase64 must be valid base64")
    .refine(
      (value) => base64ByteLength(value) <= INCIDENT_ATTACHMENT_MAX_BYTES,
      `attachment must be at most ${INCIDENT_ATTACHMENT_MAX_BYTES} bytes`
    ),
});

export type AddIncidentAttachmentDto = z.infer<typeof addIncidentAttachmentSchema>;
