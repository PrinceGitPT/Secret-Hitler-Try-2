export interface ChatMessage {
  id: string;
  roomCode: string;
  senderId: string;
  body: string;
  createdAt: number;
}

export interface PublicChatMessage {
  id: string;
  roomCode: string;
  senderId: string;
  senderName: string;
  senderIsBot: boolean;
  body: string;
  createdAt: number;
}

export const CHAT_MAX_LENGTH = 240;
export const CHAT_RETENTION_LIMIT = 100;
