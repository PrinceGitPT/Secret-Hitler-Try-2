import type { ChatMessage } from "@/lib/chat/types";
import { CHAT_MAX_LENGTH, CHAT_RETENTION_LIMIT } from "@/lib/chat/types";
import { GameInvariantError } from "@/lib/game/errors";
import { readRoomChat, writeRoomChat } from "@/lib/store/kv";

export async function listMessages(roomCode: string): Promise<ChatMessage[]> {
  const messages = await readRoomChat(roomCode);
  return messages ?? [];
}

export async function appendMessage(roomCode: string, message: ChatMessage): Promise<ChatMessage> {
  const messages = await listMessages(roomCode);
  const nextMessages = [...messages, message].slice(-CHAT_RETENTION_LIMIT);
  await writeRoomChat(roomCode, nextMessages);
  return message;
}

export async function postMessage(
  roomCode: string,
  senderId: string,
  body: string,
  now: number = Date.now()
): Promise<ChatMessage> {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new GameInvariantError("INVALID_CHAT_BODY", "Chat message cannot be empty.");
  }

  if (trimmed.length > CHAT_MAX_LENGTH) {
    throw new GameInvariantError(
      "CHAT_MESSAGE_TOO_LONG",
      `Chat message cannot exceed ${CHAT_MAX_LENGTH} characters.`
    );
  }

  const message: ChatMessage = {
    id: `m_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    roomCode: roomCode.toUpperCase(),
    senderId,
    body: trimmed,
    createdAt: now
  };

  return appendMessage(roomCode, message);
}
