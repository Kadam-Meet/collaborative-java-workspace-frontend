import { useState } from "react";
import { Link } from "react-router-dom";
import { Code2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordApi } from "@/api/authApi";
import { getUserFriendlyErrorMessage } from "@/hooks/useToast";

const ForgotPassword = () => {
	const [email, setEmail] = useState("");
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setError("");
		setMessage("");

		if (!email.trim()) {
			setError("Email is required.");
			return;
		}

		setIsSubmitting(true);
		try {
			const response = await forgotPasswordApi({ email: email.trim() });
			setMessage(response.message);
		} catch (requestError) {
			setError(getUserFriendlyErrorMessage(requestError, "Unable to send reset email. Please try again."));
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
						<h1 className="text-lg font-bold text-foreground mb-1">Forgot password</h1>
						<p className="text-xs text-muted-foreground">We’ll email a secure link to reset your password.</p>
					</div>
					{error && <p className="text-xs text-destructive bg-destructive/10 rounded p-2">{error}</p>}
					{message && <p className="text-xs text-emerald-500 bg-emerald-500/10 rounded p-2">{message}</p>}
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-1.5">
							<Label className="text-xs">Email</Label>
							<div className="relative">
								<Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									type="email"
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									placeholder="you@example.com"
									className="pl-9"
									required
								/>
							</div>
						</div>
						<Button type="submit" className="w-full" disabled={isSubmitting}>
							{isSubmitting ? "Sending..." : "Send reset link"}
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

export default ForgotPassword;