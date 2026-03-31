import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loginApi, meApi, signupApi, type AuthUser } from "@/api/authApi";
import {
	clearStoredSession,
	getTokenStorageKey,
	getUserStorageKey,
	markAuthInitialized,
	persistStoredSession,
	syncSessionToken,
} from "@/lib/authSession";

const TOKEN_KEY = getTokenStorageKey();
const USER_KEY = getUserStorageKey();

interface AuthContextType {
	user: AuthUser | null;
	token: string | null;
	loading: boolean;
	isAuthenticated: boolean;
	login: (email: string, password: string) => Promise<void>;
	signup: (name: string, email: string, password: string) => Promise<void>;
	logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function persistSession(token: string, user: AuthUser) {
	persistStoredSession(token, JSON.stringify(user));
}

function clearSession() {
	clearStoredSession();
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [token, setToken] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const storedToken = localStorage.getItem(TOKEN_KEY);
		const storedUser = localStorage.getItem(USER_KEY);

		if (!storedToken || !storedUser) {
			syncSessionToken(null);
			markAuthInitialized();
			setLoading(false);
			return;
		}

		let parsedUser: AuthUser | null = null;
		try {
			parsedUser = JSON.parse(storedUser) as AuthUser;
		} catch {
			clearSession();
			syncSessionToken(null);
			markAuthInitialized();
			setLoading(false);
			return;
		}

		syncSessionToken(storedToken);
		setToken(storedToken);
		setUser(parsedUser);

		meApi(storedToken)
			.then((profile) => {
				setUser(profile);
				localStorage.setItem(USER_KEY, JSON.stringify(profile));
			})
			.catch(() => {
				clearSession();
				syncSessionToken(null);
				setUser(null);
				setToken(null);
			})
			.finally(() => {
				markAuthInitialized();
				setLoading(false);
			});
	}, []);

	const login = async (email: string, password: string) => {
		const response = await loginApi({ email, password });
		const resolvedUser = { name: response.name, email: response.email };
		if (!response.token) {
			throw new Error("Invalid auth response");
		}
		syncSessionToken(response.token);
		setToken(response.token);
		setUser(resolvedUser);
		persistSession(response.token, resolvedUser);
		markAuthInitialized();
		setLoading(false);
	};

	const signup = async (name: string, email: string, password: string) => {
		const response = await signupApi({ name, email, password });
		const resolvedUser = { name: response.name, email: response.email };
		if (!response.token) {
			throw new Error("Invalid auth response");
		}
		syncSessionToken(response.token);
		setToken(response.token);
		setUser(resolvedUser);
		persistSession(response.token, resolvedUser);
		markAuthInitialized();
		setLoading(false);
	};

	const logout = () => {
		clearSession();
		syncSessionToken(null);
		setToken(null);
		setUser(null);
		markAuthInitialized();
		setLoading(false);
	};

	const value = useMemo<AuthContextType>(
		() => ({
			user,
			token,
			loading,
			isAuthenticated: Boolean(user && token),
			login,
			signup,
			logout,
		}),
		[user, token, loading]
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuthContext must be used within AuthProvider");
	}
	return context;
};
