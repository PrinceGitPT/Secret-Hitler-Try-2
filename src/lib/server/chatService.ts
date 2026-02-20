import { chooseBotPhaseMessage, isChatBotPhase } from "@/lib/chat/botPhrases";
import { listMessages, postMessage } from "@/lib/chat/service";
import type { PublicChatMessage } from "@/lib/chat/types";
import { GameInvariantError } from "@/lib/game/errors";
import { chooseUniform, systemRandom, type RandomSource } from "@/lib/game/random";
import { getPlayerById } from "@/lib/game/rules";
import type { Phase, Player, Room } from "@/lib/game/types";
import { readRoom } from "@/lib/store/kv";

interface PlayerIndexEntry {
  name: string;
  isBot: boolean;
}

function toPlayerIndex(players: Player[]): Map<string, PlayerIndexEntry> {
  return new Map(
    players.map((player) => [
      player.id,
      {
        name: player.name,
        isBot: player.isBot
      }
    ])
  );
}

function toPublicChatMessage(
  message: {
    id: string;
    roomCode: string;
    senderId: string;
    body: string;
    createdAt: number;
  },
  playerIndex: Map<string, PlayerIndexEntry>
): PublicChatMessage {
  const sender = playerIndex.get(message.senderId);
  return {
    id: message.id,
    roomCode: message.roomCode,
    senderId: message.senderId,
    senderName: sender?.name ?? "Unknown",
    senderIsBot: sender?.isBot ?? false,
    body: message.body,
    createdAt: message.createdAt
  };
}

async function getRoomOrThrow(roomCode: string): Promise<Room> {
  const room = await readRoom(roomCode);
  if (!room) {
    throw new GameInvariantError("ROOM_NOT_FOUND", `Room ${roomCode} not found.`);
  }
  return room;
}

function assertChatEnabled(room: Room): void {
  if (!room.game) {
    throw new GameInvariantError("CHAT_DISABLED", "Chat is only available after the game starts.");
  }
}

function getActorOrThrow(room: Room, actorId: string): Player {
  const actor = getPlayerById(room, actorId);
  if (!actor) {
    throw new GameInvariantError("ACTOR_NOT_IN_ROOM", "Actor does not belong to this room.");
  }
  return actor;
}

function assertAlive(player: Player): void {
  if (!player.alive) {
    throw new GameInvariantError("CHAT_SENDER_DEAD", "Dead players cannot send chat messages.");
  }
}

export async function getRoomChatService(params: {
  roomCode: string;
  actorId: string;
}): Promise<{ messages: PublicChatMessage[] }> {
  const room = await getRoomOrThrow(params.roomCode);
  assertChatEnabled(room);
  getActorOrThrow(room, params.actorId);

  const playerIndex = toPlayerIndex(room.players);
  const messages = await listMessages(room.code);
  return {
    messages: messages.map((message) => toPublicChatMessage(message, playerIndex))
  };
}

export async function postRoomChatService(params: {
  roomCode: string;
  actorId: string;
  body: string;
}): Promise<{ message: PublicChatMessage }> {
  const room = await getRoomOrThrow(params.roomCode);
  assertChatEnabled(room);

  const actor = getActorOrThrow(room, params.actorId);
  assertAlive(actor);

  if (actor.isBot) {
    throw new GameInvariantError("CHAT_SENDER_NOT_ALLOWED", "Bots can only send server-generated messages.");
  }

  const created = await postMessage(room.code, actor.id, params.body);
  const playerIndex = toPlayerIndex(room.players);
  return {
    message: toPublicChatMessage(created, playerIndex)
  };
}

export async function postBotPhaseMessage(params: {
  room: Room;
  phase: Phase;
  rng?: RandomSource;
}): Promise<PublicChatMessage | undefined> {
  const room = params.room;
  if (!room.game || !isChatBotPhase(params.phase)) {
    return undefined;
  }

  const aliveBots = room.players.filter((player) => player.isBot && player.alive);
  if (aliveBots.length === 0) {
    return undefined;
  }

  const rng = params.rng ?? systemRandom;
  const sender = chooseUniform(aliveBots, rng);
  const body = chooseBotPhaseMessage(params.phase, rng);
  const created = await postMessage(room.code, sender.id, body);
  const playerIndex = toPlayerIndex(room.players);
  return toPublicChatMessage(created, playerIndex);
}
