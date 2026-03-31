import { readStoredToken } from "@/lib/authSession";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export interface RoomRealtimeEvent {
	type: string;
	roomId: number;
	createdAt: string;
	payload: Record<string, unknown>;
}

export interface SocketHandlers {
	onOpen?: () => void;
	onError?: () => void;
	onEvent?: (event: RoomRealtimeEvent) => void;
}

export function connectRoomStream(roomId: number, handlers: SocketHandlers): () => void {
	const token = readStoredToken();
	if (!token) {
		throw new Error("Missing auth token for realtime stream");
	}

	const encodedToken = encodeURIComponent(token);
	const eventSource = new EventSource(`${API_BASE_URL}/api/workspaces/rooms/${roomId}/events?access_token=${encodedToken}`);

	eventSource.onopen = () => {
		handlers.onOpen?.();
	};

	eventSource.onerror = () => {
		handlers.onError?.();
	};

	const eventNames = [
		"CONNECTED",
		"ACTIVE_USERS",
		"CURSOR_UPDATE",
		"ROOM_JOINED",
		"MEMBER_ADDED",
		"MEMBER_PERMISSIONS_UPDATED",
		"FILE_CREATED",
		"FILE_UPDATED",
		"FILE_UPLOADED",
		"VERSION_SAVED",
		"VERSION_REVERTED",
	];

	for (const eventName of eventNames) {
		eventSource.addEventListener(eventName, (raw) => {
			try {
				const parsed = JSON.parse((raw as MessageEvent).data) as RoomRealtimeEvent;
				handlers.onEvent?.(parsed);
			} catch {
				// Ignore malformed realtime payloads.
			}
		});
	}

	return () => {
		eventSource.close();
	};
}
