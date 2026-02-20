import type { GameAction, RoomProjection, ThemeManifest } from "@/lib/game/types";
import type { PublicChatMessage } from "@/lib/chat/types";

export interface RoomStateResponse extends RoomProjection {
  theme?: ThemeManifest;
  themes: ThemeManifest[];
}

export interface RoomChatResponse {
  messages: PublicChatMessage[];
}

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T | { error?: { message?: string } };

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "error" in payload && payload.error?.message
        ? payload.error.message
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export async function createRoomApi(input: {
  roomSize: number;
  themeId: string;
  hostName: string;
}): Promise<{ room: RoomProjection; actorId: string }> {
  const response = await fetch("/api/rooms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  return parseJsonOrThrow<{ room: RoomProjection; actorId: string }>(response);
}

export async function joinRoomApi(
  roomCode: string,
  input: { name: string }
): Promise<{ room: RoomProjection; actorId: string }> {
  const response = await fetch(`/api/rooms/${roomCode}/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  return parseJsonOrThrow<{ room: RoomProjection; actorId: string }>(response);
}

export async function startRoomApi(roomCode: string, actorId: string): Promise<RoomProjection> {
  const response = await fetch(`/api/rooms/${roomCode}/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ actorId })
  });

  return parseJsonOrThrow<RoomProjection>(response);
}

export async function updateRoomConfigApi(params: {
  roomCode: string;
  actorId: string;
  roomSize?: number;
  themeId?: string;
}): Promise<RoomProjection> {
  const response = await fetch(`/api/rooms/${params.roomCode}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      actorId: params.actorId,
      roomSize: params.roomSize,
      themeId: params.themeId
    })
  });

  return parseJsonOrThrow<RoomProjection>(response);
}

export async function getRoomStateApi(roomCode: string, actorId?: string): Promise<RoomStateResponse> {
  const query = actorId ? `?actorId=${encodeURIComponent(actorId)}` : "";
  const response = await fetch(`/api/rooms/${roomCode}/state${query}`, {
    cache: "no-store"
  });
  return parseJsonOrThrow<RoomStateResponse>(response);
}

export async function postActionApi(roomCode: string, action: GameAction): Promise<RoomProjection> {
  const response = await fetch(`/api/rooms/${roomCode}/actions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(action)
  });

  return parseJsonOrThrow<RoomProjection>(response);
}

export async function getRoomChatApi(roomCode: string, actorId: string): Promise<RoomChatResponse> {
  const query = `?actorId=${encodeURIComponent(actorId)}`;
  const response = await fetch(`/api/rooms/${roomCode}/chat${query}`, {
    cache: "no-store"
  });
  return parseJsonOrThrow<RoomChatResponse>(response);
}

export async function postRoomChatApi(
  roomCode: string,
  input: { actorId: string; body: string }
): Promise<{ message: PublicChatMessage }> {
  const response = await fetch(`/api/rooms/${roomCode}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  return parseJsonOrThrow<{ message: PublicChatMessage }>(response);
}
