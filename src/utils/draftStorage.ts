export interface DraftSnapshot {
  content: string;
  fileName: string;
  savedAt: string;
  serverUpdatedAt?: string | null;
}

export function buildDraftStorageKey(params: {
  userEmail: string;
  roomId?: number | null;
  fileId?: number | null;
  fileName: string;
  isStandalone: boolean;
}): string {
  const normalizedEmail = params.userEmail.trim().toLowerCase();
  const scope = params.isStandalone
    ? "standalone"
    : `room-${params.roomId ?? "unknown"}-file-${params.fileId ?? "none"}`;
  return `java-workspace:draft:${normalizedEmail}:${scope}:${params.fileName}`;
}

export function saveDraftSnapshot(key: string, snapshot: DraftSnapshot): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    // Ignore storage failures to avoid interrupting editor usage.
  }
}

export function loadDraftSnapshot(key: string): DraftSnapshot | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as DraftSnapshot;
    if (!parsed || typeof parsed.content !== "string" || typeof parsed.savedAt !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraftSnapshot(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

export function renameDraftSnapshot(
  oldKey: string,
  newKey: string,
  nextFileName: string,
  nextSavedAt = new Date().toISOString()
): void {
  try {
    const raw = window.localStorage.getItem(oldKey);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as DraftSnapshot;
    const nextSnapshot: DraftSnapshot = {
      ...parsed,
      fileName: nextFileName,
      savedAt: nextSavedAt,
    };

    window.localStorage.setItem(newKey, JSON.stringify(nextSnapshot));
    window.localStorage.removeItem(oldKey);
  } catch {
    // Ignore storage failures.
  }
}

export function isDraftNewerThanServer(draft: DraftSnapshot, serverUpdatedAt?: string | null): boolean {
  const draftTime = Date.parse(draft.savedAt);
  if (Number.isNaN(draftTime)) {
    return false;
  }

  if (!serverUpdatedAt) {
    return true;
  }

  const serverTime = Date.parse(serverUpdatedAt);
  if (Number.isNaN(serverTime)) {
    return true;
  }

  return draftTime > serverTime;
}
