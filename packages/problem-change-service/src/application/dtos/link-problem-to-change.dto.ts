import { z } from "zod";

export const linkProblemToChangeSchema = z.object({
  problemId: z.string().uuid(),
});

export type LinkProblemToChangeDto = z.infer<typeof linkProblemToChangeSchema>;
