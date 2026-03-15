export type ProblemStatus =
  | "Open"
  | "InAnalysis"
  | "Resolved"
  | "Closed";

export interface Problem {
  id: string;
  title: string;
  description: string;
  status: ProblemStatus;
  rootCause: string | null;
  actionPlan: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  closedAt: Date | null;
}

export const VALID_PROBLEM_STATUSES: ProblemStatus[] = [
  "Open",
  "InAnalysis",
  "Resolved",
  "Closed",
];
