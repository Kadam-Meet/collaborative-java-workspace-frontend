import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import EditorPanel from "@/components/workspace/EditorPanel";
import AnalysisPanel from "@/components/workspace/AnalysisPanel";
import IssuesPanel from "@/components/workspace/IssuesPanel";
import LearningPanel from "@/components/workspace/LearningPanel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Upload, Zap, Hash, Users } from "lucide-react";
import { toast } from "sonner";
import { analyzeJavaWorkspace } from "@/api/analysisApi";
import type { WorkspaceAnalysis, WorkspaceIssue } from "@/api/analysisApi";
import { getUserFriendlyErrorMessage } from "@/hooks/useToast";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useSocket } from "@/hooks/useSocket";
import {
  acquireFileLock,
  addRoomMember,
  addFileComment,
  compareVersions,
  createRoomFile,
  deleteFileVersion,
  downloadRoomFile,
  getFileComments,
  getFileVersions,
  getPendingInvitations,
  getRoomActivityFiltered,
  getRoomByCode,
  getRoomActivity,
  getRoomFile,
  getRoomFiles,
  getVersionDetail,
  getRoomMembers,
  joinRoom,
  listFileLocks,
  replyToComment,
  revertFileVersion,
  resolveComment,
  publishRoomPresence,
  releaseFileLock,
  revokeInvitation,
  saveRoomFile,
  saveVersionSnapshot,
  searchRoom,
  updateRoomMemberPermissions,
  uploadRoomJavaFile,
} from "@/api/workspaceApi";
import type { ActivityFilters, CommentEntry, FileLockEntry, PendingInvitationSummary, RoomActivity, RoomFile, RoomMember, RoomSearchResults, RoomSummary, VersionCompareResult, VersionEntry } from "@/types/workspace.types";
import { useAuth } from "@/hooks/useAuth";
import { buildDraftStorageKey, clearDraftSnapshot, isDraftNewerThanServer, loadDraftSnapshot, saveDraftSnapshot } from "@/utils/draftStorage";
import type { RoomRealtimeEvent } from "@/services/socketService";

type RemoteSelectionState = {
  userLabel: string;
  fileId: number;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  typing: boolean;
  updatedAt: number;
};

const EMPTY_JAVA_CODE = "";
const EMPTY_ANALYSIS: WorkspaceAnalysis = {
  cyclomaticComplexity: 0,
  maxComplexity: 1,
  timeComplexity: "N/A",
  performanceScore: 0,
  riskLevel: "Low",
  linesOfCode: 0,
  methodCount: 0,
};

const Workspace = () => {
  const { user, token, loading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { roomId } = useParams();
  const isStandalone = !roomId;
  const [code, setCode] = useState(EMPTY_JAVA_CODE);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<WorkspaceAnalysis>(EMPTY_ANALYSIS);
  const [issues, setIssues] = useState<WorkspaceIssue[]>([]);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitationSummary[]>([]);
  const [roomFiles, setRoomFiles] = useState<RoomFile[]>([]);
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [roomActivity, setRoomActivity] = useState<RoomActivity[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [activeFileId, setActiveFileId] = useState<number | null>(null);
  const [activeFileUpdatedAt, setActiveFileUpdatedAt] = useState<string | null>(null);
  const [activeFileName, setActiveFileName] = useState("Untitled.java");
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [localDraftSavedAt, setLocalDraftSavedAt] = useState<Date | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastSyncedCodeRef = useRef(code);
  const codeRef = useRef(code);
  const analysisRequestSeq = useRef(0);
  const typingResetTimerRef = useRef<number | null>(null);
  const lastSelectionRef = useRef({
    startLine: 1,
    startColumn: 1,
    endLine: 1,
    endColumn: 1,
  });
  const [remoteSelections, setRemoteSelections] = useState<Record<string, RemoteSelectionState>>({});
  const [fileLocks, setFileLocks] = useState<Record<number, { lockedByEmail: string; lockedByName: string }>>({});
  const [comments, setComments] = useState<CommentEntry[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentReplyDraft, setCommentReplyDraft] = useState<Record<number, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RoomSearchResults | null>(null);
  const [versionComparison, setVersionComparison] = useState<VersionCompareResult | null>(null);
  const [activityFilters, setActivityFilters] = useState<ActivityFilters>({});

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const resolveDraftContent = useCallback((params: {
    content: string;
    fileName: string;
    serverUpdatedAt?: string | null;
    roomNumericId?: number | null;
    fileNumericId?: number | null;
    standalone: boolean;
  }) => {
    const storageKey = buildDraftStorageKey({
      userEmail: user.email,
      roomId: params.roomNumericId ?? null,
      fileId: params.fileNumericId ?? null,
      fileName: params.fileName,
      isStandalone: params.standalone,
    });

    const draft = loadDraftSnapshot(storageKey);
    if (!draft) {
      return { content: params.content, restored: false };
    }

    const shouldOfferRecovery =
      draft.content !== params.content &&
      isDraftNewerThanServer(draft, params.serverUpdatedAt ?? null);

    if (!shouldOfferRecovery) {
      return { content: params.content, restored: false };
    }

    const confirmed = window.confirm(
      `Recover unsaved local draft for ${params.fileName}?\nDraft saved at ${new Date(draft.savedAt).toLocaleString()}`
    );

    if (!confirmed) {
      clearDraftSnapshot(storageKey);
      return { content: params.content, restored: false };
    }

    toast.info(`Recovered local draft for ${params.fileName}`);
    return { content: draft.content, restored: true };
  }, [user.email]);

  const loadRoomContext = async (codeValue: string) => {
    setLoadingRoom(true);
    try {
      const roomDetails = await getRoomByCode(codeValue);
      const [members, files, pending, locks] = await Promise.all([
        getRoomMembers(roomDetails.id),
        getRoomFiles(roomDetails.id),
        getPendingInvitations(roomDetails.id),
        listFileLocks(roomDetails.id),
      ]);
      setRoom(roomDetails);
      setRoomMembers(members);
      setPendingInvitations(pending);
      setRoomFiles(files);
      setFileLocks(
        Object.fromEntries(
          locks.map((lock: FileLockEntry) => [lock.fileId, { lockedByEmail: lock.lockedByEmail, lockedByName: lock.lockedByName }])
        )
      );
      const activity = await getRoomActivity(roomDetails.id);
      setRoomActivity(activity);

      if (files.length > 0) {
        const firstFile = await getRoomFile(roomDetails.id, files[0].id);
        const history = await getFileVersions(roomDetails.id, files[0].id);
        const resolved = resolveDraftContent({
          content: firstFile.content || "",
          fileName: firstFile.filePath,
          serverUpdatedAt: firstFile.updatedAt,
          roomNumericId: roomDetails.id,
          fileNumericId: firstFile.id,
          standalone: false,
        });
        setActiveFileId(firstFile.id);
        setActiveFileUpdatedAt(firstFile.updatedAt);
        setActiveFileName(firstFile.filePath);
        setCode(resolved.content);
        lastSyncedCodeRef.current = firstFile.content || "";
        setVersions(history);
      } else {
        setActiveFileId(null);
        setActiveFileUpdatedAt(null);
        setActiveFileName("Untitled.java");
        setCode(EMPTY_JAVA_CODE);
        lastSyncedCodeRef.current = EMPTY_JAVA_CODE;
        setVersions([]);
      }
    } catch (error) {
      toast.error(getUserFriendlyErrorMessage(error, "Unable to load room"));
      navigate("/dashboard");
    } finally {
      setLoadingRoom(false);
    }
  };

  useEffect(() => {
    if (authLoading || !isAuthenticated || !token) {
      return;
    }

    if (!roomId) {
      const restored = resolveDraftContent({
        content: EMPTY_JAVA_CODE,
        fileName: "Untitled.java",
        standalone: true,
      });
      setLoadingRoom(false);
      setRoom(null);
      setRoomMembers([]);
      setPendingInvitations([]);
      setRoomFiles([]);
      setVersions([]);
      setRoomActivity([]);
      setRemoteSelections({});
      setFileLocks({});
      setComments([]);
      setSearchResults(null);
      setActiveFileId(null);
      setActiveFileUpdatedAt(null);
      setActiveFileName("Untitled.java");
      setCode(restored.content);
      lastSyncedCodeRef.current = restored.content;
      return;
    }
    void loadRoomContext(roomId);
  }, [authLoading, isAuthenticated, token, roomId, resolveDraftContent]);

  const handleAnalyze = async () => {
    if (!code.trim()) {
      toast.info("Add Java code first to run analysis");
      return;
    }

    const requestId = ++analysisRequestSeq.current;
    setAnalyzing(true);
    toast.info("Queued backend analysis...");

    try {
      const result = await analyzeJavaWorkspace(code, roomId || `solo-${user.email}`, true);
      if (requestId !== analysisRequestSeq.current) {
        return;
      }
      setAnalysis(result.analysis);
      setIssues(result.issues);
      setBackendAvailable(true);
      toast.success("Analysis complete! Live backend results loaded.");
    } catch (error) {
      if (requestId !== analysisRequestSeq.current) {
        return;
      }
      setBackendAvailable(false);
      toast.error(getUserFriendlyErrorMessage(error, "Unable to reach backend service."));
    } finally {
      if (requestId === analysisRequestSeq.current) {
        setAnalyzing(false);
      }
    }
  };

  useEffect(() => {
    if (authLoading || !isAuthenticated || !token) {
      return;
    }

    if (!code.trim()) {
      setAnalysis(EMPTY_ANALYSIS);
      setIssues([]);
      setBackendAvailable(true);
      return;
    }

    const requestId = ++analysisRequestSeq.current;
    const timeoutId = window.setTimeout(async () => {
      try {
        const result = await analyzeJavaWorkspace(code, roomId || `solo-${user.email}`, false);
        if (requestId !== analysisRequestSeq.current) {
          return;
        }
        setAnalysis(result.analysis);
        setIssues(result.issues);
        setBackendAvailable(true);
      } catch {
        if (requestId !== analysisRequestSeq.current) {
          return;
        }
        setBackendAvailable(false);
      }
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [authLoading, isAuthenticated, token, code, roomId, user.email]);

  const handleDownload = () => {
    const triggerDownload = (blob: Blob, fileName: string) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    };

    if (!isStandalone && room && activeFileId) {
      void (async () => {
        try {
          const { blob, fileName } = await downloadRoomFile(room.id, activeFileId);
          triggerDownload(blob, fileName);
          toast.success("File downloaded!");
        } catch (error) {
          toast.error(getUserFriendlyErrorMessage(error, "Download failed"));
        }
      })();
      return;
    }

    triggerDownload(new Blob([code], { type: "text/x-java-source" }), activeFileName || "Untitled.java");
    toast.success("File downloaded!");
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    if (!isStandalone && room) {
      void (async () => {
        try {
          const uploaded = await uploadRoomJavaFile(room.id, file);
          const files = await getRoomFiles(room.id);
          setRoomFiles(files);
          setActiveFileId(uploaded.id);
          setActiveFileUpdatedAt(uploaded.updatedAt);
          setActiveFileName(uploaded.filePath);
          const resolved = resolveDraftContent({
            content: uploaded.content || "",
            fileName: uploaded.filePath,
            serverUpdatedAt: uploaded.updatedAt,
            roomNumericId: room.id,
            fileNumericId: uploaded.id,
            standalone: false,
          });
          setCode(resolved.content);
          lastSyncedCodeRef.current = uploaded.content || "";
          const history = await getFileVersions(room.id, uploaded.id);
          setVersions(history);
          const activity = await getRoomActivity(room.id);
          setRoomActivity(activity);
          toast.success(`Uploaded ${uploaded.filePath}`);
        } catch (error) {
          toast.error(getUserFriendlyErrorMessage(error, "Upload failed"));
        } finally {
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      })();
      return;
    }

    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCode(ev.target?.result as string);
        setActiveFileName(file.name || "Untitled.java");
        toast.success(`Loaded ${file.name}`);
      };
      reader.readAsText(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSaveVersion = async () => {
    if (!isStandalone && room && activeFileId) {
      try {
        await saveVersionSnapshot(room.id, activeFileId, code);
        const files = await getRoomFiles(room.id);
        const history = await getFileVersions(room.id, activeFileId);
        setRoomFiles(files);
        setVersions(history);
        const activity = await getRoomActivity(room.id);
        setRoomActivity(activity);
        toast.success("Version saved");
        return;
      } catch (error) {
        toast.error(getUserFriendlyErrorMessage(error, "Unable to save version"));
        return;
      }
    }

    toast.success("Version saved!");
  };

  const handleSelectFile = async (fileId: number) => {
    if (!room) {
      return;
    }

    try {
      if (activeFileId && activeFileId !== fileId) {
        await releaseFileLock(room.id, activeFileId).catch(() => undefined);
      }
      const file = await getRoomFile(room.id, fileId);
      setLoadingVersions(true);
      const [history, fileComments] = await Promise.all([
        getFileVersions(room.id, fileId),
        getFileComments(room.id, fileId),
      ]);
      const resolved = resolveDraftContent({
        content: file.content || "",
        fileName: file.filePath,
        serverUpdatedAt: file.updatedAt,
        roomNumericId: room.id,
        fileNumericId: file.id,
        standalone: false,
      });
      setActiveFileId(file.id);
      setActiveFileUpdatedAt(file.updatedAt);
      setActiveFileName(file.filePath);
      setCode(resolved.content);
      lastSyncedCodeRef.current = file.content || "";
      setVersions(history);
      setComments(fileComments);
      await acquireFileLock(room.id, file.id).catch(() => undefined);
      const refreshedLocks = await listFileLocks(room.id);
      setFileLocks(
        Object.fromEntries(
          refreshedLocks.map((lock: FileLockEntry) => [lock.fileId, { lockedByEmail: lock.lockedByEmail, lockedByName: lock.lockedByName }])
        )
      );
      publishRoomPresence(room.id, {
        fileId: file.id,
        startLine: lastSelectionRef.current.startLine,
        startColumn: lastSelectionRef.current.startColumn,
        endLine: lastSelectionRef.current.endLine,
        endColumn: lastSelectionRef.current.endColumn,
        typing: false,
      }).catch(() => {
        // Ignore transient realtime presence publish failures.
      });
    } catch (error) {
      toast.error(getUserFriendlyErrorMessage(error, "Unable to open file"));
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleCreateFile = async (filePath: string) => {
    if (isStandalone || !room) {
      toast.info("Create file is available inside a room");
      return;
    }

    try {
      const created = await createRoomFile(room.id, filePath, "");
      const files = await getRoomFiles(room.id);
      setRoomFiles(files);
      const pending = await getPendingInvitations(room.id);
      setPendingInvitations(pending);
      setActiveFileId(created.id);
      setActiveFileUpdatedAt(created.updatedAt);
      setActiveFileName(created.filePath);
      const resolved = resolveDraftContent({
        content: created.content || "",
        fileName: created.filePath,
        serverUpdatedAt: created.updatedAt,
        roomNumericId: room.id,
        fileNumericId: created.id,
        standalone: false,
      });
      setCode(resolved.content);
      lastSyncedCodeRef.current = created.content || "";
      setVersions([]);
      setComments([]);
      await acquireFileLock(room.id, created.id).catch(() => undefined);
      const refreshedLocks = await listFileLocks(room.id);
      setFileLocks(
        Object.fromEntries(
          refreshedLocks.map((lock: FileLockEntry) => [lock.fileId, { lockedByEmail: lock.lockedByEmail, lockedByName: lock.lockedByName }])
        )
      );
      publishRoomPresence(room.id, {
        fileId: created.id,
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 1,
        typing: false,
      }).catch(() => {
        // Ignore transient realtime presence publish failures.
      });
      const activity = await getRoomActivity(room.id);
      setRoomActivity(activity);
      toast.success(`Created ${created.filePath}`);
    } catch (error) {
      toast.error(getUserFriendlyErrorMessage(error, "Unable to create file"));
    }
  };

  const handleJoinRoom = async (roomCode: string) => {
    try {
      const joined = await joinRoom(roomCode);
      toast.success(`Joined room ${joined.roomCode}`);
      navigate(`/workspace/${joined.roomCode}`);
    } catch (error) {
      toast.error(getUserFriendlyErrorMessage(error, "Unable to join room"));
    }
  };

  const handleAddMember = async (memberEmail: string) => {
    if (!room) {
      return;
    }

    try {
      const result = await addRoomMember(room.id, memberEmail);
      const members = await getRoomMembers(room.id);
      setRoomMembers(members);
      const pending = await getPendingInvitations(room.id);
      setPendingInvitations(pending);
      const activity = await getRoomActivity(room.id);
      setRoomActivity(activity);
      toast.success(result.status === "INVITED" ? "Invitation sent" : "Member added");
    } catch (error) {
      toast.error(getUserFriendlyErrorMessage(error, "Unable to add member"));
    }
  };

  const handleUpdateMemberPermissions = async (
    memberUserId: number,
    permissions: {
      canEditFiles?: boolean;
      canSaveVersions?: boolean;
      canRevertVersions?: boolean;
      memberRole?: "ADMIN" | "EDITOR" | "REVIEWER" | "VIEWER";
    }
  ) => {
    if (!room) {
      return;
    }

    try {
      const updated = await updateRoomMemberPermissions(room.id, memberUserId, permissions);
      setRoomMembers((prev) => prev.map((member) => (member.id === updated.id ? updated : member)));
      const activity = await getRoomActivity(room.id);
      setRoomActivity(activity);
      toast.success("Member permissions updated");
    } catch (error) {
      toast.error(getUserFriendlyErrorMessage(error, "Unable to update member permissions"));
    }
  };

  const handleRevertVersion = async (versionId: number) => {
    if (!room || !activeFileId) {
      return;
    }

    try {
      const reverted = await revertFileVersion(room.id, activeFileId, versionId);
      setCode(reverted.content || "");
      lastSyncedCodeRef.current = reverted.content || "";
      const files = await getRoomFiles(room.id);
      const history = await getFileVersions(room.id, activeFileId);
      setRoomFiles(files);
      setVersions(history);
      const activity = await getRoomActivity(room.id);
      setRoomActivity(activity);
      const refreshed = await getRoomFile(room.id, activeFileId);
      setActiveFileUpdatedAt(refreshed.updatedAt);
      toast.success(`Reverted to v${reverted.revertedFromVersion}`);
    } catch (error) {
      toast.error(getUserFriendlyErrorMessage(error, "Unable to revert version"));
    }
  };

  const handleRevokeInvitation = async (inviteeEmail: string) => {
    if (!room) {
      return;
    }

    const confirmed = window.confirm(`Revoke the pending invitation for ${inviteeEmail}?`);
    if (!confirmed) {
      return;
    }

    try {
      await revokeInvitation(room.id, inviteeEmail);
      const pending = await getPendingInvitations(room.id);
      setPendingInvitations(pending);
      const activity = await getRoomActivity(room.id);
      setRoomActivity(activity);
      toast.success(`Revoked invitation for ${inviteeEmail}`);
    } catch (error) {
      toast.error(getUserFriendlyErrorMessage(error, "Unable to revoke invitation"));
    }
  };

  const handleDeleteVersion = async (versionId: number) => {
    if (!room || !activeFileId) {
      return;
    }

    const confirmed = window.confirm("Delete this version snapshot permanently?");
    if (!confirmed) {
      return;
    }

    try {
      await deleteFileVersion(room.id, activeFileId, versionId);
      const history = await getFileVersions(room.id, activeFileId);
      setVersions(history);
      const activity = await getRoomActivity(room.id);
      setRoomActivity(activity);
      toast.success("Version deleted");
    } catch (error) {
      toast.error(getUserFriendlyErrorMessage(error, "Unable to delete version"));
    }
  };

  const handleCompareVersion = async (versionId: number) => {
    if (!room || !activeFileId) {
      return;
    }

    try {
      const currentVersion = await getVersionDetail(room.id, activeFileId, versionId);
      const compareTarget = versions.find((entry) => entry.id !== versionId)?.id;
      if (!compareTarget) {
        toast.info("At least two versions are required for compare");
        return;
      }
      const comparison = await compareVersions(room.id, activeFileId, compareTarget, versionId);
      setVersionComparison(comparison);
      if (!currentVersion.content) {
        toast.info("Loaded comparison for selected versions");
      }
    } catch (error) {
      toast.error(getUserFriendlyErrorMessage(error, "Unable to compare versions"));
    }
  };

  const loadComments = useCallback(async () => {
    if (!room || !activeFileId) {
      setComments([]);
      return;
    }
    try {
      const commentItems = await getFileComments(room.id, activeFileId);
      setComments(commentItems);
    } catch {
      // Keep UI usable even if comments fail transiently.
    }
  }, [room, activeFileId]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const handleAddComment = async () => {
    if (!room || !activeFileId || !newComment.trim()) {
      return;
    }
    try {
      await addFileComment(room.id, activeFileId, {
        content: newComment.trim(),
        startLine: lastSelectionRef.current.startLine,
        startColumn: lastSelectionRef.current.startColumn,
        endLine: lastSelectionRef.current.endLine,
        endColumn: lastSelectionRef.current.endColumn,
      });
      setNewComment("");
      await loadComments();
      toast.success("Comment added");
    } catch (error) {
      toast.error(getUserFriendlyErrorMessage(error, "Unable to add comment"));
    }
  };

  const handleReplyComment = async (commentId: number) => {
    if (!room || !commentReplyDraft[commentId]?.trim()) {
      return;
    }
    try {
      await replyToComment(room.id, commentId, commentReplyDraft[commentId].trim());
      setCommentReplyDraft((prev) => ({ ...prev, [commentId]: "" }));
      await loadComments();
      toast.success("Reply added");
    } catch (error) {
      toast.error(getUserFriendlyErrorMessage(error, "Unable to add reply"));
    }
  };

  const handleResolveComment = async (commentId: number, resolved: boolean) => {
    if (!room) {
      return;
    }
    try {
      await resolveComment(room.id, commentId, resolved);
      await loadComments();
      toast.success(resolved ? "Comment resolved" : "Comment reopened");
    } catch (error) {
      toast.error(getUserFriendlyErrorMessage(error, "Unable to update comment"));
    }
  };

  const handleSearch = async () => {
    if (!room || !searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      const results = await searchRoom(room.id, searchQuery.trim());
      setSearchResults(results);
    } catch (error) {
      toast.error(getUserFriendlyErrorMessage(error, "Search failed"));
    }
  };

  const handleApplyActivityFilters = async () => {
    if (!room) {
      return;
    }
    try {
      const filtered = await getRoomActivityFiltered(room.id, activityFilters);
      setRoomActivity(filtered);
    } catch (error) {
      toast.error(getUserFriendlyErrorMessage(error, "Unable to filter activity"));
    }
  };

  const canManageMembers = Boolean(
    room &&
    user.email.trim().toLowerCase() === String(room.ownerEmail ?? "").trim().toLowerCase()
  );
  const currentUserMembership = roomMembers.find((member) => member.email.toLowerCase() === user.email.toLowerCase());
  const canSaveVersions = isStandalone || canManageMembers || Boolean(currentUserMembership?.canSaveVersions);
  const canRevertVersions = isStandalone || canManageMembers || Boolean(currentUserMembership?.canRevertVersions);
  const visibleMembers = isStandalone
    ? [{
        id: 0,
        name: user.name,
        email: user.email,
        joinedAt: new Date().toISOString(),
        owner: true,
        canEditFiles: true,
        canSaveVersions: true,
        canRevertVersions: true,
      }]
    : roomMembers;

  const handleRealtimeEvent = useCallback((event: RoomRealtimeEvent) => {
    if (!room || isStandalone) {
      return;
    }

    const actorEmail = String(event.payload?.actorEmail ?? "").toLowerCase();
    const isCurrentUserEvent = actorEmail && actorEmail === user.email.toLowerCase();

    if (event.type === "CURSOR_UPDATE") {
      const targetFileId = Number(event.payload?.fileId ?? -1);
      if (!actorEmail || isCurrentUserEvent || !room) {
        return;
      }

      setRemoteSelections((prev) => ({
        ...prev,
        [actorEmail]: {
          userLabel: String(event.payload?.actorName ?? actorEmail),
          fileId: targetFileId,
          startLine: Number(event.payload?.startLine ?? 1),
          startColumn: Number(event.payload?.startColumn ?? 1),
          endLine: Number(event.payload?.endLine ?? 1),
          endColumn: Number(event.payload?.endColumn ?? 1),
          typing: Boolean(event.payload?.typing),
          updatedAt: Date.now(),
        },
      }));
      return;
    }

    if (event.type === "FILE_LOCKED") {
      const fileId = Number(event.payload?.fileId ?? -1);
      const lockedByEmail = String(event.payload?.lockedByEmail ?? "");
      const lockedByName = String(event.payload?.lockedByName ?? lockedByEmail);
      if (fileId > 0 && lockedByEmail) {
        setFileLocks((prev) => ({ ...prev, [fileId]: { lockedByEmail, lockedByName } }));
      }
      return;
    }

    if (event.type === "FILE_UNLOCKED") {
      const fileId = Number(event.payload?.fileId ?? -1);
      if (fileId > 0) {
        setFileLocks((prev) => {
          const next = { ...prev };
          delete next[fileId];
          return next;
        });
      }
      return;
    }

    if (["COMMENT_CREATED", "COMMENT_REPLY_CREATED", "COMMENT_RESOLVED"].includes(event.type)) {
      if (activeFileId) {
        void getFileComments(room.id, activeFileId).then(setComments).catch(() => undefined);
      }
      return;
    }

    if ((event.type === "FILE_UPDATED" || event.type === "FILE_UPLOADED" || event.type === "VERSION_REVERTED") && !isCurrentUserEvent) {
      const fileId = Number(event.payload?.fileId ?? -1);
      const fileContent = typeof event.payload?.content === "string" ? event.payload.content : null;
      const updatedAt = typeof event.payload?.updatedAt === "string" ? event.payload.updatedAt : null;

      if (activeFileId && fileId === activeFileId && fileContent != null) {
        if (codeRef.current === lastSyncedCodeRef.current) {
          setCode(fileContent);
          lastSyncedCodeRef.current = fileContent;
          if (updatedAt) {
            setActiveFileUpdatedAt(updatedAt);
          }
        } else {
          toast.warning("Remote changes detected. Save or refresh to merge latest updates.");
        }
      }
    }

    if (["FILE_CREATED", "FILE_UPDATED", "FILE_UPLOADED", "VERSION_SAVED", "VERSION_REVERTED"].includes(event.type)) {
      void (async () => {
        try {
          const [files, activity] = await Promise.all([getRoomFiles(room.id), getRoomActivity(room.id)]);
          setRoomFiles(files);
          setRoomActivity(activity);
          if (activeFileId) {
            const history = await getFileVersions(room.id, activeFileId);
            setVersions(history);
          }
        } catch {
          // Ignore transient realtime refresh failures.
        }
      })();
    }

    if (["ROOM_JOINED", "MEMBER_ADDED", "MEMBER_PERMISSIONS_UPDATED"].includes(event.type)) {
      void (async () => {
        try {
          const [members, activity] = await Promise.all([getRoomMembers(room.id), getRoomActivity(room.id)]);
          setRoomMembers(members);
          setRoomActivity(activity);
        } catch {
          // Ignore transient realtime refresh failures.
        }
      })();
    }
  }, [room, isStandalone, user.email, activeFileId]);

  const { connected: realtimeConnected, activeUsers } = useSocket({
    roomId: room?.id,
    enabled: !isStandalone && Boolean(room),
    onEvent: handleRealtimeEvent,
  });

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const cutoff = Date.now() - 6000;
      setRemoteSelections((prev) => {
        const next: Record<string, RemoteSelectionState> = {};
        for (const [email, selection] of Object.entries(prev)) {
          if (selection.updatedAt > cutoff) {
            next[email] = selection;
          }
        }
        return next;
      });
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, []);

  const publishSelection = useCallback((fileId: number, selection: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  }, typing: boolean) => {
    if (!room || !fileId || isStandalone) {
      return;
    }

    void publishRoomPresence(room.id, {
      fileId,
      startLine: selection.startLine,
      startColumn: selection.startColumn,
      endLine: selection.endLine,
      endColumn: selection.endColumn,
      typing,
    }).catch(() => {
      // Ignore transient realtime presence publish failures.
    });
  }, [room, isStandalone]);

  const handleEditorSelectionChange = useCallback((selection: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  }) => {
    lastSelectionRef.current = selection;
    if (activeFileId) {
      publishSelection(activeFileId, selection, false);
    }
  }, [activeFileId, publishSelection]);

  const handleEditorCodeChange = useCallback((value: string) => {
    setCode(value);
    if (!room || !activeFileId || isStandalone) {
      return;
    }

    const payload = lastSelectionRef.current;
    publishSelection(activeFileId, payload, true);

    if (typingResetTimerRef.current) {
      window.clearTimeout(typingResetTimerRef.current);
    }
    typingResetTimerRef.current = window.setTimeout(() => {
      publishSelection(activeFileId, payload, false);
    }, 1200);
  }, [room, activeFileId, isStandalone, publishSelection]);

  const editorRemoteSelections = useMemo(() => {
    if (!activeFileId) {
      return [];
    }
    const palette = [0, 1, 2, 3, 4];
    return Object.entries(remoteSelections)
      .filter(([, selection]) => selection.fileId === activeFileId)
      .map(([email, selection], index) => ({
        key: email,
        userLabel: selection.userLabel,
        startLine: selection.startLine,
        startColumn: selection.startColumn,
        endLine: selection.endLine,
        endColumn: selection.endColumn,
        typing: selection.typing,
        colorIndex: palette[index % palette.length],
      }));
  }, [remoteSelections, activeFileId]);

  const activeEditors = useMemo(() => {
    return Object.entries(remoteSelections)
      .map(([email, selection]) => {
        const fileName = roomFiles.find((file) => file.id === selection.fileId)?.filePath || `File #${selection.fileId}`;
        return {
          email,
          label: selection.userLabel,
          fileName,
          typing: selection.typing,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [remoteSelections, roomFiles]);

  const draftStorageKey = useMemo(() => buildDraftStorageKey({
    userEmail: user.email,
    roomId: room?.id,
    fileId: activeFileId,
    fileName: activeFileName,
    isStandalone,
  }), [user.email, room?.id, activeFileId, activeFileName, isStandalone]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      saveDraftSnapshot(draftStorageKey, {
        content: code,
        fileName: activeFileName,
        savedAt: new Date().toISOString(),
        serverUpdatedAt: activeFileUpdatedAt,
      });
      setLocalDraftSavedAt(new Date());
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [draftStorageKey, code, activeFileName, activeFileUpdatedAt]);

  const performRemoteAutoSave = useCallback(async () => {
    if (isStandalone || !room || !activeFileId || !activeFileUpdatedAt) {
      return;
    }

    const saved = await saveRoomFile(room.id, activeFileId, code, activeFileUpdatedAt, activeFileName);
    setActiveFileUpdatedAt(saved.updatedAt);
    lastSyncedCodeRef.current = saved.content || "";
  }, [isStandalone, room, activeFileId, activeFileUpdatedAt, code, activeFileName]);

  const autoSave = useAutoSave({
    enabled: !isStandalone && Boolean(room && activeFileId && activeFileUpdatedAt),
    value: code,
    hasChanges: code !== lastSyncedCodeRef.current,
    delayMs: 1200,
    onSave: performRemoteAutoSave,
    onError: (error) => {
      toast.error(getUserFriendlyErrorMessage(error, "Unable to sync file changes"));
    },
  });

  const saveStatusText = useMemo(() => {
    if (autoSave.status === "saving") {
      return "Saving...";
    }
    if (autoSave.status === "error") {
      return "Auto-save failed";
    }
    if (autoSave.lastSavedAt) {
      return `Saved ${autoSave.lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    if (localDraftSavedAt) {
      return `Draft saved ${localDraftSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    return "All changes up to date";
  }, [autoSave.status, autoSave.lastSavedAt, localDraftSavedAt]);

  if (loadingRoom) {
    return (
      <div className="h-screen grid place-items-center bg-background text-muted-foreground text-sm">
        Loading room...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Navbar>
        <div className="flex items-center gap-2 ml-2">
          <div className="flex items-center gap-1.5 bg-surface rounded-md px-2 py-1">
            <Hash className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-mono text-foreground">{isStandalone ? "STANDALONE" : room?.roomCode}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-surface rounded-md px-2 py-1">
            <Users className="h-3 w-3 text-primary" />
            <div className="flex -space-x-1.5">
              {visibleMembers.slice(0, 5).map((member, idx) => (
                <div
                  key={member.id}
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border-2 border-card"
                  style={{ backgroundColor: ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7"][idx % 5], color: "#fff" }}
                  title={member.name}
                >
                  {member.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground">
              {isStandalone ? `${visibleMembers.length} members` : `${activeUsers.length} online / ${visibleMembers.length} members`}
            </span>
            {!isStandalone && (
              <span className={`text-[10px] ${realtimeConnected ? "text-primary" : "text-muted-foreground"}`}>
                {realtimeConnected ? "live" : "offline"}
              </span>
            )}
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] px-2 ${autoSave.status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
            {saveStatusText}
          </span>
          {!backendAvailable && (
            <span className="text-[10px] text-warning px-2">Live error highlight offline</span>
          )}
          <input ref={fileInputRef} type="file" accept=".java" onChange={handleUpload} className="hidden" />
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-3 w-3" /> Upload
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleDownload}>
            <Download className="h-3 w-3" /> Download
          </Button>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={handleAnalyze} disabled={analyzing}>
            <Zap className={`h-3 w-3 ${analyzing ? "animate-pulse-glow" : ""}`} />
            {analyzing ? "Analyzing..." : "Analyze"}
          </Button>
        </div>
      </Navbar>

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          roomCode={isStandalone ? "STANDALONE" : room?.roomCode || roomId || "workspace"}
          roomName={isStandalone ? "Personal Workspace" : room?.roomName || "Workspace"}
          roomMembers={roomMembers}
          pendingInvitations={pendingInvitations}
          activeUsers={activeUsers}
          activeEditors={activeEditors}
          fileLocks={fileLocks}
          currentUserEmail={user.email}
          roomFiles={roomFiles}
          versions={versions}
          loadingVersions={loadingVersions}
          activeFileId={activeFileId}
          activeFilePath={activeFileName}
          canManageMembers={canManageMembers}
          canSaveVersions={canSaveVersions}
          canRevertVersions={canRevertVersions}
          onSaveVersion={handleSaveVersion}
          onJoinRoom={handleJoinRoom}
          onAddMember={handleAddMember}
          onRevokeInvitation={handleRevokeInvitation}
          onUpdateMemberPermissions={handleUpdateMemberPermissions}
          onSelectFile={handleSelectFile}
          onCreateFile={handleCreateFile}
          onRevertVersion={handleRevertVersion}
          onDeleteVersion={handleDeleteVersion}
          onCompareVersion={handleCompareVersion}
        />
        <EditorPanel
          code={code}
          fileName={activeFileName}
          onChange={handleEditorCodeChange}
          onSelectionChange={handleEditorSelectionChange}
          remoteSelections={editorRemoteSelections}
          issues={issues}
        />

        <div className="w-80 workspace-panel flex flex-col overflow-hidden shrink-0">
          <Tabs defaultValue="analysis" className="flex flex-col h-full">
            <TabsList className="w-full rounded-none border-b border-border bg-transparent h-9 px-2">
              <TabsTrigger value="analysis" className="text-xs flex-1 data-[state=active]:bg-surface rounded-md h-6">Analysis</TabsTrigger>
              <TabsTrigger value="issues" className="text-xs flex-1 data-[state=active]:bg-surface rounded-md h-6">Issues</TabsTrigger>
              <TabsTrigger value="learning" className="text-xs flex-1 data-[state=active]:bg-surface rounded-md h-6">Learning</TabsTrigger>
              <TabsTrigger value="comments" className="text-xs flex-1 data-[state=active]:bg-surface rounded-md h-6">Comments</TabsTrigger>
              <TabsTrigger value="search" className="text-xs flex-1 data-[state=active]:bg-surface rounded-md h-6">Search</TabsTrigger>
              <TabsTrigger value="activity" className="text-xs flex-1 data-[state=active]:bg-surface rounded-md h-6">Activity</TabsTrigger>
            </TabsList>
            <ScrollArea className="flex-1">
              <TabsContent value="analysis" className="mt-0"><AnalysisPanel result={analysis} /></TabsContent>
              <TabsContent value="issues" className="mt-0"><IssuesPanel issues={issues} /></TabsContent>
              <TabsContent value="learning" className="mt-0"><LearningPanel /></TabsContent>
              <TabsContent value="comments" className="mt-0 p-3 space-y-2">
                <textarea
                  className="w-full min-h-20 rounded border border-border bg-surface p-2 text-xs"
                  placeholder="Add a comment on current selection"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <Button size="sm" className="h-7 text-xs" onClick={handleAddComment} disabled={!activeFileId || !newComment.trim()}>
                  Add comment
                </Button>
                {comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No comments for this file.</p>
                ) : (
                  <div className="space-y-2">
                    {comments.map((comment) => (
                      <div key={comment.id} className="rounded-md border border-border bg-surface p-2 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-foreground">{comment.authorName || comment.authorEmail || "Unknown"}</p>
                          <span className="text-[10px] text-muted-foreground">{comment.resolved ? "resolved" : "open"}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{comment.content}</p>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px]"
                            onClick={() => void handleResolveComment(comment.id, !comment.resolved)}
                          >
                            {comment.resolved ? "Reopen" : "Resolve"}
                          </Button>
                        </div>
                        <div className="flex gap-1">
                          <input
                            className="h-6 flex-1 rounded border border-border bg-background px-2 text-[10px]"
                            value={commentReplyDraft[comment.id] || ""}
                            onChange={(e) => setCommentReplyDraft((prev) => ({ ...prev, [comment.id]: e.target.value }))}
                            placeholder="Reply"
                          />
                          <Button
                            size="sm"
                            className="h-6 text-[10px]"
                            onClick={() => void handleReplyComment(comment.id)}
                            disabled={!commentReplyDraft[comment.id]?.trim()}
                          >
                            Reply
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="search" className="mt-0 p-3 space-y-2">
                <div className="flex gap-1">
                  <input
                    className="h-7 flex-1 rounded border border-border bg-surface px-2 text-xs"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search files, versions, activity"
                  />
                  <Button size="sm" className="h-7 text-xs" onClick={handleSearch}>Find</Button>
                </div>
                {!searchResults ? (
                  <p className="text-xs text-muted-foreground">Run a search to see grouped results.</p>
                ) : (
                  <div className="space-y-2 text-xs">
                    <div>
                      <p className="font-semibold text-foreground">Files ({searchResults.files.length})</p>
                      {searchResults.files.map((file) => <p key={file.id} className="text-muted-foreground">{file.filePath}</p>)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Versions ({searchResults.versions.length})</p>
                      {searchResults.versions.map((v) => <p key={v.id} className="text-muted-foreground">v{v.versionNumber} • {v.filePath || v.fileId}</p>)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Activity ({searchResults.activity.length})</p>
                      {searchResults.activity.map((a) => <p key={a.id} className="text-muted-foreground">{a.title}</p>)}
                    </div>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="activity" className="mt-0 p-3">
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  <input
                    className="h-7 rounded border border-border bg-surface px-2 text-[11px]"
                    placeholder="Actor email"
                    value={activityFilters.actorEmail || ""}
                    onChange={(e) => setActivityFilters((prev) => ({ ...prev, actorEmail: e.target.value }))}
                  />
                  <input
                    className="h-7 rounded border border-border bg-surface px-2 text-[11px]"
                    placeholder="Event type"
                    value={activityFilters.type || ""}
                    onChange={(e) => setActivityFilters((prev) => ({ ...prev, type: e.target.value }))}
                  />
                  <input
                    className="h-7 rounded border border-border bg-surface px-2 text-[11px]"
                    placeholder="From (ISO date-time)"
                    value={activityFilters.from || ""}
                    onChange={(e) => setActivityFilters((prev) => ({ ...prev, from: e.target.value }))}
                  />
                  <input
                    className="h-7 rounded border border-border bg-surface px-2 text-[11px]"
                    placeholder="To (ISO date-time)"
                    value={activityFilters.to || ""}
                    onChange={(e) => setActivityFilters((prev) => ({ ...prev, to: e.target.value }))}
                  />
                </div>
                <div className="flex gap-1 mb-2">
                  <Button size="sm" className="h-7 text-xs" onClick={handleApplyActivityFilters}>Apply filters</Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setActivityFilters({});
                      if (room) {
                        void getRoomActivity(room.id).then(setRoomActivity).catch(() => undefined);
                      }
                    }}
                  >
                    Reset
                  </Button>
                </div>
                {roomActivity.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No activity yet.</p>
                ) : (
                  <div className="space-y-2">
                    {roomActivity.slice(0, 20).map((event) => (
                      <div key={event.id} className="rounded-md border border-border bg-surface p-2">
                        <p className="text-xs font-semibold text-foreground">{event.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{event.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {(event.actorName || event.actorEmail || "Unknown") + " • " + new Date(event.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
          {versionComparison && (
            <div className="border-t border-border p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">Version compare: {versionComparison.fromLabel} vs {versionComparison.toLabel}</p>
              <div className="grid grid-cols-2 gap-2">
                <textarea className="h-24 rounded border border-border bg-surface p-2 text-[10px]" readOnly value={versionComparison.fromContent} />
                <textarea className="h-24 rounded border border-border bg-surface p-2 text-[10px]" readOnly value={versionComparison.toContent} />
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setVersionComparison(null)}>Close compare</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Workspace;
