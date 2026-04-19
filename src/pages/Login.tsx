import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Code2 } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = (searchParams.get("inviteToken") ?? "").trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      if (inviteToken) {
        navigate(`/invite?token=${encodeURIComponent(inviteToken)}`);
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-slide-up">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <Code2 className="h-6 w-6 text-primary" />
          <span className="font-bold text-foreground">CJW</span>
        </Link>
        <div className="bg-card border border-border rounded-xl p-6">
          <h1 className="text-lg font-bold text-foreground mb-1">Welcome back</h1>
          <p className="text-xs text-muted-foreground mb-5">Sign in to your workspace</p>
          {error && <p className="text-xs text-destructive bg-destructive/10 rounded p-2 mb-3">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <Button type="submit" preventRapidClick={false} className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Login"}
            </Button>
          </form>
          <div className="mt-4 text-center space-y-1">
            <Link to={inviteToken ? `/signup?inviteToken=${encodeURIComponent(inviteToken)}` : "/signup"} className="text-xs text-primary hover:underline">
              Create an account
            </Link>
            <p>
              <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
                Forgot password?
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
