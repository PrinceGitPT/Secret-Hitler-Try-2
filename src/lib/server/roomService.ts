import { applyAction } from "@/lib/game/engine";
import { buildAutoExecutiveResolution } from "@/lib/game/executive";
import { postBotPhaseMessage } from "@/lib/server/chatService";
import { GameInvariantError } from "@/lib/game/errors";
import { dispatchExecutivePower } from "@/lib/game/powers/dispatcher";
import { deriveEligibleActions, deriveViewerIdentity, deriveViewerPrivateState, toPublicRoom } from "@/lib/game/projection";
import { systemRandom, type RandomSource } from "@/lib/game/random";
import { getChancellor, getPlayerById, getPresident, sortedPlayers } from "@/lib/game/rules";
import { chooseBotDiscardIndex, chooseBotNominee, chooseBotVote } from "@/lib/game/bots";
import {
  createRoom,
  generateRoomCode,
  joinHumanPlayer,
  startGame,
  updateRoomConfig
} from "@/lib/game/setup";
import type { GameAction, GameState, Phase, Room, RoomProjection, RoomSize } from "@/lib/game/types";
import { getThemeById, listThemes } from "@/lib/themes/manifest";
import { readRoom, writeRoom } from "@/lib/store/kv";

export interface CreateRoomInput {
  roomSize: number;
  themeId: string;
  hostName: string;
}

function logRoomEvent(event: string, room: Room, details: Record<string, unknown> = {}): void {
  console.info(
    JSON.stringify({
      scope: "room_service",
      event,
      roomCode: room.code,
      phase: room.game?.phase ?? "LOBBY",
      version: room.version,
      ...details
    })
  );
}

function assertRoomSize(roomSize: number): asserts roomSize is RoomSize {
  if (!Number.isInteger(roomSize) || roomSize < 5 || roomSize > 10) {
    throw new GameInvariantError("INVALID_ROOM_SIZE", "Room size must be an integer between 5 and 10.");
  }
}

function normalizeRoom(room: Room): Room {
  let changed = false;

  const players = room.players.map((player) => {
    if (player.alive === undefined) {
      changed = true;
      return {
        ...player,
        alive: true
      };
    }

    return player;
  });

  if (!room.game) {
    return changed ? { ...room, players } : room;
  }

  const legacy = room.game as Partial<GameState>;
  const gameChanged =
    legacy.electionTracker === undefined ||
    legacy.pendingVotes === undefined ||
    legacy.enactmentSequence === undefined ||
    legacy.drawPile === undefined ||
    legacy.discardPile === undefined ||
    legacy.liberalEnacted === undefined ||
    legacy.fascistEnacted === undefined ||
    legacy.executiveIntelLogByPlayer === undefined;

  if (!changed && !gameChanged) {
    return room;
  }

  const normalizedGame: GameState = {
    phase: legacy.phase ?? "NOMINATION",
    presidentSeat: legacy.presidentSeat ?? 1,
    chancellorSeat: legacy.chancellorSeat,
    drawPile: legacy.drawPile ?? [],
    discardPile: legacy.discardPile ?? [],
    liberalEnacted: legacy.liberalEnacted ?? 0,
    fascistEnacted: legacy.fascistEnacted ?? 0,
    electionTracker: legacy.electionTracker ?? 0,
    pendingVotes: legacy.pendingVotes ?? {},
    legislativeHand: legacy.legislativeHand,
    lastElectedPresidentSeat: legacy.lastElectedPresidentSeat,
    lastElectedChancellorSeat: legacy.lastElectedChancellorSeat,
    specialElectionNextPresidentSeat: legacy.specialElectionNextPresidentSeat,
    specialElectionReturnSeat: legacy.specialElectionReturnSeat,
    pendingExecutivePower: legacy.pendingExecutivePower,
    executiveIntelLogByPlayer: legacy.executiveIntelLogByPlayer ?? {},
    lastEnactedPolicy: legacy.lastEnactedPolicy,
    enactmentSequence: legacy.enactmentSequence ?? 0,
    winner: legacy.winner,
    winReason: legacy.winReason
  };

  return {
    ...room,
    players,
    game: normalizedGame
  };
}

async function getRoomOrThrow(roomCode: string): Promise<Room> {
  const room = await readRoom(roomCode);
  if (!room) {
    throw new GameInvariantError("ROOM_NOT_FOUND", `Room ${roomCode} not found.`);
  }

  return normalizeRoom(room);
}

async function generateUniqueRoomCode(rng: RandomSource): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = generateRoomCode(rng);
    const existing = await readRoom(code);
    if (!existing) {
      return code;
    }
  }
  throw new GameInvariantError("ROOM_CODE_EXHAUSTED", "Could not generate a unique room code.");
}

function ensureThemeExists(themeId: string): void {
  if (!getThemeById(themeId)) {
    throw new GameInvariantError("INVALID_THEME", `Unknown theme id: ${themeId}`);
  }
}

function nextSystemAction(room: Room, rng: RandomSource): GameAction | null {
  if (!room.game) {
    return null;
  }

  const game = room.game;
  if (game.phase === "GAME_OVER") {
    return null;
  }

  if (game.phase === "EXECUTIVE_ACTION" && game.pendingExecutivePower) {
    const president = getPresident(room);
    if (!president) {
      return null;
    }

    if (president.isBot) {
      return {
        type: "RESOLVE_EXECUTIVE_POWER",
        actorId: president.id,
        resolution: buildAutoExecutiveResolution(room, game.pendingExecutivePower, rng)
      };
    }

    return null;
  }

  switch (game.phase) {
    case "NOMINATION": {
      const president = getPresident(room);
      if (!president || !president.isBot || !president.alive) {
        return null;
      }

      return {
        type: "NOMINATE_CHANCELLOR",
        actorId: president.id,
        nomineeId: chooseBotNominee(room, rng)
      };
    }

    case "VOTING": {
      const pendingBot = sortedPlayers(room).find(
        (player) =>
          player.isBot &&
          player.alive &&
          !Object.prototype.hasOwnProperty.call(game.pendingVotes, player.id)
      );

      if (!pendingBot) {
        return null;
      }

      return {
        type: "CAST_VOTE",
        actorId: pendingBot.id,
        vote: chooseBotVote(rng)
      };
    }

    case "LEGISLATIVE_PRESIDENT": {
      const president = getPresident(room);
      if (!president || !president.isBot || !president.alive || !game.legislativeHand) {
        return null;
      }

      return {
        type: "LEGISLATIVE_DISCARD",
        actorId: president.id,
        cardIndex: chooseBotDiscardIndex(game.legislativeHand, rng) as 0 | 1 | 2
      };
    }

    case "LEGISLATIVE_CHANCELLOR": {
      const chancellor = getChancellor(room);
      if (!chancellor || !chancellor.isBot || !chancellor.alive || !game.legislativeHand) {
        return null;
      }

      return {
        type: "CHANCELLOR_DISCARD",
        actorId: chancellor.id,
        cardIndex: chooseBotDiscardIndex(game.legislativeHand, rng) as 0 | 1
      };
    }

    default:
      return null;
  }
}

function processGameEvents(room: Room, events: ReturnType<typeof applyAction>["events"]): void {
  for (const event of events) {
    if (event.type === "POWER_SLOT_REACHED") {
      dispatchExecutivePower(event);
    }
  }

  room.updatedAt = Date.now();
}

function runSystemLoop(initialRoom: Room, rng: RandomSource = systemRandom): Room {
  let room = initialRoom;

  for (let step = 0; step < 300; step += 1) {
    if (room.game?.phase === "GAME_OVER") {
      return room;
    }

    const action = nextSystemAction(room, rng);
    if (!action) {
      return room;
    }

    const result = applyAction(room, action, rng);
    room = result.room;
    processGameEvents(room, result.events);
  }

  throw new GameInvariantError("BOT_LOOP_OVERFLOW", "System loop exceeded safe iteration cap.");
}

function ensureActorInRoom(room: Room, actorId: string): void {
  if (!getPlayerById(room, actorId)) {
    throw new GameInvariantError("ACTOR_NOT_IN_ROOM", "Actor does not belong to this room.");
  }
}

async function emitPhaseBotChatIfNeeded(params: {
  room: Room;
  previousPhase?: Phase;
  rng?: RandomSource;
}): Promise<void> {
  const nextPhase = params.room.game?.phase;
  if (!nextPhase || params.previousPhase === nextPhase) {
    return;
  }

  try {
    const message = await postBotPhaseMessage({
      room: params.room,
      phase: nextPhase,
      rng: params.rng
    });

    if (!message) {
      return;
    }

    logRoomEvent("chat_message_posted", params.room, {
      senderId: message.senderId,
      senderIsBot: message.senderIsBot,
      phase: nextPhase
    });
  } catch (error) {
    console.error("Failed to emit bot phase chat message", error);
  }
}

export async function createRoomService(
  input: CreateRoomInput,
  rng: RandomSource = systemRandom
): Promise<{ room: RoomProjection; actorId: string }> {
  const requestedRoomSize = input.roomSize;
  assertRoomSize(requestedRoomSize);
  ensureThemeExists(input.themeId);

  const code = await generateUniqueRoomCode(rng);
  const created = createRoom({
    code,
    roomSize: requestedRoomSize,
    themeId: input.themeId,
    hostName: input.hostName
  });

  await writeRoom(created.room);
  logRoomEvent("room_created", created.room, {
    hostId: created.host.id,
    roomSize: created.room.roomSize,
    themeId: created.room.themeId
  });

  return {
    room: {
      room: toPublicRoom(created.room),
      eligible: deriveEligibleActions(created.room, created.host.id),
      actorId: created.host.id,
      viewer: deriveViewerIdentity(created.room, created.host.id),
      viewerPrivate: deriveViewerPrivateState(created.room, created.host.id)
    },
    actorId: created.host.id
  };
}

export async function joinRoomService(
  roomCode: string,
  name: string
): Promise<{ room: RoomProjection; actorId: string }> {
  const room = await getRoomOrThrow(roomCode);
  const joined = joinHumanPlayer(room, name);
  await writeRoom(joined.room);
  logRoomEvent("player_joined", joined.room, {
    actorId: joined.player.id,
    totalPlayers: joined.room.players.length
  });

  return {
    room: {
      room: toPublicRoom(joined.room),
      eligible: deriveEligibleActions(joined.room, joined.player.id),
      actorId: joined.player.id,
      viewer: deriveViewerIdentity(joined.room, joined.player.id),
      viewerPrivate: deriveViewerPrivateState(joined.room, joined.player.id)
    },
    actorId: joined.player.id
  };
}

export async function updateRoomConfigService(params: {
  roomCode: string;
  actorId: string;
  roomSize?: number;
  themeId?: string;
}): Promise<RoomProjection> {
  const room = await getRoomOrThrow(params.roomCode);
  ensureActorInRoom(room, params.actorId);

  if (room.hostId !== params.actorId) {
    throw new GameInvariantError("NOT_HOST", "Only host can update room config.");
  }

  const patch: { roomSize?: RoomSize; themeId?: string } = {};

  if (params.roomSize !== undefined) {
    assertRoomSize(params.roomSize);
    patch.roomSize = params.roomSize;
  }

  if (params.themeId !== undefined) {
    ensureThemeExists(params.themeId);
    patch.themeId = params.themeId;
  }

  const updated = updateRoomConfig(room, patch);
  await writeRoom(updated);
  logRoomEvent("room_config_updated", updated, {
    actorId: params.actorId,
    roomSize: updated.roomSize,
    themeId: updated.themeId
  });

  return {
    room: toPublicRoom(updated),
    eligible: deriveEligibleActions(updated, params.actorId),
    actorId: params.actorId,
    viewer: deriveViewerIdentity(updated, params.actorId),
    viewerPrivate: deriveViewerPrivateState(updated, params.actorId)
  };
}

export async function startRoomService(params: {
  roomCode: string;
  actorId: string;
  rng?: RandomSource;
}): Promise<RoomProjection> {
  const room = await getRoomOrThrow(params.roomCode);
  ensureActorInRoom(room, params.actorId);

  if (room.hostId !== params.actorId) {
    throw new GameInvariantError("NOT_HOST", "Only host can start game.");
  }

  const previousPhase = room.game?.phase;
  const started = startGame(room, params.rng ?? systemRandom);
  const resolved = runSystemLoop(started, params.rng ?? systemRandom);
  await writeRoom(resolved);
  await emitPhaseBotChatIfNeeded({
    room: resolved,
    previousPhase,
    rng: params.rng ?? systemRandom
  });
  logRoomEvent("game_started", resolved, {
    actorId: params.actorId,
    totalPlayers: resolved.players.length,
    botCount: resolved.players.filter((player) => player.isBot).length
  });

  return {
    room: toPublicRoom(resolved),
    eligible: deriveEligibleActions(resolved, params.actorId),
    actorId: params.actorId,
    viewer: deriveViewerIdentity(resolved, params.actorId),
    viewerPrivate: deriveViewerPrivateState(resolved, params.actorId)
  };
}

export async function getRoomStateService(params: {
  roomCode: string;
  actorId?: string;
}): Promise<RoomProjection & { themes: ReturnType<typeof listThemes>; theme: ReturnType<typeof getThemeById> }> {
  const room = await getRoomOrThrow(params.roomCode);

  return {
    room: toPublicRoom(room),
    eligible: deriveEligibleActions(room, params.actorId),
    actorId: params.actorId,
    viewer: deriveViewerIdentity(room, params.actorId),
    viewerPrivate: deriveViewerPrivateState(room, params.actorId),
    themes: listThemes(),
    theme: getThemeById(room.themeId)
  };
}

export async function submitActionService(params: {
  roomCode: string;
  action: GameAction;
  rng?: RandomSource;
}): Promise<RoomProjection> {
  const room = await getRoomOrThrow(params.roomCode);
  ensureActorInRoom(room, params.action.actorId);

  const previousPhase = room.game?.phase;
  const result = applyAction(room, params.action, params.rng ?? systemRandom);
  processGameEvents(result.room, result.events);

  const resolved = runSystemLoop(result.room, params.rng ?? systemRandom);
  await writeRoom(resolved);
  await emitPhaseBotChatIfNeeded({
    room: resolved,
    previousPhase,
    rng: params.rng ?? systemRandom
  });
  logRoomEvent("action_submitted", resolved, {
    actionType: params.action.type,
    actorId: params.action.actorId
  });

  return {
    room: toPublicRoom(resolved),
    eligible: deriveEligibleActions(resolved, params.action.actorId),
    actorId: params.action.actorId,
    viewer: deriveViewerIdentity(resolved, params.action.actorId),
    viewerPrivate: deriveViewerPrivateState(resolved, params.action.actorId)
  };
}
