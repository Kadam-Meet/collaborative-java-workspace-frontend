import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/api/notificationApi";
import { acceptInvitation } from "@/api/workspaceApi";
import type { NotificationItem } from "@/types/workspace.types";
import { getUserFriendlyErrorMessage } from "@/hooks/useToast";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const REFRESH_MS = 15000;

const NotificationCenter = () => {
  const { token, loading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);

  const loadNotifications = async () => {
    if (authLoading || !isAuthenticated || !token) {
      return;
    }

    try {
      const data = await getNotifications(20, false);
      setUnreadCount(data.unreadCount);
      setItems(data.notifications);
    } catch (error) {
      toast.error(getUserFriendlyErrorMessage(error, "Unable to load notifications"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !isAuthenticated || !token) {
      return;
    }

    setLoading(true);
    void loadNotifications();
    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, REFRESH_MS);

    return () => window.clearInterval(intervalId);
  }, [authLoading, isAuthenticated, token]);

  useEffect(() => {
    if (open && !authLoading && isAuthenticated && token) {
      void loadNotifications();
    }
  }, [authLoading, isAuthenticated, open, token]);

  const unreadItems = useMemo(() => items.filter((item) => !item.read), [items]);

  const handleMarkRead = async (item: NotificationItem) => {
    if (item.read) {
      return;
    }

    try {
      const updated = await markNotificationRead(item.id);
      setItems((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      toast.error(getUserFriendlyErrorMessage(error, "Unable to mark notification as read"));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((entry) => ({ ...entry, read: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error(getUserFriendlyErrorMessage(error, "Unable to mark all as read"));
    }
  };

  const handleAcceptInvite = async (item: NotificationItem) => {
    if (!item.actionToken) {
      toast.error("Invitation token is missing");
      return;
    }

    try {
      const accepted = await acceptInvitation(item.actionToken);
      await handleMarkRead(item);
      toast.success(`Joined ${accepted.roomName}`);
      setOpen(false);
      navigate(`/workspace/${accepted.roomCode}`);
    } catch (error) {
      toast.error(getUserFriendlyErrorMessage(error, "Unable to accept invitation"));
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 min-w-4 h-4 px-1 text-[10px] leading-none grid place-items-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="border-b border-border px-3 py-2 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <p className="text-xs text-muted-foreground">{unreadItems.length} unread</p>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
            <CheckCheck className="h-3 w-3 mr-1" /> Mark all
          </Button>
        </div>

        <ScrollArea className="h-80">
          {loading ? (
            <div className="p-3 text-xs text-muted-foreground">Loading notifications...</div>
          ) : items.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground">No notifications yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div key={item.id} className={`p-3 transition-colors hover:bg-muted/40 ${item.read ? "opacity-70" : ""}`}>
                  <button type="button" className="w-full text-left" onClick={() => void handleMarkRead(item)}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground">{item.title}</p>
                      {!item.read && <span className="h-2 w-2 rounded-full bg-primary mt-1" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{item.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(item.createdAt).toLocaleString()}
                      {item.roomCode ? ` • ${item.roomCode}` : ""}
                    </p>
                  </button>
                  {item.actionType === "INVITE_ACCEPT" && item.actionToken ? (
                    <div className="mt-2 flex justify-end">
                      <Button size="sm" className="h-7 px-2 text-xs" onClick={() => void handleAcceptInvite(item)}>
                        Accept invitation
                      </Button>
                    </div>
                  ) : null}
                  </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
