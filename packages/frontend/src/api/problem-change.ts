import { bffFetchJson } from "./http";

export type ProblemOption = {
  id: string;
  title: string;
};

export type IncidentProblemLink = {
  incidentId: string;
  problemId: string;
  problemTitle: string;
};

export async function fetchProblemsForSelect(): Promise<ProblemOption[]> {
  const rows = await bffFetchJson<
    Array<{
      id: string;
      title: string;
    }>
  >("/problem-change/problems");
  return rows.map((r) => ({ id: r.id, title: r.title }));
}

export async function fetchIncidentProblemLinks(incidentIds: string[]): Promise<IncidentProblemLink[]> {
  if (incidentIds.length === 0) {
    return [];
  }
  const q = encodeURIComponent(incidentIds.join(","));
  return bffFetchJson<IncidentProblemLink[]>(
    `/problem-change/problems/linked-for-incidents?incidentIds=${q}`
  );
}

export async function linkIncidentToProblem(problemId: string, incidentId: string): Promise<void> {
  await bffFetchJson(`/problem-change/problems/${problemId}/incidents`, {
    method: "POST",
    body: JSON.stringify({ incidentId }),
  });
}

export async function unlinkIncidentFromProblem(problemId: string, incidentId: string): Promise<void> {
  await bffFetchJson(`/problem-change/problems/${problemId}/incidents/${incidentId}`, {
    method: "DELETE",
  });
}

export async function createProblem(payload: { title: string; description: string }): Promise<{ id: string }> {
  const body = await bffFetchJson<{ id: string } & Record<string, unknown>>("/problem-change/problems", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return { id: body.id };
}

/** Lista completa para gestão RF-7.2 (mesmo payload que o serviço). */
export type ProblemRecord = {
  id: string;
  title: string;
  description: string;
  status: string;
  rootCause: string | null;
  actionPlan: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
};

export async function fetchProblemsList(): Promise<ProblemRecord[]> {
  return bffFetchJson<ProblemRecord[]>("/problem-change/problems");
}

export type UpdateProblemPayload = {
  status?: "Open" | "InAnalysis" | "Resolved" | "Closed";
  rootCause?: string | null;
  actionPlan?: string | null;
};

export async function updateProblem(problemId: string, payload: UpdateProblemPayload): Promise<unknown> {
  return bffFetchJson(`/problem-change/problems/${problemId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/** RF-7.3 — mudanças (lista sem vínculos). */
export type ChangeRecord = {
  id: string;
  title: string;
  description: string;
  justification: string;
  changeType: string;
  risk: string;
  status: string;
  windowStart: string | null;
  windowEnd: string | null;
  rollbackPlan: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type ChangeDetail = ChangeRecord & {
  linkedIncidentIds: string[];
  linkedProblemIds: string[];
};

export async function fetchChangesList(): Promise<ChangeRecord[]> {
  return bffFetchJson<ChangeRecord[]>("/problem-change/changes");
}

export async function fetchChangeDetail(id: string): Promise<ChangeDetail> {
  return bffFetchJson<ChangeDetail>(`/problem-change/changes/${id}`);
}

export type UpdateChangePayload = {
  status?: string;
  title?: string;
  description?: string;
  justification?: string;
  changeType?: string;
  risk?: string;
  windowStart?: string | null;
  windowEnd?: string | null;
  rollbackPlan?: string | null;
};

export async function updateChangeRecord(changeId: string, payload: UpdateChangePayload): Promise<ChangeDetail> {
  return bffFetchJson<ChangeDetail>(`/problem-change/changes/${changeId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function linkIncidentToChange(changeId: string, incidentId: string): Promise<void> {
  await bffFetchJson(`/problem-change/changes/${changeId}/incidents`, {
    method: "POST",
    body: JSON.stringify({ incidentId }),
  });
}

export async function unlinkIncidentFromChange(changeId: string, incidentId: string): Promise<void> {
  await bffFetchJson(`/problem-change/changes/${changeId}/incidents/${incidentId}`, {
    method: "DELETE",
  });
}

export async function linkProblemToChange(changeId: string, problemId: string): Promise<void> {
  await bffFetchJson(`/problem-change/changes/${changeId}/problems`, {
    method: "POST",
    body: JSON.stringify({ problemId }),
  });
}

export async function unlinkProblemFromChange(changeId: string, problemId: string): Promise<void> {
  await bffFetchJson(`/problem-change/changes/${changeId}/problems/${problemId}`, {
    method: "DELETE",
  });
}
