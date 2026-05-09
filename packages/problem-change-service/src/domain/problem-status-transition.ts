import type { ProblemStatus } from "./entities/problem.entity";

/** Transições permitidas (RF-7.2 — gestão do ciclo de vida do problema). */
const ALLOWED_NEXT: Record<ProblemStatus, ProblemStatus[]> = {
  Open: ["InAnalysis", "Resolved", "Closed"],
  InAnalysis: ["Open", "Resolved", "Closed"],
  Resolved: ["Closed", "InAnalysis", "Open"],
  Closed: ["Open", "InAnalysis"],
};

export function canTransitionProblemStatus(from: ProblemStatus, to: ProblemStatus): boolean {
  if (from === to) {
    return true;
  }
  return ALLOWED_NEXT[from].includes(to);
}
