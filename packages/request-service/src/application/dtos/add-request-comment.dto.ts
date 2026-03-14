import { z } from "zod";

export const addRequestCommentSchema = z.object({
  body: z.string().min(1).max(4000),
});

export type AddRequestCommentDto = z.infer<typeof addRequestCommentSchema>;
