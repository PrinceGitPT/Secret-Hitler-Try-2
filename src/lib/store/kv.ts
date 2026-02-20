import type { Room } from "@/lib/game/types";
import type { ChatMessage } from "@/lib/chat/types";
import { GameInvariantError } from "@/lib/game/errors";

const STORE_PREFIX = "secret-hitler:v1";
const MEMORY_STORE_KEY = "__secret_hitler_mvp_memory_kv__";

interface KvBackend {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  del(key: string): Promise<void>;
}

type StorageMode = "vercel-kv" | "memory";

interface ResolvedBackend {
  backend: KvBackend;
  mode: StorageMode;
}

let resolvedBackend: ResolvedBackend | null = null;

function isProductionRuntime(): boolean {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}

function hasVercelKvCredentials(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

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

function kvUnavailableError(operation: "get" | "set" | "del", key: string, cause: unknown): GameInvariantError {
  const suffix = cause instanceof Error ? `: ${cause.message}` : "";
  return new GameInvariantError("KV_UNAVAILABLE", `KV ${operation} failed for key ${key}${suffix}`);
}

function kvBackend(kvModule: typeof import("@vercel/kv")): KvBackend {
  return {
    async get<T>(key: string): Promise<T | null> {
      try {
        return await kvModule.kv.get<T>(key);
      } catch (error) {
        throw kvUnavailableError("get", key, error);
      }
    },
    async set<T>(key: string, value: T): Promise<void> {
      try {
        await kvModule.kv.set<T>(key, value);
      } catch (error) {
        throw kvUnavailableError("set", key, error);
      }
    },
    async del(key: string): Promise<void> {
      try {
        await kvModule.kv.del(key);
      } catch (error) {
        throw kvUnavailableError("del", key, error);
      }
    }
  };
}

function kvNotConfiguredError(): GameInvariantError {
  return new GameInvariantError(
    "KV_NOT_CONFIGURED",
    "Vercel KV is required in production. Configure KV_REST_API_URL and KV_REST_API_TOKEN, then redeploy."
  );
}

async function resolveBackendWithMode(): Promise<ResolvedBackend> {
  if (resolvedBackend) {
    return resolvedBackend;
  }

  const production = isProductionRuntime();
  const hasCredentials = hasVercelKvCredentials();

  if (hasCredentials) {
    try {
      const kvModule = await import("@vercel/kv");

      resolvedBackend = {
        backend: kvBackend(kvModule),
        mode: "vercel-kv"
      };

      return resolvedBackend;
    } catch (error) {
      if (production) {
        const suffix = error instanceof Error ? ` (${error.message})` : "";
        throw new GameInvariantError(
          "KV_NOT_CONFIGURED",
          `Vercel KV import failed in production${suffix}. Verify KV integration and redeploy.`
        );
      }
    }
  }

  if (production) {
    throw kvNotConfiguredError();
  }

  resolvedBackend = {
    backend: memoryBackend(),
    mode: "memory"
  };
  return resolvedBackend;
}

async function resolveBackend(): Promise<KvBackend> {
  const resolved = await resolveBackendWithMode();
  return resolved.backend;
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

export async function getStorageDiagnostics(): Promise<{
  mode: StorageMode;
  production: boolean;
  hasCredentials: boolean;
}> {
  const resolved = await resolveBackendWithMode();
  return {
    mode: resolved.mode,
    production: isProductionRuntime(),
    hasCredentials: hasVercelKvCredentials()
  };
}

export function resetMemoryKvForTests(): void {
  getMemoryStore().clear();
  resolvedBackend = null;
}

export function resetKvResolutionForTests(): void {
  resolvedBackend = null;
}
