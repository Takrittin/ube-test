import type { PendingInspection } from "./types";

const PENDING_KEY = "ube-pending-inspection";

export function savePendingInspection(value: PendingInspection): void {
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(value));
}

export function getPendingInspection(): PendingInspection | null {
  const raw = sessionStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingInspection;
  } catch {
    sessionStorage.removeItem(PENDING_KEY);
    return null;
  }
}

export function clearPendingInspection(): void {
  sessionStorage.removeItem(PENDING_KEY);
}

