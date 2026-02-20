import {
  getChancellor,
  getEligibleExecutionTargets,
  getEligibleNominees,
  getPlayerById,
  getPresident,
  hasActorVoted
} from "@/lib/game/rules";
import type {
  EligibleActions,
  KnownFactionMember,
  PublicPlayer,
  PublicRoom,
  Role,
  Room,
  ViewerIdentity
} from "@/lib/game/types";

function toPublicPlayers(room: Room): PublicPlayer[] {
  return room.players
    .map((player) => ({
      id: player.id,
      name: player.name,
      isBot: player.isBot,
      botColor: player.botColor,
      seat: player.seat,
      connected: player.connected,
      alive: player.alive ?? true,
      isHost: player.id === room.hostId
    }))
    .sort((a, b) => a.seat - b.seat);
}

export function deriveEligibleActions(room: Room, actorId?: string): EligibleActions {
  const actor = actorId ? getPlayerById(room, actorId) : undefined;
  const game = room.game;

  if (!actor || !game) {
    return {
      canStart: actor?.id === room.hostId && !room.locked,
      canUpdateConfig: actor?.id === room.hostId && !room.locked,
      canNominate: false,
      eligibleNomineeIds: [],
      canVote: false,
      hasVoted: false,
      canPresidentDiscard: false,
      canChancellorDiscard: false,
      canResolveExecutivePower: false,
      eligibleExecutiveTargets: []
    };
  }

  if (game.phase === "GAME_OVER") {
    return {
      canStart: false,
      canUpdateConfig: false,
      canNominate: false,
      eligibleNomineeIds: [],
      canVote: false,
      hasVoted: false,
      canPresidentDiscard: false,
      canChancellorDiscard: false,
      canResolveExecutivePower: false,
      eligibleExecutiveTargets: []
    };
  }

  const president = getPresident(room);
  const chancellor = getChancellor(room);
  const isAlive = actor.alive !== false;
  const canNominate =
    game.phase === "NOMINATION" &&
    president?.id === actor.id &&
    !actor.isBot &&
    isAlive &&
    getEligibleNominees(room).length > 0;
  const canVote = game.phase === "VOTING" && !actor.isBot && isAlive && !hasActorVoted(game, actor.id);
  const canPresidentDiscard =
    game.phase === "LEGISLATIVE_PRESIDENT" &&
    president?.id === actor.id &&
    !actor.isBot &&
    isAlive &&
    game.legislativeHand?.length === 3;
  const canChancellorDiscard =
    game.phase === "LEGISLATIVE_CHANCELLOR" &&
    chancellor?.id === actor.id &&
    !actor.isBot &&
    isAlive &&
    game.legislativeHand?.length === 2;
  const canResolveExecutivePower =
    game.phase === "EXECUTIVE_ACTION" &&
    Boolean(game.pendingExecutivePower) &&
    president?.id === actor.id &&
    !actor.isBot &&
    isAlive;
  const eligibleExecutiveTargets =
    canResolveExecutivePower && game.pendingExecutivePower?.power === "EXECUTION"
      ? getEligibleExecutionTargets(room).map((player) => player.id)
      : [];

  return {
    canStart: actor.id === room.hostId && !room.locked,
    canUpdateConfig: actor.id === room.hostId && !room.locked,
    canNominate,
    eligibleNomineeIds: canNominate ? getEligibleNominees(room).map((player) => player.id) : [],
    canVote,
    hasVoted: hasActorVoted(game, actor.id),
    canPresidentDiscard,
    canChancellorDiscard,
    canResolveExecutivePower,
    eligibleExecutiveTargets
  };
}

export function toPublicRoom(room: Room): PublicRoom {
  return {
    code: room.code,
    roomSize: room.roomSize,
    themeId: room.themeId,
    players: toPublicPlayers(room),
    hostId: room.hostId,
    locked: room.locked,
    game: room.game,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    version: room.version
  };
}

function roleToTeam(role: Role): "LIBERAL" | "FASCIST" {
  return role === "LIBERAL" ? "LIBERAL" : "FASCIST";
}

function knownFactionMembersForActor(room: Room, actorId: string): KnownFactionMember[] {
  const actor = getPlayerById(room, actorId);
  if (!actor) {
    return [];
  }

  if (actor.role === "LIBERAL") {
    return [];
  }

  if (actor.role === "FASCIST") {
    return room.players
      .filter(
        (player) =>
          player.id !== actor.id &&
          (player.role === "FASCIST" || player.role === "HITLER")
      )
      .map<KnownFactionMember>((player) => {
        const role: KnownFactionMember["role"] = player.role === "HITLER" ? "HITLER" : "FASCIST";
        return {
          id: player.id,
          name: player.name,
          role
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  const hitlerKnowsFascists = room.roomSize <= 6;
  if (!hitlerKnowsFascists) {
    return [];
  }

  return room.players
    .filter((player) => player.role === "FASCIST")
    .map<KnownFactionMember>((player) => ({
      id: player.id,
      name: player.name,
      role: "FASCIST"
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function deriveViewerIdentity(room: Room, actorId?: string): ViewerIdentity | undefined {
  if (!actorId || !room.game || !room.locked) {
    return undefined;
  }

  const actor = getPlayerById(room, actorId);
  if (!actor) {
    return undefined;
  }

  return {
    role: actor.role,
    team: roleToTeam(actor.role),
    isHitler: actor.role === "HITLER",
    knownFactionMembers: knownFactionMembersForActor(room, actor.id)
  };
}
