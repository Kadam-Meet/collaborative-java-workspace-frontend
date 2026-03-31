const TOKEN_KEY = "cjw-token";
const USER_KEY = "cjw-user";

let authInitialized = false;
let resolveAuthInitialization: (() => void) | null = null;

const authInitializationPromise = new Promise<void>((resolve) => {
	resolveAuthInitialization = resolve;
});

export function getTokenStorageKey() {
	return TOKEN_KEY;
}

export function getUserStorageKey() {
	return USER_KEY;
}

export function readStoredToken(): string | null {
	return localStorage.getItem(TOKEN_KEY);
}

export function persistStoredSession(token: string, userJson: string) {
	localStorage.setItem(TOKEN_KEY, token);
	localStorage.setItem(USER_KEY, userJson);
}

export function clearStoredSession() {
	localStorage.removeItem(TOKEN_KEY);
	localStorage.removeItem(USER_KEY);
}

export function markAuthInitialized() {
	if (authInitialized) {
		return;
	}

	authInitialized = true;
	resolveAuthInitialization?.();
	resolveAuthInitialization = null;
}

export async function waitForAuthInitialization() {
	if (authInitialized) {
		return;
	}

	await authInitializationPromise;
}
