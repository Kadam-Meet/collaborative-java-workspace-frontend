export interface RoomSummary {
  id: number;
  roomCode: string;
  roomName: string;
  createdAt: string;
  ownerEmail: string;
  memberCount: number;
  fileCount: number;
}

export interface SoloWorkspaceSummary {
  id: number;
  fileName: string;
  contentPreview: string;
  createdAt: string;
  updatedAt: string;
}

export interface SoloWorkspaceResponse extends SoloWorkspaceSummary {
  content: string;
}

export interface RoomMember {
  id: number;
  name: string;
  email: string;
  joinedAt: string;
  owner: boolean;
  canEditFiles: boolean;
  canSaveVersions: boolean;
  canRevertVersions: boolean;
  memberRole?: "OWNER" | "ADMIN" | "EDITOR" | "REVIEWER" | "VIEWER";
}

export interface RoomFile {
  id: number;
  filePath: string;
  language: string;
  updatedAt: string;
  updatedByEmail: string | null;
}

export interface RoomFileContent extends RoomFile {
  content: string;
}

export interface VersionEntry {
  id: number;
  versionNumber: number;
  createdAt: string;
  authorName: string | null;
  authorEmail: string | null;
  fileId: number;
  contentPreview: string;
  message?: string;
  filePath?: string | null;
  content?: string;
}

export interface VersionRevertResult {
  fileId: number;
  filePath: string;
  content: string;
  revertedFromVersion: number;
  newVersion: number;
  updatedAt: string;
  updatedByEmail: string | null;
}

export interface VersionDeleteResult {
  deleted: boolean;
  fileId: number;
  versionId: number;
  versionNumber: number;
}

export interface VersionCompareResult {
  fileId: number;
  filePath: string;
  fromVersionId: number;
  toVersionId: number;
  fromLabel: string;
  toLabel: string;
  fromContent: string;
  toContent: string;
}

export interface DashboardTotals {
  rooms: number;
  files: number;
  versions: number;
  analyses: number;
}

export interface DashboardPerformance {
  averageScore: number;
  bestScore: number;
  latestRiskLevel: string;
}

export interface DashboardActivity {
  type: "VERSION_SAVED" | "ANALYSIS_RUN" | "ROOM_JOINED";
  title: string;
  description: string;
  createdAt: string;
}

export interface RoomActivity {
  id: number;
  type: string;
  title: string;
  description: string;
  createdAt: string;
  roomId: number;
  roomName: string;
  actorName?: string | null;
  actorEmail?: string | null;
}

export interface ActivityFilters {
  actorEmail?: string;
  type?: string;
  from?: string;
  to?: string;
}

export interface FileLockEntry {
  fileId: number;
  lockedByEmail: string;
  lockedByName: string;
  lockedAt: string;
}

export interface CommentEntry {
  id: number;
  roomId: number;
  fileId: number;
  parentId?: number | null;
  content: string;
  startLine?: number | null;
  startColumn?: number | null;
  endLine?: number | null;
  endColumn?: number | null;
  resolved: boolean;
  resolvedByEmail?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  authorEmail?: string | null;
  authorName?: string | null;
}

export interface RoomSearchResults {
  query: string;
  files: RoomFile[];
  versions: VersionEntry[];
  activity: RoomActivity[];
}

export interface DashboardSummary {
  totals: DashboardTotals;
  performance: DashboardPerformance;
  rooms: RoomSummary[];
  recentActivity: DashboardActivity[];
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  readAt?: string | null;
  read: boolean;
  roomId?: number | null;
  roomCode?: string | null;
  roomName?: string | null;
  recipientEmail?: string | null;
  actionType?: string | null;
  actionToken?: string | null;
}

export interface NotificationListResponse {
  unreadCount: number;
  notifications: NotificationItem[];
}

export interface InvitationPreviewResponse {
  valid: boolean;
  expired: boolean;
  accepted: boolean;
  inviteeEmail: string;
  inviterEmail?: string | null;
  roomCode: string;
  roomName: string;
  inviterName?: string | null;
  requiresSignup: boolean;
  expiresAt: string;
}

export interface AcceptInvitationResponse {
  status: string;
  roomCode: string;
  roomName: string;
  roomId: number;
  inviteeEmail?: string | null;
  inviterEmail?: string | null;
}

export interface PendingInvitationSummary {
  id: number;
  status: string;
  roomId: number | null;
  roomCode: string | null;
  roomName: string | null;
  inviteeEmail: string;
  inviterEmail: string | null;
  acceptedByEmail: string | null;
  createdAt: string;
  expiresAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  revokedAt: string | null;
}
