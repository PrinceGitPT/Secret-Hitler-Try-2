import type { Room } from "@/lib/game/types";
import type { ChatMessage } from "@/lib/chat/types";

const STORE_PREFIX = "secret-hitler:v1";
const MEMORY_STORE_KEY = "__secret_hitler_mvp_memory_kv__";

interface KvBackend {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  del(key: string): Promise<void>;
}

let resolvedBackend: KvBackend | null = null;

function getMemoryStore(): Map<string, string> {
  const globalScope = globalThis as typeof globalThis & {
    [MEMORY_STORE_KEY]?: Map<string, string>;
  };

  if (!globalScope[MEMORY_STORE_KEY]) {
    globalScope[MEMORY_STORE_KEY] = new Map();
  }

  return globalScope[MEMORY_STORE_KEY];
}

function memoryBackend(): KvBackend {
  const memory = getMemoryStore();
  return {
    async get<T>(key: string): Promise<T | null> {
      const raw = memory.get(key);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as T;
    },
    async set<T>(key: string, value: T): Promise<void> {
      memory.set(key, JSON.stringify(value));
    },
    async del(key: string): Promise<void> {
      memory.delete(key);
    }
  };
}

async function resolveBackend(): Promise<KvBackend> {
  if (resolvedBackend) {
    return resolvedBackend;
  }

  const hasVercelKvCredentials = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  if (hasVercelKvCredentials) {
    try {
      const kvModule = await import("@vercel/kv");

      resolvedBackend = {
        async get<T>(key: string): Promise<T | null> {
          return kvModule.kv.get<T>(key);
        },
        async set<T>(key: string, value: T): Promise<void> {
          await kvModule.kv.set<T>(key, value);
        },
        async del(key: string): Promise<void> {
          await kvModule.kv.del(key);
        }
      };

      return resolvedBackend;
    } catch {
      // Fallback below.
    }
  }

  resolvedBackend = memoryBackend();
  return resolvedBackend;
}

function roomKey(roomCode: string): string {
  return `${STORE_PREFIX}:room:${roomCode.toUpperCase()}`;
}

function roomChatKey(roomCode: string): string {
  return `${STORE_PREFIX}:chat:${roomCode.toUpperCase()}`;
}

export async function readRoom(roomCode: string): Promise<Room | null> {
  const backend = await resolveBackend();
  return backend.get<Room>(roomKey(roomCode));
}

export async function writeRoom(room: Room): Promise<void> {
  const backend = await resolveBackend();
  await backend.set(roomKey(room.code), room);
}

export async function deleteRoom(roomCode: string): Promise<void> {
  const backend = await resolveBackend();
  await backend.del(roomKey(roomCode));
}

export async function readRoomChat(roomCode: string): Promise<ChatMessage[] | null> {
  const backend = await resolveBackend();
  return backend.get<ChatMessage[]>(roomChatKey(roomCode));
}

export async function writeRoomChat(roomCode: string, messages: ChatMessage[]): Promise<void> {
  const backend = await resolveBackend();
  await backend.set(roomChatKey(roomCode), messages);
}

export function resetMemoryKvForTests(): void {
  getMemoryStore().clear();
  resolvedBackend = memoryBackend();
}
