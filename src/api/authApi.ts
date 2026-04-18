import { apiJson } from "@/api/axiosClient";

export interface AuthUser {
	name: string;
	email: string;
	headline: string | null;
	bio: string | null;
	location: string | null;
	accentColor: string;
	profilePublic: boolean;
	emailNotifications: boolean;
	workspaceDigest: boolean;
	focusModeEnabled: boolean;
}

export interface AuthResponse {
	token: string | null;
	tokenType: string;
	name: string;
	email: string;
	headline: string | null;
	bio: string | null;
	location: string | null;
	accentColor: string;
	profilePublic: boolean;
	emailNotifications: boolean;
	workspaceDigest: boolean;
	focusModeEnabled: boolean;
}

interface LoginPayload {
	email: string;
	password: string;
}

interface SignupPayload {
	name: string;
	email: string;
	password: string;
}

interface UpdateMePayload {
	name?: string;
	password?: string;
	headline?: string;
	bio?: string;
	location?: string;
	accentColor?: string;
	profilePublic?: boolean;
	emailNotifications?: boolean;
	workspaceDigest?: boolean;
	focusModeEnabled?: boolean;
}

function toAuthUser(data: AuthResponse): AuthUser {
	return {
		name: data.name,
		email: data.email,
		headline: data.headline ?? null,
		bio: data.bio ?? null,
		location: data.location ?? null,
		accentColor: data.accentColor || "emerald",
		profilePublic: Boolean(data.profilePublic),
		emailNotifications: Boolean(data.emailNotifications),
		workspaceDigest: Boolean(data.workspaceDigest),
		focusModeEnabled: Boolean(data.focusModeEnabled),
	};
}

export async function loginApi(payload: LoginPayload): Promise<AuthResponse> {
	return apiJson<AuthResponse>("/api/auth/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
}

export async function signupApi(payload: SignupPayload): Promise<AuthResponse> {
	return apiJson<AuthResponse>("/api/auth/signup", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
}

export async function meApi(token: string): Promise<AuthUser> {
	const data = await apiJson<AuthResponse>("/api/auth/me", {
		method: "GET",
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
	return toAuthUser(data);
}

export async function updateMeApi(payload: UpdateMePayload): Promise<AuthUser> {
	const data = await apiJson<AuthResponse>("/api/auth/me", {
		method: "PUT",
		body: JSON.stringify(payload),
		auth: true,
	});
	return toAuthUser(data);
}

export async function deleteMeApi(): Promise<void> {
	await apiJson<void>("/api/auth/me", {
		method: "DELETE",
		auth: true,
	});
}