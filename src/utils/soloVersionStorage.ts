import type { VersionCompareResult, VersionEntry } from "@/types/workspace.types";

interface StoredSoloVersion {
  id: number;
  versionNumber: number;
  createdAt: string;
  authorName: string | null;
  authorEmail: string | null;
  fileId: number;
  filePath: string;
  content: string;
  contentPreview: string;
}

const STORAGE_PREFIX = "java-workspace:solo-versions";

function storageKey(userEmail: string, fileId: number): string {
  return `${STORAGE_PREFIX}:${userEmail.trim().toLowerCase()}:${fileId}`;
}

function readStoredVersions(key: string): StoredSoloVersion[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as StoredSoloVersion[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry) => entry && typeof entry.id === "number" && typeof entry.versionNumber === "number")
      .map((entry) => ({
        id: entry.id,
        versionNumber: entry.versionNumber,
        createdAt: typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString(),
        authorName: typeof entry.authorName === "string" ? entry.authorName : null,
        authorEmail: typeof entry.authorEmail === "string" ? entry.authorEmail : null,
        fileId: typeof entry.fileId === "number" ? entry.fileId : 0,
        filePath: typeof entry.filePath === "string" ? entry.filePath : "Untitled.java",
        content: typeof entry.content === "string" ? entry.content : "",
        contentPreview: typeof entry.contentPreview === "string" ? entry.contentPreview : "",
      }));
  } catch {
    return [];
  }
}

function writeStoredVersions(key: string, versions: StoredSoloVersion[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(versions.slice(0, 5)));
  } catch {
    // Ignore storage failures.
  }
}

function buildPreview(content: string): string {
  const normalized = content.replace(/\r/g, "").replace(/\n/g, " ").trim();
  if (!normalized) {
    return "(empty snapshot)";
  }
  return normalized.length <= 100 ? normalized : `${normalized.slice(0, 100)}...`;
}

export function listSoloVersions(userEmail: string, fileId: number): VersionEntry[] {
  const key = storageKey(userEmail, fileId);
  return readStoredVersions(key).map((entry) => ({
    id: entry.id,
    versionNumber: entry.versionNumber,
    createdAt: entry.createdAt,
    authorName: entry.authorName,
    authorEmail: entry.authorEmail,
    fileId: entry.fileId,
    contentPreview: entry.contentPreview,
    filePath: entry.filePath,
    content: entry.content,
  }));
}

export function addSoloVersionSnapshot(params: {
  userEmail: string;
  fileId: number;
  filePath: string;
  content: string;
  authorName?: string | null;
  authorEmail?: string | null;
}): VersionEntry[] {
  const key = storageKey(params.userEmail, params.fileId);
  const versions = readStoredVersions(key);
  const nextVersionNumber = versions.length > 0 ? versions[0].versionNumber + 1 : 1;
  const snapshot: StoredSoloVersion = {
    id: Date.now(),
    versionNumber: nextVersionNumber,
    createdAt: new Date().toISOString(),
    authorName: params.authorName ?? null,
    authorEmail: params.authorEmail ?? null,
    fileId: params.fileId,
    filePath: params.filePath,
    content: params.content,
    contentPreview: buildPreview(params.content),
  };

  const nextVersions = [snapshot, ...versions].slice(0, 5);
  writeStoredVersions(key, nextVersions);
  return nextVersions.map((entry) => ({
    id: entry.id,
    versionNumber: entry.versionNumber,
    createdAt: entry.createdAt,
    authorName: entry.authorName,
    authorEmail: entry.authorEmail,
    fileId: entry.fileId,
    contentPreview: entry.contentPreview,
    filePath: entry.filePath,
    content: entry.content,
  }));
}

export function deleteSoloVersionSnapshot(userEmail: string, fileId: number, versionId: number): VersionEntry[] {
  const key = storageKey(userEmail, fileId);
  const nextVersions = readStoredVersions(key).filter((entry) => entry.id !== versionId);
  writeStoredVersions(key, nextVersions);
  return nextVersions.map((entry) => ({
    id: entry.id,
    versionNumber: entry.versionNumber,
    createdAt: entry.createdAt,
    authorName: entry.authorName,
    authorEmail: entry.authorEmail,
    fileId: entry.fileId,
    contentPreview: entry.contentPreview,
    filePath: entry.filePath,
    content: entry.content,
  }));
}

export function getSoloVersionSnapshot(userEmail: string, fileId: number, versionId: number): VersionEntry | null {
  const key = storageKey(userEmail, fileId);
  const version = readStoredVersions(key).find((entry) => entry.id === versionId);
  if (!version) {
    return null;
  }
  return {
    id: version.id,
    versionNumber: version.versionNumber,
    createdAt: version.createdAt,
    authorName: version.authorName,
    authorEmail: version.authorEmail,
    fileId: version.fileId,
    filePath: version.filePath,
    contentPreview: version.contentPreview,
    content: version.content,
  };
}

export function compareSoloVersions(currentContent: string, snapshot: VersionEntry): VersionCompareResult {
  return {
    fileId: snapshot.fileId,
    filePath: snapshot.filePath || "Untitled.java",
    fromVersionId: snapshot.id,
    toVersionId: snapshot.id,
    fromLabel: `v${snapshot.versionNumber}`,
    toLabel: "current",
    fromContent: snapshot.content || "",
    toContent: currentContent,
  };
}

export function clearSoloVersionSnapshots(userEmail: string, fileId: number): void {
  try {
    window.localStorage.removeItem(storageKey(userEmail, fileId));
  } catch {
    // Ignore storage failures.
  }
}
