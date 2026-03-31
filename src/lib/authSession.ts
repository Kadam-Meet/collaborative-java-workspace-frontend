const TOKEN_KEY = "cjw-token";
const USER_KEY = "cjw-user";

let authInitialized = false;
let resolveAuthInitialization: (() => void) | null = null;
let currentToken: string | null = null;

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
	if (currentToken) {
		return currentToken;
	}

	const storedToken = localStorage.getItem(TOKEN_KEY);
	if (storedToken) {
		currentToken = storedToken;
	}
	return storedToken;
}

export function syncSessionToken(token: string | null) {
	currentToken = token;
}

export function persistStoredSession(token: string, userJson: string) {
	currentToken = token;
	localStorage.setItem(TOKEN_KEY, token);
	localStorage.setItem(USER_KEY, userJson);
}

export function clearStoredSession() {
	currentToken = null;
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

export async function waitForAuthToken() {
	if (readStoredToken()) {
		return;
	}

	await waitForAuthInitialization();
}
