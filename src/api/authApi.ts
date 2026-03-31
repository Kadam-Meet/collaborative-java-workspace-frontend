import { apiJson } from "@/api/axiosClient";

export interface AuthUser {
	name: string;
	email: string;
}

export interface AuthResponse {
	token: string | null;
	tokenType: string;
	name: string;
	email: string;
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
	return { name: data.name, email: data.email };
}

export async function updateMeApi(payload: UpdateMePayload): Promise<AuthUser> {
	const data = await apiJson<AuthResponse>("/api/auth/me", {
		method: "PUT",
		body: JSON.stringify(payload),
		auth: true,
	});
	return { name: data.name, email: data.email };
}

export async function deleteMeApi(): Promise<void> {
	await apiJson<void>("/api/auth/me", {
		method: "DELETE",
		auth: true,
	});
}
