import { useEffect, useState } from "react";

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutoSaveOptions {
  enabled: boolean;
  value: string;
  hasChanges: boolean;
  delayMs?: number;
  onSave: () => Promise<void>;
  onError?: (error: unknown) => void;
}

interface UseAutoSaveResult {
  status: AutoSaveStatus;
  lastSavedAt: Date | null;
}

export function useAutoSave({
  enabled,
  value,
  hasChanges,
  delayMs = 1200,
  onSave,
  onError,
}: UseAutoSaveOptions): UseAutoSaveResult {
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!enabled || !hasChanges) {
      if (status === "saving") {
        setStatus("idle");
      }
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setStatus("saving");
        await onSave();
        setLastSavedAt(new Date());
        setStatus("saved");
      } catch (error) {
        setStatus("error");
        onError?.(error);
      }
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [enabled, hasChanges, value, delayMs, onSave, onError]);

  return { status, lastSavedAt };
}
