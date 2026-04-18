import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Code2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordApi } from "@/api/authApi";
import { getUserFriendlyErrorMessage } from "@/hooks/useToast";

const ResetPassword = () => {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setError("");
		setMessage("");

		if (!token) {
			setError("This reset link is missing a token.");
			return;
		}

		if (!password || password.length < 6) {
			setError("Password must be at least 6 characters.");
			return;
		}

		if (password !== confirmPassword) {
			setError("Passwords do not match.");
			return;
		}

		setIsSubmitting(true);
		try {
			const response = await resetPasswordApi({ token, password });
			setMessage(response.message);
			setTimeout(() => navigate("/login"), 1200);
		} catch (requestError) {
			setError(getUserFriendlyErrorMessage(requestError, "Unable to reset password. Please try again."));
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen bg-background flex items-center justify-center px-4">
			<div className="w-full max-w-sm animate-slide-up">
				<Link to="/login" className="flex items-center justify-center gap-2 mb-8">
					<Code2 className="h-6 w-6 text-primary" />
					<span className="font-bold text-foreground">CJW</span>
				</Link>
				<div className="bg-card border border-border rounded-xl p-6 space-y-4">
					<div>
						<h1 className="text-lg font-bold text-foreground mb-1">Reset password</h1>
						<p className="text-xs text-muted-foreground">Enter a new password for your account.</p>
					</div>
					{error && <p className="text-xs text-destructive bg-destructive/10 rounded p-2">{error}</p>}
					{message && <p className="text-xs text-emerald-500 bg-emerald-500/10 rounded p-2">{message}</p>}
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-1.5">
							<Label className="text-xs">New password</Label>
							<div className="relative">
								<LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									type="password"
									value={password}
									onChange={(event) => setPassword(event.target.value)}
									placeholder="••••••••"
									className="pl-9"
									required
								/>
							</div>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Confirm password</Label>
							<Input
								type="password"
								value={confirmPassword}
								onChange={(event) => setConfirmPassword(event.target.value)}
								placeholder="••••••••"
								required
							/>
						</div>
						<Button type="submit" className="w-full" disabled={isSubmitting}>
							{isSubmitting ? "Updating..." : "Update password"}
						</Button>
					</form>
					<div className="text-center">
						<Link to="/login" className="text-xs text-primary hover:underline">
							Back to login
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ResetPassword;