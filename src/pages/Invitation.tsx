import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { previewInvitation, acceptInvitation } from "@/api/workspaceApi";
import type { InvitationPreviewResponse } from "@/types/workspace.types";
import { getUserFriendlyErrorMessage } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";

const Invitation = () => {
  const [searchParams] = useSearchParams();
  const token = (searchParams.get("token") ?? "").trim();
  const navigate = useNavigate();
  const { loading: authLoading, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preview, setPreview] = useState<InvitationPreviewResponse | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setError("Invitation token is missing.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const data = await previewInvitation(token);
        setPreview(data);
      } catch (requestError) {
        setError(getUserFriendlyErrorMessage(requestError, "Unable to load invitation."));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token]);

  const handleAccept = async () => {
    if (!token) {
      setError("Invitation token is missing.");
      return;
    }

    if (!isAuthenticated) {
      navigate(`/login?inviteToken=${encodeURIComponent(token)}`);
      return;
    }

    setAccepting(true);
    setError("");
    setSuccess("");
    try {
      const accepted = await acceptInvitation(token);
      setSuccess(`Joined ${accepted.roomName}`);
      setTimeout(() => navigate(`/workspace/${accepted.roomCode}`), 900);
    } catch (requestError) {
      setError(getUserFriendlyErrorMessage(requestError, "Unable to accept invitation."));
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-slide-up">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <Code2 className="h-6 w-6 text-primary" />
          <span className="font-bold text-foreground">CJW</span>
        </Link>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h1 className="text-lg font-bold text-foreground">Workspace invitation</h1>

          {loading ? <p className="text-xs text-muted-foreground">Loading invitation...</p> : null}
          {error ? <p className="text-xs text-destructive bg-destructive/10 rounded p-2">{error}</p> : null}
          {success ? <p className="text-xs text-emerald-500 bg-emerald-500/10 rounded p-2">{success}</p> : null}

          {preview && !loading ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <p>
                  <span className="text-foreground font-semibold">{preview.inviterName || "A teammate"}</span> invited you to
                  <span className="text-foreground font-semibold"> {preview.roomName}</span> ({preview.roomCode}).
                </p>
                <p className="mt-1">Invite sent to: {preview.inviteeEmail}</p>
              </div>

              {!preview.valid ? (
                <p className="text-xs text-muted-foreground">
                  {preview.accepted ? "This invitation is already accepted." : "This invitation has expired."}
                </p>
              ) : (
                <Button onClick={() => void handleAccept()} disabled={accepting || authLoading} className="w-full">
                  {accepting ? "Accepting..." : isAuthenticated ? "Accept invitation" : "Login to accept"}
                </Button>
              )}

              {!isAuthenticated && preview.valid ? (
                <div className="text-center text-xs text-muted-foreground space-y-1">
                  <p>
                    New here?{" "}
                    <Link to={`/signup?inviteToken=${encodeURIComponent(token)}`} className="text-primary hover:underline">
                      Create account and accept
                    </Link>
                  </p>
                  <p>
                    Already registered?{" "}
                    <Link to={`/login?inviteToken=${encodeURIComponent(token)}`} className="text-primary hover:underline">
                      Login and accept
                    </Link>
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Invitation;
