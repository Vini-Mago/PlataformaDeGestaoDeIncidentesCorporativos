import { ApiError } from "../auth";

type ApiErrorBody = {
  error?: string;
  message?: string;
};

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

/**
 * Chamadas ao BFF (mesma origem em dev via proxy Vite): envia cookies httpOnly do access token.
 */
export async function bffFetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
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
