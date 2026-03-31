import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import EditorPanel from "@/components/workspace/EditorPanel";
import AnalysisPanel from "@/components/workspace/AnalysisPanel";
import IssuesPanel from "@/components/workspace/IssuesPanel";
import LearningPanel from "@/components/workspace/LearningPanel";
import { analysisResults, defaultJavaCode, issuesList } from "@/data/mockData";
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
  addRoomMember,
  createRoomFile,
  downloadRoomFile,
  getFileVersions,
  getRoomByCode,
  getRoomActivity,
  getRoomFile,
  getRoomFiles,
  getRoomMembers,
  joinRoom,
  revertFileVersion,
  publishRoomPresence,
  saveRoomFile,
  saveVersionSnapshot,
  updateRoomMemberPermissions,
  uploadRoomJavaFile,
} from "@/api/workspaceApi";
import type { RoomActivity, RoomFile, RoomMember, RoomSummary, VersionEntry } from "@/types/workspace.types";
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

const Workspace = () => {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { roomId } = useParams();
  const isStandalone = !roomId;
  const [code, setCode] = useState(defaultJavaCode);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<WorkspaceAnalysis>(analysisResults as WorkspaceAnalysis);
  const [issues, setIssues] = useState<WorkspaceIssue[]>(issuesList as WorkspaceIssue[]);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([]);
  const [roomFiles, setRoomFiles] = useState<RoomFile[]>([]);
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [roomActivity, setRoomActivity] = useState<RoomActivity[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [activeFileId, setActiveFileId] = useState<number | null>(null);
  const [activeFileUpdatedAt, setActiveFileUpdatedAt] = useState<string | null>(null);
  const [activeFileName, setActiveFileName] = useState("DataProcessor.java");
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
      const [members, files] = await Promise.all([
        getRoomMembers(roomDetails.id),
        getRoomFiles(roomDetails.id),
      ]);
      setRoom(roomDetails);
      setRoomMembers(members);
      setRoomFiles(files);
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
        setActiveFileName("DataProcessor.java");
        setCode(defaultJavaCode);
        lastSyncedCodeRef.current = defaultJavaCode;
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
    if (authLoading || !isAuthenticated) {
      return;
    }

    if (!roomId) {
      const restored = resolveDraftContent({
        content: defaultJavaCode,
        fileName: "DataProcessor.java",
        standalone: true,
      });
      setLoadingRoom(false);
      setRoom(null);
      setRoomMembers([]);
      setRoomFiles([]);
      setVersions([]);
      setRoomActivity([]);
      setRemoteSelections({});
      setActiveFileId(null);
      setActiveFileUpdatedAt(null);
      setActiveFileName("DataProcessor.java");
      setCode(restored.content);
      lastSyncedCodeRef.current = restored.content;
      return;
    }
    void loadRoomContext(roomId);
  }, [authLoading, isAuthenticated, roomId, resolveDraftContent]);

  const handleAnalyze = async () => {
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
    if (authLoading || !isAuthenticated) {
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
  }, [authLoading, isAuthenticated, code, roomId, user.email]);

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

    triggerDownload(new Blob([code], { type: "text/x-java-source" }), activeFileName || "DataProcessor.java");
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
        setActiveFileName(file.name || "DataProcessor.java");
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
      const file = await getRoomFile(room.id, fileId);
      setLoadingVersions(true);
      const history = await getFileVersions(room.id, fileId);
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
      await addRoomMember(room.id, memberEmail);
      const members = await getRoomMembers(room.id);
      setRoomMembers(members);
      const activity = await getRoomActivity(room.id);
      setRoomActivity(activity);
      toast.success("Member added");
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

  const publishSelection = useCallback((selection: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  }, typing: boolean) => {
    if (!room || !activeFileId || isStandalone) {
      return;
    }

    void publishRoomPresence(room.id, {
      fileId: activeFileId,
      startLine: selection.startLine,
      startColumn: selection.startColumn,
      endLine: selection.endLine,
      endColumn: selection.endColumn,
      typing,
    }).catch(() => {
      // Ignore transient realtime presence publish failures.
    });
  }, [room, activeFileId, isStandalone]);

  const handleEditorSelectionChange = useCallback((selection: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  }) => {
    lastSelectionRef.current = selection;
    publishSelection(selection, false);
  }, [publishSelection]);

  const handleEditorCodeChange = useCallback((value: string) => {
    setCode(value);
    if (!room || !activeFileId || isStandalone) {
      return;
    }

    const payload = lastSelectionRef.current;
    publishSelection(payload, true);

    if (typingResetTimerRef.current) {
      window.clearTimeout(typingResetTimerRef.current);
    }
    typingResetTimerRef.current = window.setTimeout(() => {
      publishSelection(payload, false);
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
          activeUsers={activeUsers}
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
          onUpdateMemberPermissions={handleUpdateMemberPermissions}
          onSelectFile={handleSelectFile}
          onCreateFile={handleCreateFile}
          onRevertVersion={handleRevertVersion}
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
              <TabsTrigger value="activity" className="text-xs flex-1 data-[state=active]:bg-surface rounded-md h-6">Activity</TabsTrigger>
            </TabsList>
            <ScrollArea className="flex-1">
              <TabsContent value="analysis" className="mt-0"><AnalysisPanel result={analysis} /></TabsContent>
              <TabsContent value="issues" className="mt-0"><IssuesPanel issues={issues} /></TabsContent>
              <TabsContent value="learning" className="mt-0"><LearningPanel /></TabsContent>
              <TabsContent value="activity" className="mt-0 p-3">
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
        </div>
      </div>
    </div>
  );
};

export default Workspace;
