const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

export function assetUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${path}`, init);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const detail = body?.detail;
      const message =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail[0]?.msg
            : "Something went wrong. Please try again.";
      throw new Error(message || "Something went wrong. Please try again.");
    }
    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        "Cannot connect to the inspection service. Check that the backend is running on port 8000.",
      );
    }
    throw error;
  }
}

