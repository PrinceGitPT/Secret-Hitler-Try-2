import { cloneRoom } from "@/lib/game/clone";
import { GameInvariantError } from "@/lib/game/errors";
import { getPowerSlot } from "@/lib/game/powers/track";
import { shuffle, systemRandom, type RandomSource } from "@/lib/game/random";
import {
  allVotesSubmitted,
  countVotes,
  getChancellor,
  getEligibleNominees,
  getPlayerById,
  getPresident,
  hasActorVoted,
  nextSeat
} from "@/lib/game/rules";
import type { GameAction, GameEvent, Policy, Room } from "@/lib/game/types";

const FULL_POLICY_SET: Policy[] = [
  ...Array.from({ length: 6 }, () => "LIBERAL" as const),
  ...Array.from({ length: 11 }, () => "FASCIST" as const)
];

function drawOnePolicy(room: Room, rng: RandomSource): Policy {
  if (!room.game) {
    throw new GameInvariantError("NO_GAME_STATE", "Game state missing.");
  }

  if (room.game.drawPile.length === 0) {
    if (room.game.discardPile.length === 0) {
      // Win conditions are intentionally deferred in MVP. Reset policy cycle when exhausted.
      room.game.drawPile = shuffle(FULL_POLICY_SET, rng);
    } else {
      room.game.drawPile = shuffle(room.game.discardPile, rng);
      room.game.discardPile = [];
    }
  }

  const card = room.game.drawPile.pop();
  if (!card) {
    throw new GameInvariantError("DRAW_FAILED", "Policy draw failed.");
  }
  return card;
}

function drawPolicies(room: Room, count: number, rng: RandomSource): Policy[] {
  return Array.from({ length: count }, () => drawOnePolicy(room, rng));
}

function finalizeRoundAfterVoteFailure(room: Room): void {
  if (!room.game) {
    return;
  }
  room.game.phase = "NOMINATION";
  room.game.chancellorSeat = undefined;
  room.game.pendingVotes = {};
  room.game.legislativeHand = undefined;
  room.game.presidentSeat = nextSeat(room, room.game.presidentSeat);
}

function finalizeRoundAfterEnactment(room: Room): void {
  if (!room.game) {
    return;
  }
  room.game.phase = "NOMINATION";
  room.game.chancellorSeat = undefined;
  room.game.pendingVotes = {};
  room.game.legislativeHand = undefined;
  room.game.presidentSeat = nextSeat(room, room.game.presidentSeat);
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

  switch (action.type) {
    case "NOMINATE_CHANCELLOR": {
      if (game.phase !== "NOMINATION") {
        throw new GameInvariantError("INVALID_PHASE", "Nomination is only allowed during NOMINATION phase.");
      }

      const president = getPresident(nextRoom);
      if (!president || president.id !== action.actorId) {
        throw new GameInvariantError("NOT_PRESIDENT", "Only the current president can nominate.");
      }

      const nominee = getPlayerById(nextRoom, action.nomineeId);
      if (!nominee) {
        throw new GameInvariantError("UNKNOWN_NOMINEE", "Nominee does not exist.");
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

      if (hasActorVoted(game, action.actorId)) {
        throw new GameInvariantError("ALREADY_VOTED", "Voter already submitted a vote.");
      }

      game.pendingVotes[action.actorId] = action.vote;

      if (allVotesSubmitted(nextRoom)) {
        const tally = countVotes(game.pendingVotes);
        if (tally.ja > tally.nein) {
          game.phase = "LEGISLATIVE_PRESIDENT";
          game.pendingVotes = {};
          game.legislativeHand = drawPolicies(nextRoom, 3, rng);
        } else {
          finalizeRoundAfterVoteFailure(nextRoom);
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
      game.lastEnactedPolicy = enactedCard;
      game.enactmentSequence += 1;

      if (enactedCard === "LIBERAL") {
        game.liberalEnacted += 1;
      } else {
        game.fascistEnacted += 1;
      }

      events.push({
        type: "POLICY_ENACTED",
        policy: enactedCard,
        liberalEnacted: game.liberalEnacted,
        fascistEnacted: game.fascistEnacted
      });

      if (enactedCard === "FASCIST") {
        const slot = getPowerSlot(nextRoom.roomSize, game.fascistEnacted);
        if (slot) {
          events.push({
            type: "POWER_SLOT_REACHED",
            roomSize: nextRoom.roomSize,
            fascistCount: slot.fascistCount,
            power: slot.power
          });
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
