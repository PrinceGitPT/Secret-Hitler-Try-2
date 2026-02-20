import {
  getChancellor,
  getEligibleExecutionTargets,
  getEligibleInvestigateTargets,
  getEligibleNominees,
  getEligibleSpecialElectionCandidates,
  getPlayerById,
  getPresident,
  hasActorVoted
} from "@/lib/game/rules";
import type {
  EligibleActions,
  KnownFactionMember,
  PublicGameState,
  PublicPlayer,
  PublicPendingExecutivePower,
  PublicRoom,
  Role,
  Room,
  ViewerIdentity,
  ViewerPrivateState
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

function toPublicPendingExecutivePower(room: Room): PublicPendingExecutivePower | undefined {
  const pending = room.game?.pendingExecutivePower;
  if (!pending) {
    return undefined;
  }

  return {
    power: pending.power,
    sourceFascistCount: pending.sourceFascistCount,
    presidentSeat: pending.presidentSeat
  };
}

function toPublicGame(room: Room): PublicGameState | undefined {
  if (!room.game) {
    return undefined;
  }

  return {
    phase: room.game.phase,
    presidentSeat: room.game.presidentSeat,
    chancellorSeat: room.game.chancellorSeat,
    liberalEnacted: room.game.liberalEnacted,
    fascistEnacted: room.game.fascistEnacted,
    electionTracker: room.game.electionTracker,
    pendingVotesCount: Object.keys(room.game.pendingVotes).length,
    drawPileCount: room.game.drawPile.length,
    discardPileCount: room.game.discardPile.length,
    pendingExecutivePower: toPublicPendingExecutivePower(room),
    lastEnactedPolicy: room.game.lastEnactedPolicy,
    enactmentSequence: room.game.enactmentSequence,
    winner: room.game.winner,
    winReason: room.game.winReason
  };
}

function noActions(canStart = false, canUpdateConfig = false): EligibleActions {
  return {
    canStart,
    canUpdateConfig,
    canNominate: false,
    eligibleNomineeIds: [],
    canVote: false,
    hasVoted: false,
    canPresidentDiscard: false,
    canChancellorDiscard: false,
    canResolveExecutivePower: false,
    eligibleExecutiveTargets: [],
    eligibleInvestigateTargetIds: [],
    eligibleSpecialElectionSeatNumbers: [],
    canAcknowledgePolicyPeek: false
  };
}

export function deriveEligibleActions(room: Room, actorId?: string): EligibleActions {
  const actor = actorId ? getPlayerById(room, actorId) : undefined;
  const game = room.game;

  if (!actor || !game) {
    return noActions(actor?.id === room.hostId && !room.locked, actor?.id === room.hostId && !room.locked);
  }

  if (game.phase === "GAME_OVER") {
    return noActions(false, false);
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

  const pendingPower = canResolveExecutivePower ? game.pendingExecutivePower?.power : undefined;

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
    eligibleExecutiveTargets:
      pendingPower === "EXECUTION" ? getEligibleExecutionTargets(room).map((player) => player.id) : [],
    eligibleInvestigateTargetIds:
      pendingPower === "INVESTIGATE_LOYALTY"
        ? getEligibleInvestigateTargets(room, actor.id).map((player) => player.id)
        : [],
    eligibleSpecialElectionSeatNumbers:
      pendingPower === "SPECIAL_ELECTION"
        ? getEligibleSpecialElectionCandidates(room, actor.id).map((player) => player.seat)
        : [],
    canAcknowledgePolicyPeek: pendingPower === "POLICY_PEEK"
  };
}

export function deriveViewerPrivateState(room: Room, actorId?: string): ViewerPrivateState | undefined {
  if (!room.game || !actorId) {
    return undefined;
  }

  const actor = getPlayerById(room, actorId);
  if (!actor) {
    return undefined;
  }

  const game = room.game;
  const president = getPresident(room);
  const chancellor = getChancellor(room);

  const canSeePresidentialHand =
    game.phase === "LEGISLATIVE_PRESIDENT" && president?.id === actor.id && game.legislativeHand?.length === 3;
  const canSeeChancellorHand =
    game.phase === "LEGISLATIVE_CHANCELLOR" && chancellor?.id === actor.id && game.legislativeHand?.length === 2;

  const legislativeHand = canSeePresidentialHand || canSeeChancellorHand ? [...(game.legislativeHand ?? [])] : undefined;

  const activePolicyPeekCards =
    game.phase === "EXECUTIVE_ACTION" &&
    game.pendingExecutivePower?.power === "POLICY_PEEK" &&
    president?.id === actor.id
      ? [...(game.pendingExecutivePower.policyPeekCards ?? [])]
      : undefined;

  return {
    legislativeHand,
    activePolicyPeekCards,
    executiveIntelLog: [...(game.executiveIntelLogByPlayer[actor.id] ?? [])]
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
    game: toPublicGame(room),
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
      .filter((player) => player.id !== actor.id && (player.role === "FASCIST" || player.role === "HITLER"))
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
