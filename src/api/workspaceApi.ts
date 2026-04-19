import type {
  AcceptInvitationResponse,
  ActivityFilters,
  CommentEntry,
  FileLockEntry,
  InvitationPreviewResponse,
  PendingInvitationSummary,
  RoomActivity,
  RoomFile,
  RoomFileContent,
  RoomMember,
  RoomSearchResults,
  SoloWorkspaceResponse,
  SoloWorkspaceSummary,
  RoomSummary,
  VersionCompareResult,
  VersionDeleteResult,
  VersionEntry,
  VersionMergeResult,
  VersionRevertResult,
} from "@/types/workspace.types";
import { apiBlob, apiJson } from "@/api/axiosClient";

interface WorkspaceRequestPayload {
  roomName?: string;
  roomCode?: string;
  memberEmail?: string;
  invitationToken?: string;
  filePath?: string;
  folderPath?: string;
  newFolderPath?: string;
  language?: string;
  content?: string;
  versionMessage?: string;
  expectedUpdatedAt?: string;
  canEditFiles?: boolean;
  canSaveVersions?: boolean;
  canRevertVersions?: boolean;
  memberRole?: string;
  fileId?: number;
  startLine?: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
  typing?: boolean;
  resolved?: boolean;
}

interface SoloWorkspaceRequestPayload {
  fileName: string;
  content: string;
  versionLabel?: string;
}

async function workspaceRequest<T>(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  payload?: WorkspaceRequestPayload
): Promise<T> {
  return apiJson<T>(path, {
    method,
    body: payload ? JSON.stringify(payload) : undefined,
    auth: true,
  });
}

export function createRoom(roomName: string): Promise<RoomSummary> {
  return workspaceRequest<RoomSummary>("/api/workspaces/rooms", "POST", { roomName });
}

export function joinRoom(roomCode: string): Promise<RoomSummary> {
  return workspaceRequest<RoomSummary>("/api/workspaces/rooms/join", "POST", { roomCode });
}

export function updateRoom(roomId: number, roomName: string): Promise<RoomSummary> {
  return workspaceRequest<RoomSummary>(`/api/workspaces/rooms/${roomId}`, "PUT", { roomName });
}

export function deleteRoom(roomId: number): Promise<{ status: string; roomId: number }> {
  return workspaceRequest<{ status: string; roomId: number }>(`/api/workspaces/rooms/${roomId}`, "DELETE");
}

export function getSoloWorkspaces(): Promise<SoloWorkspaceSummary[]> {
  return workspaceRequest<SoloWorkspaceSummary[]>('/api/workspaces/solo', 'GET');
}

export function getLatestSoloWorkspace(): Promise<SoloWorkspaceResponse> {
  return workspaceRequest<SoloWorkspaceResponse>("/api/workspaces/solo/latest", "GET");
}

export function getSoloWorkspace(soloWorkspaceId: number): Promise<SoloWorkspaceResponse> {
  return workspaceRequest<SoloWorkspaceResponse>(`/api/workspaces/solo/${soloWorkspaceId}`, "GET");
}

export function createSoloWorkspace(payload: SoloWorkspaceRequestPayload): Promise<SoloWorkspaceResponse> {
  return workspaceRequest<SoloWorkspaceResponse>("/api/workspaces/solo", "POST", payload);
}

export function updateSoloWorkspace(soloWorkspaceId: number, payload: SoloWorkspaceRequestPayload): Promise<SoloWorkspaceResponse> {
  return workspaceRequest<SoloWorkspaceResponse>(`/api/workspaces/solo/${soloWorkspaceId}`, "PUT", payload);
}

export function deleteSoloWorkspace(soloWorkspaceId: number): Promise<void> {
  return workspaceRequest<void>(`/api/workspaces/solo/${soloWorkspaceId}`, "DELETE");
}

export function saveSoloVersionSnapshot(
  soloWorkspaceId: number,
  payload: SoloWorkspaceRequestPayload
): Promise<VersionEntry> {
  return workspaceRequest<VersionEntry>(`/api/workspaces/solo/${soloWorkspaceId}/versions`, "POST", payload);
}

export function getSoloFileVersions(soloWorkspaceId: number): Promise<VersionEntry[]> {
  return workspaceRequest<VersionEntry[]>(`/api/workspaces/solo/${soloWorkspaceId}/versions`, "GET");
}

export function getSoloVersionDetail(soloWorkspaceId: number, versionId: number): Promise<VersionEntry> {
  return workspaceRequest<VersionEntry>(`/api/workspaces/solo/${soloWorkspaceId}/versions/${versionId}`, "GET");
}

export function revertSoloVersion(soloWorkspaceId: number, versionId: number): Promise<VersionRevertResult> {
  return workspaceRequest<VersionRevertResult>(`/api/workspaces/solo/${soloWorkspaceId}/versions/${versionId}/revert`, "POST");
}

export function deleteSoloVersion(soloWorkspaceId: number, versionId: number): Promise<VersionDeleteResult> {
  return workspaceRequest<VersionDeleteResult>(`/api/workspaces/solo/${soloWorkspaceId}/versions/${versionId}`, "DELETE");
}

export function getMyRooms(): Promise<RoomSummary[]> {
  return workspaceRequest<RoomSummary[]>("/api/workspaces/rooms", "GET");
}

export function getRoomByCode(roomCode: string): Promise<RoomSummary> {
  return workspaceRequest<RoomSummary>(`/api/workspaces/rooms/by-code/${encodeURIComponent(roomCode)}`, "GET");
}

export function getRoomMembers(roomId: number): Promise<RoomMember[]> {
  return workspaceRequest<RoomMember[]>(`/api/workspaces/rooms/${roomId}/members`, "GET");
}

export function getPendingInvitations(roomId: number): Promise<PendingInvitationSummary[]> {
  return workspaceRequest<PendingInvitationSummary[]>(`/api/workspaces/rooms/${roomId}/invitations`, "GET");
}

export function addRoomMember(roomId: number, memberEmail: string): Promise<{ status: string; memberEmail: string; roomCode: string; roomName: string }> {
  return workspaceRequest<{ status: string; memberEmail: string; roomCode: string; roomName: string }>(
    `/api/workspaces/rooms/${roomId}/members`,
    "POST",
    { memberEmail }
  );
}

export function previewInvitation(token: string): Promise<InvitationPreviewResponse> {
  return apiJson<InvitationPreviewResponse>(`/api/workspaces/invitations/preview?token=${encodeURIComponent(token)}`, {
    method: "GET",
  });
}

export function acceptInvitation(invitationToken: string): Promise<AcceptInvitationResponse> {
  return workspaceRequest<AcceptInvitationResponse>(`/api/workspaces/invitations/accept`, "POST", { invitationToken });
}

export function declineInvitation(invitationToken: string): Promise<PendingInvitationSummary> {
  return workspaceRequest<PendingInvitationSummary>(`/api/workspaces/invitations/decline`, "POST", { invitationToken });
}

export function revokeInvitation(roomId: number, inviteeEmail: string): Promise<PendingInvitationSummary> {
  return workspaceRequest<PendingInvitationSummary>(
    `/api/workspaces/rooms/${roomId}/invitations/${encodeURIComponent(inviteeEmail)}`,
    "DELETE"
  );
}

export function removeRoomMember(roomId: number, memberUserId: number): Promise<{ status: string; memberUserId: number }> {
  return workspaceRequest<{ status: string; memberUserId: number }>(
    `/api/workspaces/rooms/${roomId}/members/${memberUserId}`,
    "DELETE"
  );
}

export function updateRoomMemberPermissions(
  roomId: number,
  memberUserId: number,
  permissions: {
    canEditFiles?: boolean;
    canSaveVersions?: boolean;
    canRevertVersions?: boolean;
    memberRole?: "ADMIN" | "EDITOR" | "REVIEWER" | "VIEWER";
  }
): Promise<RoomMember> {
  return workspaceRequest<RoomMember>(
    `/api/workspaces/rooms/${roomId}/members/${memberUserId}/permissions`,
    "PUT",
    permissions
  );
}

export function getRoomFiles(roomId: number): Promise<RoomFile[]> {
  return workspaceRequest<RoomFile[]>(`/api/workspaces/rooms/${roomId}/files`, "GET");
}

export function getRoomActivity(roomId: number): Promise<RoomActivity[]> {
  return workspaceRequest<RoomActivity[]>(`/api/workspaces/rooms/${roomId}/activity`, "GET");
}

export function getRoomActivityFiltered(roomId: number, filters: ActivityFilters): Promise<RoomActivity[]> {
  const params = new URLSearchParams();
  if (filters.actorEmail) params.set("actorEmail", filters.actorEmail);
  if (filters.type) params.set("type", filters.type);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const suffix = params.toString();
  return workspaceRequest<RoomActivity[]>(`/api/workspaces/rooms/${roomId}/activity${suffix ? `?${suffix}` : ""}`, "GET");
}

export function searchRoom(roomId: number, query: string): Promise<RoomSearchResults> {
  return workspaceRequest<RoomSearchResults>(`/api/workspaces/rooms/${roomId}/search?q=${encodeURIComponent(query)}`, "GET");
}

export function getRoomFile(roomId: number, fileId: number): Promise<RoomFileContent> {
  return workspaceRequest<RoomFileContent>(`/api/workspaces/rooms/${roomId}/files/${fileId}`, "GET");
}

export function createRoomFile(roomId: number, filePath: string, content = ""): Promise<RoomFileContent> {
  return workspaceRequest<RoomFileContent>(`/api/workspaces/rooms/${roomId}/files`, "POST", { filePath, content, language: "java" });
}

export function saveRoomFile(
  roomId: number,
  fileId: number,
  content: string,
  expectedUpdatedAt: string,
  filePath?: string
): Promise<RoomFileContent> {
  return workspaceRequest<RoomFileContent>(`/api/workspaces/rooms/${roomId}/files/${fileId}`, "PUT", {
    content,
    filePath,
    language: "java",
    expectedUpdatedAt,
  });
}

export function deleteRoomFile(roomId: number, fileId: number): Promise<{ status: string; fileId: number }> {
  return workspaceRequest<{ status: string; fileId: number }>(`/api/workspaces/rooms/${roomId}/files/${fileId}`, "DELETE");
}

export function listFolders(roomId: number): Promise<Array<{ path: string }>> {
  return workspaceRequest<Array<{ path: string }>>(`/api/workspaces/rooms/${roomId}/folders`, "GET");
}

export function createFolder(roomId: number, folderPath: string): Promise<{ status: string; path: string }> {
  return workspaceRequest<{ status: string; path: string }>(`/api/workspaces/rooms/${roomId}/folders`, "POST", { folderPath });
}

export function renameFolder(roomId: number, folderPath: string, newFolderPath: string): Promise<{ status: string; updated: number }> {
  return workspaceRequest<{ status: string; updated: number }>(`/api/workspaces/rooms/${roomId}/folders`, "PUT", { folderPath, newFolderPath });
}

export function deleteFolder(roomId: number, folderPath: string): Promise<{ status: string; deleted: number }> {
  return workspaceRequest<{ status: string; deleted: number }>(
    `/api/workspaces/rooms/${roomId}/folders?folderPath=${encodeURIComponent(folderPath)}`,
    "DELETE"
  );
}

export async function uploadRoomJavaFile(roomId: number, file: File): Promise<RoomFileContent> {
  const formData = new FormData();
  formData.append("file", file);

  return apiJson<RoomFileContent>(`/api/workspaces/rooms/${roomId}/files/upload`, {
    method: "POST",
    body: formData,
    auth: true,
  });
}

export async function downloadRoomFile(roomId: number, fileId: number): Promise<{ blob: Blob; fileName: string }> {
  const { blob, response } = await apiBlob(`/api/workspaces/rooms/${roomId}/files/${fileId}/download`, {
    method: "GET",
    auth: true,
  });

  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
  const fileName = match?.[1] || "code.java";

  return { blob, fileName };
}

export function saveVersionSnapshot(
  roomId: number,
  fileId: number,
  content: string,
  versionMessage?: string
): Promise<VersionEntry> {
  return workspaceRequest<VersionEntry>(`/api/workspaces/rooms/${roomId}/files/${fileId}/versions`, "POST", {
    content,
    versionMessage,
  });
}

export function getFileVersions(roomId: number, fileId: number): Promise<VersionEntry[]> {
  return workspaceRequest<VersionEntry[]>(`/api/workspaces/rooms/${roomId}/files/${fileId}/versions`, "GET");
}

export function revertFileVersion(roomId: number, fileId: number, versionId: number): Promise<VersionRevertResult> {
  return workspaceRequest<VersionRevertResult>(
    `/api/workspaces/rooms/${roomId}/files/${fileId}/versions/${versionId}/revert`,
    "POST"
  );
}

export function deleteFileVersion(roomId: number, fileId: number, versionId: number): Promise<VersionDeleteResult> {
  return workspaceRequest<VersionDeleteResult>(
    `/api/workspaces/rooms/${roomId}/files/${fileId}/versions/${versionId}`,
    "DELETE"
  );
}

export function mergeFileVersion(
  roomId: number,
  fileId: number,
  versionId: number,
  payload?: { content?: string; versionMessage?: string }
): Promise<VersionMergeResult> {
  return workspaceRequest<VersionMergeResult>(
    `/api/workspaces/rooms/${roomId}/files/${fileId}/versions/${versionId}/merge`,
    "POST",
    payload
  );
}

export function getVersionDetail(roomId: number, fileId: number, versionId: number): Promise<VersionEntry> {
  return workspaceRequest<VersionEntry>(`/api/workspaces/rooms/${roomId}/files/${fileId}/versions/${versionId}`, "GET");
}

export function compareVersions(roomId: number, fileId: number, fromVersionId: number, toVersionId: number): Promise<VersionCompareResult> {
  return workspaceRequest<VersionCompareResult>(
    `/api/workspaces/rooms/${roomId}/files/${fileId}/versions/compare?fromVersionId=${fromVersionId}&toVersionId=${toVersionId}`,
    "GET"
  );
}

export function listFileLocks(roomId: number): Promise<FileLockEntry[]> {
  return workspaceRequest<FileLockEntry[]>(`/api/workspaces/rooms/${roomId}/locks`, "GET");
}

export function acquireFileLock(roomId: number, fileId: number): Promise<FileLockEntry> {
  return workspaceRequest<FileLockEntry>(`/api/workspaces/rooms/${roomId}/files/${fileId}/lock`, "POST");
}

export function releaseFileLock(roomId: number, fileId: number): Promise<{ fileId: number; released: boolean }> {
  return workspaceRequest<{ fileId: number; released: boolean }>(`/api/workspaces/rooms/${roomId}/files/${fileId}/lock`, "DELETE");
}

export function getFileComments(roomId: number, fileId: number): Promise<CommentEntry[]> {
  return workspaceRequest<CommentEntry[]>(`/api/workspaces/rooms/${roomId}/files/${fileId}/comments`, "GET");
}

export function addFileComment(
  roomId: number,
  fileId: number,
  payload: { content: string; startLine?: number; startColumn?: number; endLine?: number; endColumn?: number }
): Promise<CommentEntry> {
  return workspaceRequest<CommentEntry>(`/api/workspaces/rooms/${roomId}/files/${fileId}/comments`, "POST", payload);
}

export function replyToComment(roomId: number, commentId: number, content: string): Promise<CommentEntry> {
  return workspaceRequest<CommentEntry>(`/api/workspaces/rooms/${roomId}/comments/${commentId}/reply`, "POST", { content });
}

export function resolveComment(roomId: number, commentId: number, resolved = true): Promise<CommentEntry> {
  return workspaceRequest<CommentEntry>(`/api/workspaces/rooms/${roomId}/comments/${commentId}/resolve`, "PUT", { resolved });
}

export function publishRoomPresence(
  roomId: number,
  payload: {
    fileId: number;
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
    typing?: boolean;
  }
): Promise<{ status: string }> {
  return workspaceRequest<{ status: string }>(`/api/workspaces/rooms/${roomId}/presence`, "POST", payload);
}
