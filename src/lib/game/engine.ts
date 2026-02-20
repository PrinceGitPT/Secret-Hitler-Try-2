import { cloneRoom } from "@/lib/game/clone";
import {
  clearLastElectedGovernment,
  incrementElectionTracker,
  recordElectedGovernment,
  resetElectionTracker,
  shouldTriggerChaos
} from "@/lib/game/electionTracker";
import { GameInvariantError } from "@/lib/game/errors";
import { createPendingExecutivePower, resolvePendingExecutivePower } from "@/lib/game/executive";
import { getPowerSlot } from "@/lib/game/powers/track";
import { shuffle, systemRandom, type RandomSource } from "@/lib/game/random";
import {
  allVotesSubmitted,
  countVotes,
  getChancellor,
  getEligibleNominees,
  getPlayerById,
  getPlayerBySeat,
  getPresident,
  hasActorVoted,
  nextSeat
} from "@/lib/game/rules";
import { applyGameOver, checkHitlerElectionWin, checkHitlerExecutedWin, checkPolicyWin } from "@/lib/game/win";
import type { GameAction, GameEvent, Policy, Room } from "@/lib/game/types";

function ensureDrawCapacity(room: Room, count: number, rng: RandomSource): void {
  if (!room.game || room.game.drawPile.length >= count) {
    return;
  }

  const game = room.game;
  const combined = [...game.drawPile, ...game.discardPile];
  if (combined.length < count) {
    return;
  }

  game.drawPile = shuffle(combined, rng);
  game.discardPile = [];
}

function drawOnePolicy(room: Room, rng: RandomSource): Policy {
  if (!room.game) {
    throw new GameInvariantError("NO_GAME_STATE", "Game state missing.");
  }

  if (room.game.drawPile.length === 0) {
    if (room.game.discardPile.length === 0) {
      throw new GameInvariantError("DRAW_FAILED", "No policies left in draw or discard piles.");
    }

    room.game.drawPile = shuffle(room.game.discardPile, rng);
    room.game.discardPile = [];
  }

  const card = room.game.drawPile.pop();
  if (!card) {
    throw new GameInvariantError("DRAW_FAILED", "Policy draw failed.");
  }
  return card;
}

function drawPolicies(room: Room, count: number, rng: RandomSource): Policy[] {
  ensureDrawCapacity(room, count, rng);
  return Array.from({ length: count }, () => drawOnePolicy(room, rng));
}

function peekTopPolicies(room: Room, count: number, rng: RandomSource): Policy[] {
  if (!room.game) {
    return [];
  }

  ensureDrawCapacity(room, count, rng);

  const cards: Policy[] = [];
  for (let index = room.game.drawPile.length - 1; index >= 0 && cards.length < count; index -= 1) {
    cards.push(room.game.drawPile[index]);
  }
  return cards;
}

function clearRoundTransientState(room: Room): void {
  if (!room.game) {
    return;
  }

  room.game.chancellorSeat = undefined;
  room.game.pendingVotes = {};
  room.game.legislativeHand = undefined;
  room.game.pendingExecutivePower = undefined;
}

function resolveSeatOverride(room: Room, seat: number, fallbackFromSeat: number): number {
  const candidate = getPlayerBySeat(room, seat);
  if (candidate?.alive) {
    return candidate.seat;
  }

  return nextSeat(room, fallbackFromSeat);
}

function advancePresidencyForNextRound(room: Room): void {
  if (!room.game) {
    return;
  }

  const game = room.game;

  if (game.specialElectionNextPresidentSeat !== undefined) {
    game.presidentSeat = resolveSeatOverride(room, game.specialElectionNextPresidentSeat, game.presidentSeat);
    game.specialElectionNextPresidentSeat = undefined;
    return;
  }

  if (game.specialElectionReturnSeat !== undefined) {
    game.presidentSeat = resolveSeatOverride(room, game.specialElectionReturnSeat, game.presidentSeat);
    game.specialElectionReturnSeat = undefined;
    return;
  }

  game.presidentSeat = nextSeat(room, game.presidentSeat);
}

function finalizeRoundAfterVoteFailure(room: Room): void {
  if (!room.game) {
    return;
  }

  clearRoundTransientState(room);
  room.game.phase = "NOMINATION";
  advancePresidencyForNextRound(room);
}

function finalizeRoundAfterEnactment(room: Room): void {
  if (!room.game) {
    return;
  }

  clearRoundTransientState(room);
  room.game.phase = "NOMINATION";
  advancePresidencyForNextRound(room);
}

function enactPolicy(
  room: Room,
  policy: Policy,
  events: GameEvent[],
  rng: RandomSource,
  options: { ignoreExecutivePower?: boolean } = {}
): void {
  if (!room.game) {
    return;
  }

  const game = room.game;
  game.lastEnactedPolicy = policy;
  game.enactmentSequence += 1;

  if (policy === "LIBERAL") {
    game.liberalEnacted += 1;
  } else {
    game.fascistEnacted += 1;
  }

  events.push({
    type: "POLICY_ENACTED",
    policy,
    liberalEnacted: game.liberalEnacted,
    fascistEnacted: game.fascistEnacted
  });

  const winner = checkPolicyWin(game);
  if (winner) {
    applyGameOver(game, winner);
    return;
  }

  if (policy !== "FASCIST" || options.ignoreExecutivePower) {
    return;
  }

  const slot = getPowerSlot(room.roomSize, game.fascistEnacted);
  if (!slot) {
    return;
  }

  events.push({
    type: "POWER_SLOT_REACHED",
    roomSize: room.roomSize,
    fascistCount: slot.fascistCount,
    power: slot.power
  });

  const pending = createPendingExecutivePower({
    power: slot.power,
    sourceFascistCount: slot.fascistCount,
    presidentSeat: game.presidentSeat,
    policyPeekCards: slot.power === "POLICY_PEEK" ? peekTopPolicies(room, 3, rng) : undefined
  });

  if (!pending) {
    return;
  }

  game.pendingExecutivePower = pending;
  game.phase = "EXECUTIVE_ACTION";
}

function resolveChaosTopDeck(room: Room, events: GameEvent[], rng: RandomSource): void {
  if (!room.game) {
    return;
  }

  const game = room.game;
  const topDeckPolicy = drawOnePolicy(room, rng);
  enactPolicy(room, topDeckPolicy, events, rng, { ignoreExecutivePower: true });

  resetElectionTracker(game);
  clearLastElectedGovernment(game);

  if (game.phase !== "GAME_OVER") {
    finalizeRoundAfterVoteFailure(room);
  } else {
    clearRoundTransientState(room);
  }
}

function processFailedElection(room: Room, events: GameEvent[], rng: RandomSource): void {
  if (!room.game) {
    return;
  }

  const game = room.game;
  incrementElectionTracker(game);

  if (shouldTriggerChaos(game)) {
    resolveChaosTopDeck(room, events, rng);
    return;
  }

  finalizeRoundAfterVoteFailure(room);
}

export function applyAction(
  room: Room,
  action: GameAction,
  rng: RandomSource = systemRandom
): { room: Room; events: GameEvent[] } {
  const nextRoom = cloneRoom(room);
  const events: GameEvent[] = [];

  if (!nextRoom.game) {
    throw new GameInvariantError("NO_GAME_STATE", "Cannot apply game action before game start.");
  }

  const { game } = nextRoom;

  if (game.phase === "GAME_OVER") {
    throw new GameInvariantError("GAME_OVER", "Game is already over.");
  }

  switch (action.type) {
    case "NOMINATE_CHANCELLOR": {
      if (game.phase !== "NOMINATION") {
        throw new GameInvariantError("INVALID_PHASE", "Nomination is only allowed during NOMINATION phase.");
      }

      const president = getPresident(nextRoom);
      if (!president || president.id !== action.actorId) {
        throw new GameInvariantError("NOT_PRESIDENT", "Only the current president can nominate.");
      }

      if (!president.alive) {
        throw new GameInvariantError("NOT_ALIVE", "Dead players cannot nominate.");
      }

      const nominee = getPlayerById(nextRoom, action.nomineeId);
      if (!nominee) {
        throw new GameInvariantError("UNKNOWN_NOMINEE", "Nominee does not exist.");
      }

      if (!nominee.alive) {
        throw new GameInvariantError("NOT_ALIVE", "Dead players cannot be nominated.");
      }

      const eligibleNomineeIds = new Set(getEligibleNominees(nextRoom).map((player) => player.id));
      if (!eligibleNomineeIds.has(action.nomineeId)) {
        throw new GameInvariantError("INELIGIBLE_NOMINEE", "Nominee is not eligible.");
      }

      game.chancellorSeat = nominee.seat;
      game.pendingVotes = {};
      game.phase = "VOTING";
      break;
    }

    case "CAST_VOTE": {
      if (game.phase !== "VOTING") {
        throw new GameInvariantError("INVALID_PHASE", "Voting is only allowed during VOTING phase.");
      }

      const voter = getPlayerById(nextRoom, action.actorId);
      if (!voter) {
        throw new GameInvariantError("UNKNOWN_VOTER", "Voter does not exist.");
      }

      if (!voter.alive) {
        throw new GameInvariantError("NOT_ALIVE", "Dead players cannot vote.");
      }

      if (hasActorVoted(game, action.actorId)) {
        throw new GameInvariantError("ALREADY_VOTED", "Voter already submitted a vote.");
      }

      game.pendingVotes[action.actorId] = action.vote;

      if (allVotesSubmitted(nextRoom)) {
        const tally = countVotes(game.pendingVotes);
        if (tally.ja > tally.nein) {
          recordElectedGovernment(game);

          const hitlerElectionWin = checkHitlerElectionWin(nextRoom);
          if (hitlerElectionWin) {
            applyGameOver(game, hitlerElectionWin);
            break;
          }

          game.phase = "LEGISLATIVE_PRESIDENT";
          game.pendingVotes = {};
          game.legislativeHand = drawPolicies(nextRoom, 3, rng);
        } else {
          processFailedElection(nextRoom, events, rng);
        }
      }

      break;
    }

    case "LEGISLATIVE_DISCARD": {
      if (game.phase !== "LEGISLATIVE_PRESIDENT") {
        throw new GameInvariantError(
          "INVALID_PHASE",
          "President discard is only allowed during LEGISLATIVE_PRESIDENT phase."
        );
      }

      const president = getPresident(nextRoom);
      if (!president || president.id !== action.actorId) {
        throw new GameInvariantError("NOT_PRESIDENT", "Only the current president can discard first.");
      }

      if (!president.alive) {
        throw new GameInvariantError("NOT_ALIVE", "Dead players cannot discard policies.");
      }

      if (!game.legislativeHand || game.legislativeHand.length !== 3) {
        throw new GameInvariantError("INVALID_HAND", "President legislative hand is invalid.");
      }

      if (action.cardIndex < 0 || action.cardIndex > game.legislativeHand.length - 1) {
        throw new GameInvariantError("INVALID_CARD_INDEX", "President discard index is invalid.");
      }

      const discardedCard = game.legislativeHand[action.cardIndex];
      const remainingCards = game.legislativeHand.filter((_, index) => index !== action.cardIndex);
      game.discardPile.push(discardedCard);
      game.legislativeHand = remainingCards;
      game.phase = "LEGISLATIVE_CHANCELLOR";
      break;
    }

    case "CHANCELLOR_DISCARD": {
      if (game.phase !== "LEGISLATIVE_CHANCELLOR") {
        throw new GameInvariantError(
          "INVALID_PHASE",
          "Chancellor discard is only allowed during LEGISLATIVE_CHANCELLOR phase."
        );
      }

      const chancellor = getChancellor(nextRoom);
      if (!chancellor || chancellor.id !== action.actorId) {
        throw new GameInvariantError("NOT_CHANCELLOR", "Only the nominated chancellor can discard second.");
      }

      if (!chancellor.alive) {
        throw new GameInvariantError("NOT_ALIVE", "Dead players cannot discard policies.");
      }

      if (!game.legislativeHand || game.legislativeHand.length !== 2) {
        throw new GameInvariantError("INVALID_HAND", "Chancellor legislative hand is invalid.");
      }

      if (action.cardIndex < 0 || action.cardIndex > game.legislativeHand.length - 1) {
        throw new GameInvariantError("INVALID_CARD_INDEX", "Chancellor discard index is invalid.");
      }

      const discardedCard = game.legislativeHand[action.cardIndex];
      const remainingCards = game.legislativeHand.filter((_, index) => index !== action.cardIndex);
      const enactedCard = remainingCards[0];
      if (!enactedCard) {
        throw new GameInvariantError("INVALID_HAND", "No policy remained to enact.");
      }

      game.discardPile.push(discardedCard);
      enactPolicy(nextRoom, enactedCard, events, rng);

      const phaseAfterEnactment = nextRoom.game?.phase;
      if (phaseAfterEnactment === "GAME_OVER" || phaseAfterEnactment === "EXECUTIVE_ACTION") {
        break;
      }

      finalizeRoundAfterEnactment(nextRoom);
      break;
    }

    case "RESOLVE_EXECUTIVE_POWER": {
      if (game.phase !== "EXECUTIVE_ACTION") {
        throw new GameInvariantError(
          "INVALID_PHASE",
          "Executive power resolution is only allowed during EXECUTIVE_ACTION phase."
        );
      }

      const result = resolvePendingExecutivePower(nextRoom, action.actorId, action.resolution);

      if (result.executedTargetId) {
        const hitlerExecutedWin = checkHitlerExecutedWin(nextRoom, result.executedTargetId);
        if (hitlerExecutedWin) {
          applyGameOver(game, hitlerExecutedWin);
          break;
        }
      }

      finalizeRoundAfterEnactment(nextRoom);
      break;
    }

    default: {
      const exhaustiveCheck: never = action;
      throw new GameInvariantError("UNKNOWN_ACTION", `Unknown action: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }

  nextRoom.updatedAt = Date.now();
  nextRoom.version += 1;
  return { room: nextRoom, events };
}
