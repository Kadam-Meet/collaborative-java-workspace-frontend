export interface RoomSummary {
  id: number;
  roomCode: string;
  roomName: string;
  createdAt: string;
  ownerEmail: string;
  memberCount: number;
  fileCount: number;
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
}
