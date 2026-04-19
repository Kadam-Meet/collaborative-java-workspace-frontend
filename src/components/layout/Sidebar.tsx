import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Hash, Folder, FolderOpen, FileText, ChevronDown, ChevronRight, FolderPlus, FilePlus2, Trash2 } from "lucide-react";
import type { PendingInvitationSummary, RoomFile, RoomMember, VersionEntry } from "@/types/workspace.types";
import VersionHistory from "@/components/workspace/VersionHistory";

interface SidebarProps {
  roomCode: string;
  roomName: string;
  roomMembers: RoomMember[];
  pendingInvitations: PendingInvitationSummary[];
  activeUsers: Array<{ email: string }>;
  activeEditors: Array<{
    email: string;
    label: string;
    fileName: string;
    typing: boolean;
  }>;
  fileLocks: Record<number, { lockedByEmail: string; lockedByName: string }>;
  currentUserEmail: string;
  roomFiles: RoomFile[];
  versions: VersionEntry[];
  loadingVersions?: boolean;
  activeFileId?: number | null;
  activeFilePath?: string;
  canManageMembers: boolean;
  canSaveVersions: boolean;
  canRevertVersions: boolean;
  onDeleteRoom: () => Promise<void>;
  onSaveVersion: () => Promise<void>;
  onJoinRoom: (roomCode: string) => Promise<void>;
  onAddMember: (email: string) => Promise<void>;
  onRevokeInvitation: (inviteeEmail: string) => Promise<void>;
  onUpdateMemberPermissions: (
    memberUserId: number,
    permissions: {
      canEditFiles?: boolean;
      canSaveVersions?: boolean;
      canRevertVersions?: boolean;
      memberRole?: "ADMIN" | "EDITOR" | "REVIEWER" | "VIEWER";
    }
  ) => Promise<void>;
  onSelectFile: (fileId: number) => Promise<void>;
  onCreateFile: (filePath: string) => Promise<void>;
  onDeleteFile: (fileId: number) => Promise<void>;
  onDeleteFolder: (folderPath: string) => Promise<void>;
  onRevertVersion: (versionId: number) => Promise<void>;
  onDeleteVersion: (versionId: number) => Promise<void>;
  onCompareVersion: (versionId: number) => Promise<void>;
}

const Sidebar = ({
  roomCode,
  roomName,
  roomMembers,
  pendingInvitations,
  activeUsers,
  activeEditors,
  fileLocks,
  currentUserEmail,
  roomFiles,
  versions,
  loadingVersions = false,
  activeFileId,
  activeFilePath,
  canManageMembers,
  canSaveVersions,
  canRevertVersions,
  onDeleteRoom,
  onSaveVersion,
  onJoinRoom,
  onAddMember,
  onRevokeInvitation,
  onUpdateMemberPermissions,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onDeleteFolder,
  onRevertVersion,
  onDeleteVersion,
  onCompareVersion,
}: SidebarProps) => {
  const [joinRoom, setJoinRoom] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ "": true });
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [permissionDraft, setPermissionDraft] = useState<{
    canEditFiles: boolean;
    canSaveVersions: boolean;
    canRevertVersions: boolean;
  } | null>(null);

  const handleJoin = async () => {
    if (!joinRoom.trim()) {
      return;
    }
    await onJoinRoom(joinRoom.trim());
    setJoinRoom("");
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      return;
    }
    await onAddMember(inviteEmail.trim());
    setInviteEmail("");
  };

  const handleCreateFile = async () => {
    if (!newFileName.trim()) {
      return;
    }

    const baseFileName = newFileName.trim();
    const normalizedName = baseFileName.includes("/") ? baseFileName : `${baseFileName}`;
    const fullPath = selectedFolder ? `${selectedFolder}/${normalizedName}` : normalizedName;

    await onCreateFile(fullPath);
    setNewFileName("");
  };

  const normalizeFolderPath = (value: string) =>
    value
      .trim()
      .replace(/\\/g, "/")
      .replace(/^\/+|\/+$/g, "")
      .replace(/\/+/g, "/");

  const handleCreateFolder = () => {
    const folder = normalizeFolderPath(newFolderName);
    if (!folder) {
      return;
    }

    setExpandedFolders((prev) => ({ ...prev, [folder]: true }));
    setSelectedFolder(folder);
    setNewFolderName("");
  };

  const toggleFolder = (folder: string) => {
    setExpandedFolders((prev) => ({ ...prev, [folder]: !prev[folder] }));
  };

  const folderSet = new Set<string>([""]);
  for (const file of roomFiles) {
    const segments = file.filePath.split("/").filter(Boolean);
    if (segments.length <= 1) {
      continue;
    }
    let current = "";
    for (let i = 0; i < segments.length - 1; i += 1) {
      current = current ? `${current}/${segments[i]}` : segments[i];
      folderSet.add(current);
    }
  }
  if (selectedFolder) {
    folderSet.add(selectedFolder);
  }

  const folders = Array.from(folderSet).sort((a, b) => {
    if (a === "") return -1;
    if (b === "") return 1;
    return a.localeCompare(b);
  });

  const getParentFolder = (folder: string) => {
    const idx = folder.lastIndexOf("/");
    return idx === -1 ? "" : folder.slice(0, idx);
  };

  const getFolderDepth = (folder: string) => (folder ? folder.split("/").length : 0);

  const getDisplayFolderName = (folder: string) => {
    if (!folder) {
      return "root";
    }
    const idx = folder.lastIndexOf("/");
    return idx === -1 ? folder : folder.slice(idx + 1);
  };

  const filesByFolder = roomFiles.reduce<Record<string, RoomFile[]>>((acc, file) => {
    const idx = file.filePath.lastIndexOf("/");
    const folder = idx === -1 ? "" : file.filePath.slice(0, idx);
    if (!acc[folder]) {
      acc[folder] = [];
    }
    acc[folder].push(file);
    return acc;
  }, {});

  const onlineEmails = new Set(activeUsers.map((user) => user.email.trim().toLowerCase()));

  const startEditingMember = (member: RoomMember) => {
    setEditingMemberId(member.id);
    setPermissionDraft({
      canEditFiles: member.canEditFiles,
      canSaveVersions: member.canSaveVersions,
      canRevertVersions: member.canRevertVersions,
    });
  };

  const cancelEditingMember = () => {
    setEditingMemberId(null);
    setPermissionDraft(null);
  };

  const saveMemberPermissions = async (memberId: number) => {
    if (!permissionDraft) {
      return;
    }
    await onUpdateMemberPermissions(memberId, permissionDraft);
    cancelEditingMember();
  };

  return (
    <aside className="w-64 workspace-panel flex flex-col overflow-hidden shrink-0">
      {/* Room Info */}
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Room Info</h3>
        <div className="flex items-center gap-2 bg-surface rounded-md px-2 py-1.5 mb-2">
          <Hash className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-mono text-foreground truncate">{roomCode}</span>
        </div>
        <p className="text-xs text-foreground font-medium mb-2 truncate">{roomName}</p>
        <div className="flex gap-1.5">
          <Input
            placeholder="Room code..."
            value={joinRoom}
            onChange={(e) => setJoinRoom(e.target.value)}
            className="h-7 text-xs bg-surface border-border"
          />
          <Button size="sm" className="h-7 text-xs px-2 shrink-0" onClick={handleJoin}>Join</Button>
        </div>
        {canManageMembers && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 h-7 w-full text-xs gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={() => void onDeleteRoom()}
          >
            <Trash2 className="h-3 w-3" /> Delete room
          </Button>
        )}
      </div>

      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Members</h3>
        <div className="space-y-1.5 mb-2 max-h-28 overflow-y-auto">
          {roomMembers.map((member) => (
            <div key={member.id} className="text-[11px] text-foreground space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">{member.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${onlineEmails.has(member.email.trim().toLowerCase()) ? "bg-green-500" : "bg-muted-foreground/50"}`} />
                  <span className="text-[10px] text-muted-foreground">{onlineEmails.has(member.email.trim().toLowerCase()) ? "online" : "offline"}</span>
                  <span className="text-[10px] text-muted-foreground">{member.owner ? "owner" : "member"}</span>
                </div>
              </div>
              {canManageMembers && !member.owner && (
                <div className="space-y-1">
                  {editingMemberId !== member.id && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => startEditingMember(member)}
                    >
                      Edit settings
                    </Button>
                  )}

                  {editingMemberId === member.id && permissionDraft && (
                    <div className="rounded border border-border bg-surface p-2 space-y-1.5">
                      <label className="flex items-center gap-1.5 text-[10px] text-foreground">
                        <input
                          type="checkbox"
                          checked={permissionDraft.canEditFiles}
                          onChange={(e) =>
                            setPermissionDraft((prev) => (prev ? { ...prev, canEditFiles: e.target.checked } : prev))
                          }
                        />
                        Edit files
                      </label>
                      <label className="flex items-center gap-1.5 text-[10px] text-foreground">
                        <input
                          type="checkbox"
                          checked={permissionDraft.canSaveVersions}
                          onChange={(e) =>
                            setPermissionDraft((prev) => (prev ? { ...prev, canSaveVersions: e.target.checked } : prev))
                          }
                        />
                        Save versions
                      </label>
                      <label className="flex items-center gap-1.5 text-[10px] text-foreground">
                        <input
                          type="checkbox"
                          checked={permissionDraft.canRevertVersions}
                          onChange={(e) =>
                            setPermissionDraft((prev) => (prev ? { ...prev, canRevertVersions: e.target.checked } : prev))
                          }
                        />
                        Revert versions
                      </label>
                      <select
                        className="h-6 w-full rounded border border-border bg-background px-1 text-[10px]"
                        value={member.memberRole || "EDITOR"}
                        onChange={(e) =>
                          void onUpdateMemberPermissions(member.id, {
                            memberRole: e.target.value as "ADMIN" | "EDITOR" | "REVIEWER" | "VIEWER",
                          })
                        }
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="EDITOR">Editor</option>
                        <option value="REVIEWER">Reviewer</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => void saveMemberPermissions(member.id)}
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                          onClick={cancelEditingMember}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        {canManageMembers && (
          <div className="flex gap-1.5">
            <Input
              placeholder="Add by email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="h-7 text-xs bg-surface border-border"
            />
            <Button size="sm" className="h-7 text-xs px-2 shrink-0" onClick={handleInvite}>Add</Button>
          </div>
        )}
      </div>

      {canManageMembers && (
        <div className="p-3 border-b border-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pending invites</h3>
          {pendingInvitations.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No pending invitations.</p>
          ) : (
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {pendingInvitations.map((invitation) => (
                <div key={invitation.id} className="rounded border border-border bg-surface px-2 py-1.5 text-[11px] space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-foreground">{invitation.inviteeEmail}</span>
                    <span className="text-[10px] text-muted-foreground">{invitation.status}</span>
                  </div>
                  <p className="text-muted-foreground truncate">
                    {invitation.roomCode || roomCode} • {invitation.expiresAt ? new Date(invitation.expiresAt).toLocaleDateString() : "no expiry"}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => void onRevokeInvitation(invitation.inviteeEmail)}
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Live editors</h3>
        {activeEditors.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No collaborator is actively editing a file right now.</p>
        ) : (
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {activeEditors.map((editor) => (
              <div key={editor.email} className="rounded border border-border bg-surface px-2 py-1.5 text-[11px] space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-foreground">{editor.label}</span>
                  <span className="text-[10px] text-muted-foreground">{editor.typing ? "typing" : "editing"}</span>
                </div>
                <p className="text-muted-foreground truncate">{editor.fileName}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Files</h3>
        <p className="text-[10px] text-muted-foreground mb-2 truncate">
          Active: <span className="text-foreground font-mono">{activeFilePath || "none"}</span>
        </p>

        <div className="flex gap-1.5 mb-1.5">
          <Input
            placeholder="New folder, e.g. services/core"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="h-7 text-xs bg-surface border-border"
          />
          <Button size="sm" className="h-7 text-xs px-2 shrink-0" onClick={handleCreateFolder}>
            <FolderPlus className="h-3 w-3" />
          </Button>
        </div>

        <div className="flex gap-1.5 mb-2">
          <Input
            placeholder={selectedFolder ? `New file in ${selectedFolder}` : "New file, e.g. Utils.java"}
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            className="h-7 text-xs bg-surface border-border"
          />
          <Button size="sm" className="h-7 text-xs px-2 shrink-0" onClick={handleCreateFile}>
            <FilePlus2 className="h-3 w-3" />
          </Button>
        </div>

        <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
          {folders.map((folder) => {
            const parent = getParentFolder(folder);
            if (folder !== "" && !expandedFolders[parent]) {
              return null;
            }

            const isExpanded = folder === "" ? true : Boolean(expandedFolders[folder]);
            const depth = getFolderDepth(folder);
            const folderFiles = (filesByFolder[folder] || []).sort((a, b) => a.filePath.localeCompare(b.filePath));

            return (
              <div key={folder || "root-folder"} className="relative">
                <div className={`w-full text-left text-[11px] rounded px-1 py-1 flex items-center gap-1 ${
                  selectedFolder === folder ? "bg-primary/15 text-primary" : "text-foreground hover:bg-surface"
                }`} style={{ paddingLeft: `${4 + depth * 10}px` }}>
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-1 text-left"
                    onClick={() => {
                      setSelectedFolder(folder);
                      if (folder !== "") {
                        toggleFolder(folder);
                      }
                    }}
                  >
                    {folder !== "" ? (isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />) : <span className="w-3" />}
                    {isExpanded ? <FolderOpen className="h-3 w-3" /> : <Folder className="h-3 w-3" />}
                    <span className="truncate">{getDisplayFolderName(folder)}</span>
                  </button>
                  {canManageMembers && folder !== "" && (
                    <button
                      type="button"
                      className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={(event) => {
                        event.stopPropagation();
                        void onDeleteFolder(folder);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {isExpanded && folderFiles.map((file) => {
                  const fileName = file.filePath.includes("/") ? file.filePath.slice(file.filePath.lastIndexOf("/") + 1) : file.filePath;
                  const lock = fileLocks[file.id];
                  const lockedByOther = Boolean(lock && lock.lockedByEmail.toLowerCase() !== currentUserEmail.toLowerCase());
                  return (
                    <div
                      key={file.id}
                      className={`w-full text-left text-[11px] rounded px-1 py-0.5 flex items-center gap-1 ${
                        activeFileId === file.id ? "bg-primary/15 text-primary" : "text-foreground hover:bg-surface"
                      }`}
                      style={{ paddingLeft: `${22 + depth * 10}px` }}
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-1 text-left"
                        onClick={() => void onSelectFile(file.id)}
                      >
                        <FileText className="h-3 w-3" />
                        <span className="truncate">{fileName}</span>
                      </button>
                      <div className="ml-auto flex items-center gap-1">
                        {lock ? (
                          <span className={`text-[9px] px-1 rounded ${lockedByOther ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
                            {lockedByOther ? `locked:${lock.lockedByName}` : "locked"}
                          </span>
                        ) : null}
                        {canManageMembers && (
                          <button
                            type="button"
                            className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={(event) => {
                              event.stopPropagation();
                              void onDeleteFile(file.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {roomFiles.length === 0 && <p className="text-[11px] text-muted-foreground">No files yet. Create a folder and add a file.</p>}
        </div>
      </div>

      {/* Version Control */}
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Version Control</h3>
        <Button size="sm" className="w-full h-8 text-xs gap-1.5" onClick={onSaveVersion} disabled={!canSaveVersions}>
          <Save className="h-3 w-3" /> Save Version
        </Button>
      </div>

      {/* Version History */}
      <div className="flex-1 overflow-y-auto p-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">History</h3>
        <VersionHistory
          versions={versions}
          loading={loadingVersions}
          onRevert={onRevertVersion}
          canRevert={canRevertVersions}
          canDelete={canSaveVersions}
          onDelete={onDeleteVersion}
          onCompare={onCompareVersion}
        />
      </div>
    </aside>
  );
};

export default Sidebar;
