import { getTokenStorageKey, waitForAuthToken } from "@/lib/authSession";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
throw new Error("VITE_API_BASE_URL is not defined. Please set it in your environment variables.");
}

const TOKEN_KEY = getTokenStorageKey();

type ErrorPayload = {
message?: string;
error?: string;
code?: string;
status?: number;
};

export class ApiError extends Error {
status: number;
code?: string;

constructor(message: string, status = 0, code?: string) {
super(message);
this.name = "ApiError";
this.status = status;
this.code = code;
}
}

function readToken(): string {
const token = localStorage.getItem(TOKEN_KEY);
if (!token) {
throw new ApiError("You are not logged in", 401, "AUTH_REQUIRED");
}
return token;
}

async function parseError(response: Response): Promise<ApiError> {
const text = await response.text();
let payload: ErrorPayload = {};

if (text) {
try {
payload = JSON.parse(text) as ErrorPayload;
} catch {
payload = { message: text };
}
}

const message =
payload.message ||
payload.error ||
(response.status >= 500 ? "Server error. Please try again." : "Request failed.");

return new ApiError(message, response.status, payload.code);
}

export function toApiError(error: unknown): ApiError {
if (error instanceof ApiError) {
return error;
}
if (error instanceof Error) {
return new ApiError(error.message);
}
return new ApiError("Unexpected error");
}

type RequestOptions = RequestInit & {
auth?: boolean;
};

function buildHeaders(
  inputHeaders?: HeadersInit,
  auth?: boolean,
  method?: string,
  body?: BodyInit | null
): Headers {
  const headers = new Headers(inputHeaders || {});

  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  // 🔥 ONLY add Content-Type for methods that support body
  const methodUpper = method?.toUpperCase();

  if (
    body &&
    !isFormData &&
    methodUpper &&
    ["POST", "PUT", "PATCH"].includes(methodUpper) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (auth) {
    headers.set("Authorization", `Bearer ${readToken()}`);
  }

  return headers;
}

export async function apiJson<T>(path: string, options?: RequestOptions): Promise<T> {
if (options?.auth) {
await waitForAuthToken();
}

const response = await fetch(`${API_BASE_URL}${path}`, {
...options,
headers: buildHeaders(options?.headers, options?.auth, options?.method, options?.body),
});

if (!response.ok) {
throw await parseError(response);
}

if (response.status === 204) {
return undefined as T;
}

const text = await response.text();
return (text ? JSON.parse(text) : {}) as T;
}

export async function apiBlob(
path: string,
options?: RequestOptions
): Promise<{ blob: Blob; response: Response }> {
if (options?.auth) {
await waitForAuthToken();
}

const response = await fetch(`${API_BASE_URL}${path}`, {
...options,
headers: buildHeaders(options?.headers, options?.auth, options?.method, options?.body),
});

if (!response.ok) {
throw await parseError(response);
}

return { blob: await response.blob(), response };
}

export function authJsonHeaders(): HeadersInit {
return {
"Content-Type": "application/json",
Authorization: `Bearer ${readToken()}`,
};
}

export function authBearerHeader(): HeadersInit {
return {
Authorization: `Bearer ${readToken()}`,
};
}
