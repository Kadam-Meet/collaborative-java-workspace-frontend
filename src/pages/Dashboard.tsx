import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/layout/Navbar";
import DashboardMetrics from "@/components/dashboard/DashboardMetrics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity, ExternalLink, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { createRoom, getMyRooms, joinRoom } from "@/api/workspaceApi";
import { getDashboardSummary } from "@/api/dashboardApi";
import type { DashboardSummary, RoomSummary } from "@/types/workspace.types";
import { getUserFriendlyErrorMessage } from "@/hooks/useToast";

const Dashboard = () => {
  const { user, token, loading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [newRoomName, setNewRoomName] = useState("");
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [saving, setSaving] = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  const loadRooms = async () => {
    setLoadingRooms(true);
    try {
      const [roomsResponse, dashboardResponse] = await Promise.all([getMyRooms(), getDashboardSummary()]);
      setRooms(roomsResponse);
      setDashboard(dashboardResponse);
    } catch (error) {
      toast.error(getUserFriendlyErrorMessage(error, "Unable to load rooms"));
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    if (authLoading || !isAuthenticated || !token) {
      return;
    }

    void loadRooms();
  }, [authLoading, isAuthenticated, token]);

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      toast.error("Enter a room name first");
      return;
    }

    setSaving(true);
    try {
      const room = await createRoom(newRoomName.trim());
      toast.success(`Room created: ${room.roomCode}`);
      setNewRoomName("");
      navigate(`/workspace/${room.roomCode}`);
    } catch (error) {
      toast.error(getUserFriendlyErrorMessage(error, "Unable to create room"));
    } finally {
      setSaving(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinRoomCode.trim()) {
      toast.error("Enter a room code first");
      return;
    }

    setSaving(true);
    try {
      const room = await joinRoom(joinRoomCode.trim());
      toast.success(`Joined room ${room.roomCode}`);
      setJoinRoomCode("");
      navigate(`/workspace/${room.roomCode}`);
    } catch (error) {
      toast.error(getUserFriendlyErrorMessage(error, "Unable to join room"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6 animate-slide-up">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome, {user.name}</h1>
            <p className="text-sm text-muted-foreground">Create, join, and manage your team rooms</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/workspace">
              <Button variant="outline" size="sm" className="gap-1.5">
                Solo Workspace
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant="outline" size="sm" className="gap-1.5">
                Profile
              </Button>
            </Link>
            <Button size="sm" className="gap-1.5" onClick={handleCreateRoom} disabled={saving || !newRoomName.trim()}>
              <Plus className="h-3.5 w-3.5" /> New Workspace
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3 mb-6 animate-slide-up" style={{ animationDelay: "60ms" }}>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground mb-2">Create Room</p>
            <div className="flex gap-2">
              <Input
                value={newRoomName}
                onChange={(event) => setNewRoomName(event.target.value)}
                placeholder="Enter room name"
                className="h-9"
              />
              <Button onClick={handleCreateRoom} disabled={saving || !newRoomName.trim()}>Create</Button>
            </div>
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground mb-2">Join Room</p>
            <div className="flex gap-2">
              <Input
                value={joinRoomCode}
                onChange={(event) => setJoinRoomCode(event.target.value)}
                placeholder="Enter room code"
                className="h-9 font-mono uppercase"
              />
              <Button variant="outline" onClick={handleJoinRoom} disabled={saving || !joinRoomCode.trim()}>
                Join
              </Button>
            </div>
          </div>
        </div>

        <div className="animate-slide-up" style={{ animationDelay: "100ms" }}>
          <DashboardMetrics
            totals={
              dashboard?.totals ?? {
                rooms: rooms.length,
                files: 0,
                versions: 0,
                analyses: 0,
              }
            }
            performance={
              dashboard?.performance ?? {
                averageScore: 0,
                bestScore: 0,
                latestRiskLevel: "UNKNOWN",
              }
            }
          />
        </div>

        <div className="mt-8 animate-slide-up" style={{ animationDelay: "160ms" }}>
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
          <div className="space-y-2">
            {dashboard?.recentActivity?.length ? (
              dashboard.recentActivity.slice(0, 8).map((entry, index) => (
                <div key={`${entry.type}-${entry.createdAt}-${index}`} className="stat-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{entry.title}</p>
                      <p className="text-xs text-muted-foreground truncate mt-1">{entry.description}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Activity className="h-3 w-3" />
                      {new Date(entry.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No recent activity yet.</div>
            )}
          </div>
        </div>

        <div className="mt-8 animate-slide-up" style={{ animationDelay: "200ms" }}>
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Workspaces</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {loadingRooms && <div className="text-sm text-muted-foreground">Loading rooms...</div>}
            {!loadingRooms && rooms.length === 0 && (
              <div className="text-sm text-muted-foreground">No rooms yet. Create one to get started.</div>
            )}
            {rooms.map((ws) => (
              <div key={ws.id} className="stat-card flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{ws.roomName}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] text-muted-foreground font-mono">{ws.roomCode}</span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Users className="h-3 w-3" /> {ws.memberCount}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(ws.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Link to={`/workspace/${ws.roomCode}`}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
