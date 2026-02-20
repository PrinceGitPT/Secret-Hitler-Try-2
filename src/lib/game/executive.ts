import { GameInvariantError } from "@/lib/game/errors";
import { chooseUniform, systemRandom, type RandomSource } from "@/lib/game/random";
import {
  getEligibleExecutionTargets,
  getEligibleInvestigateTargets,
  getEligibleSpecialElectionCandidates,
  getPlayerById,
  getPlayerBySeat,
  getPresident,
  nextSeat
} from "@/lib/game/rules";
import type {
  ExecutiveIntelEntry,
  ExecutivePower,
  ExecutiveResolution,
  PendingExecutivePower,
  Player,
  Policy,
  Role,
  Room,
  Team
} from "@/lib/game/types";

interface ResolvePendingPowerResult {
  executedTargetId?: string;
}

function assertMatchesPendingPower(pendingPower: ExecutivePower, resolution: ExecutiveResolution): void {
  switch (pendingPower) {
    case "EXECUTION": {
      if (resolution.kind !== "EXECUTION") {
        throw new GameInvariantError("INVALID_EXECUTIVE_RESOLUTION", "Execution power requires EXECUTION resolution.");
      }
      break;
    }
    case "INVESTIGATE_LOYALTY": {
      if (resolution.kind !== "INVESTIGATE_LOYALTY") {
        throw new GameInvariantError(
          "INVALID_EXECUTIVE_RESOLUTION",
          "Investigate loyalty power requires INVESTIGATE_LOYALTY resolution."
        );
      }
      break;
    }
    case "SPECIAL_ELECTION": {
      if (resolution.kind !== "SPECIAL_ELECTION") {
        throw new GameInvariantError(
          "INVALID_EXECUTIVE_RESOLUTION",
          "Special election power requires SPECIAL_ELECTION resolution."
        );
      }
      break;
    }
    case "POLICY_PEEK": {
      if (resolution.kind !== "POLICY_PEEK") {
        throw new GameInvariantError("INVALID_EXECUTIVE_RESOLUTION", "Policy peek power requires POLICY_PEEK resolution.");
      }
      break;
    }
    case "NONE": {
      throw new GameInvariantError("INVALID_EXECUTIVE_RESOLUTION", "No executive resolution is needed for NONE power.");
    }
    default: {
      const exhaustiveCheck: never = pendingPower;
      throw new GameInvariantError("INVALID_EXECUTIVE_RESOLUTION", `Unknown executive power ${exhaustiveCheck}`);
    }
  }
}

function validateResolveActor(room: Room, actorId: string): Player {
  const game = room.game;
  if (!game || !game.pendingExecutivePower) {
    throw new GameInvariantError("NO_PENDING_EXECUTIVE_POWER", "No executive power is pending.");
  }

  const president = getPresident(room);
  if (!president || president.id !== actorId) {
    throw new GameInvariantError("NOT_PRESIDENT", "Only the current president can resolve executive power.");
  }

  if (!president.alive) {
    throw new GameInvariantError("NOT_ALIVE", "Dead players cannot resolve executive power.");
  }

  return president;
}

function roleToPartyMembership(role: Role): Team {
  return role === "LIBERAL" ? "LIBERAL" : "FASCIST";
}

function appendIntelEntry(room: Room, actorId: string, entry: Omit<ExecutiveIntelEntry, "id" | "createdAt">): void {
  if (!room.game) {
    return;
  }

  const list = room.game.executiveIntelLogByPlayer[actorId] ?? [];
  const nextEntry: ExecutiveIntelEntry = {
    id: `intel_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    createdAt: Date.now(),
    ...entry
  };

  room.game.executiveIntelLogByPlayer[actorId] = [...list, nextEntry];
}

function validateInvestigateTarget(room: Room, actorId: string, targetId: string): Player {
  const eligibleTargetIds = new Set(getEligibleInvestigateTargets(room, actorId).map((player) => player.id));
  if (!eligibleTargetIds.has(targetId)) {
    throw new GameInvariantError("INVALID_EXECUTION_TARGET", "Investigate target must be alive and cannot be self.");
  }

  const target = getPlayerById(room, targetId);
  if (!target) {
    throw new GameInvariantError("INVALID_EXECUTION_TARGET", "Investigate target does not exist.");
  }

  return target;
}

function validateSpecialElectionSeat(room: Room, actorId: string, presidentSeat: number): Player {
  const eligibleSeats = new Set(
    getEligibleSpecialElectionCandidates(room, actorId)
      .map((player) => player.seat)
  );

  if (!eligibleSeats.has(presidentSeat)) {
    throw new GameInvariantError(
      "INVALID_EXECUTION_TARGET",
      "Special election seat must belong to another alive player."
    );
  }

  const target = getPlayerBySeat(room, presidentSeat);
  if (!target) {
    throw new GameInvariantError("INVALID_EXECUTION_TARGET", "Special election seat does not exist.");
  }

  return target;
}

export function createPendingExecutivePower(params: {
  power: ExecutivePower;
  sourceFascistCount: number;
  presidentSeat: number;
  policyPeekCards?: Policy[];
}): PendingExecutivePower | undefined {
  if (params.power === "NONE") {
    return undefined;
  }

  return {
    power: params.power,
    sourceFascistCount: params.sourceFascistCount,
    presidentSeat: params.presidentSeat,
    policyPeekCards: params.policyPeekCards
  };
}

export function resolvePendingExecutivePower(
  room: Room,
  actorId: string,
  resolution: ExecutiveResolution
): ResolvePendingPowerResult {
  const game = room.game;
  if (!game || !game.pendingExecutivePower) {
    throw new GameInvariantError("NO_PENDING_EXECUTIVE_POWER", "No executive power is pending.");
  }

  const actor = validateResolveActor(room, actorId);
  const pending = game.pendingExecutivePower;
  assertMatchesPendingPower(pending.power, resolution);

  switch (resolution.kind) {
    case "EXECUTION": {
      const eligibleTargets = new Set(getEligibleExecutionTargets(room).map((player) => player.id));
      if (!eligibleTargets.has(resolution.targetId)) {
        throw new GameInvariantError("INVALID_EXECUTION_TARGET", "Execution target is not eligible.");
      }

      const target = getPlayerById(room, resolution.targetId);
      if (!target) {
        throw new GameInvariantError("INVALID_EXECUTION_TARGET", "Execution target does not exist.");
      }

      target.alive = false;
      appendIntelEntry(room, actor.id, {
        power: "EXECUTION",
        summary: `Executed ${target.name} (Seat ${target.seat}).`
      });
      game.pendingExecutivePower = undefined;
      return { executedTargetId: target.id };
    }

    case "INVESTIGATE_LOYALTY": {
      const target = validateInvestigateTarget(room, actor.id, resolution.targetId);
      const partyMembership = roleToPartyMembership(target.role);
      appendIntelEntry(room, actor.id, {
        power: "INVESTIGATE_LOYALTY",
        summary: `Investigated ${target.name}: ${partyMembership} party.`
      });
      game.pendingExecutivePower = undefined;
      return {};
    }

    case "SPECIAL_ELECTION": {
      const target = validateSpecialElectionSeat(room, actor.id, resolution.presidentSeat);
      game.specialElectionNextPresidentSeat = target.seat;
      game.specialElectionReturnSeat = nextSeat(room, actor.seat);
      appendIntelEntry(room, actor.id, {
        power: "SPECIAL_ELECTION",
        summary: `Selected ${target.name} (Seat ${target.seat}) as next president.`
      });
      game.pendingExecutivePower = undefined;
      return {};
    }

    case "POLICY_PEEK": {
      const cards = pending.policyPeekCards;
      if (!cards || cards.length === 0) {
        throw new GameInvariantError("INVALID_EXECUTIVE_RESOLUTION", "No policy peek cards are available to acknowledge.");
      }

      appendIntelEntry(room, actor.id, {
        power: "POLICY_PEEK",
        summary: `Peeked top policies: ${cards.join(", ")}.`
      });
      game.pendingExecutivePower = undefined;
      return {};
    }

    default: {
      const exhaustiveCheck: never = resolution;
      throw new GameInvariantError(
        "INVALID_EXECUTIVE_RESOLUTION",
        `Unknown executive resolution ${JSON.stringify(exhaustiveCheck)}`
      );
    }
  }
}

export function buildAutoExecutiveResolution(
  room: Room,
  pendingPower: PendingExecutivePower,
  rng: RandomSource = systemRandom
): ExecutiveResolution {
  const president = getPresident(room);
  if (!president) {
    throw new GameInvariantError("NOT_PRESIDENT", "No current president available for executive resolution.");
  }

  switch (pendingPower.power) {
    case "EXECUTION": {
      const eligible = getEligibleExecutionTargets(room);
      if (eligible.length === 0) {
        throw new GameInvariantError("INVALID_EXECUTION_TARGET", "No eligible execution targets available.");
      }
      return {
        kind: "EXECUTION",
        targetId: chooseUniform(eligible, rng).id
      };
    }

    case "INVESTIGATE_LOYALTY": {
      const candidates = getEligibleInvestigateTargets(room, president.id);
      if (candidates.length === 0) {
        throw new GameInvariantError("INVALID_EXECUTION_TARGET", "No investigate targets available.");
      }
      return {
        kind: "INVESTIGATE_LOYALTY",
        targetId: chooseUniform(candidates, rng).id
      };
    }

    case "SPECIAL_ELECTION": {
      const candidates = getEligibleSpecialElectionCandidates(room, president.id);
      if (candidates.length === 0) {
        throw new GameInvariantError("INVALID_EXECUTION_TARGET", "No special election candidates available.");
      }
      return {
        kind: "SPECIAL_ELECTION",
        presidentSeat: chooseUniform(candidates, rng).seat
      };
    }

    case "POLICY_PEEK": {
      return {
        kind: "POLICY_PEEK"
      };
    }

    case "NONE": {
      throw new GameInvariantError("INVALID_EXECUTIVE_RESOLUTION", "Cannot build resolution for NONE power.");
    }

    default: {
      const exhaustiveCheck: never = pendingPower.power;
      throw new GameInvariantError("INVALID_EXECUTIVE_RESOLUTION", `Unknown executive power ${exhaustiveCheck}`);
    }
  }
}
