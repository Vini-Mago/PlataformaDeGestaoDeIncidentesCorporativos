export type AuthUser = {
  id: string;
  email: string;
  login?: string;
  name: string;
  role?: string;
  status?: "active" | "inactive";
  createdAt?: string;
};

type ApiErrorBody = {
  error?: string;
  message?: string;
};

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await parseJson<ApiErrorBody>(response).catch(() => null);
    const message = body?.message ?? body?.error ?? `Request failed (${response.status})`;
    throw new ApiError(response.status, message);
  }

  return parseJson<T>(response);
}

async function requestVoid(input: string, init?: RequestInit): Promise<void> {
  await request<Record<string, never>>(input, init);
}

export async function getMe(): Promise<AuthUser> {
  return request<AuthUser>("/auth/me", {
    method: "GET",
  });
}

export async function logout(): Promise<void> {
  await requestVoid("/auth/logout", {
    method: "POST",
  });
}
