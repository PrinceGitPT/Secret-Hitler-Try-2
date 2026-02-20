import { GameInvariantError } from "@/lib/game/errors";
import { chooseUniform, systemRandom, type RandomSource } from "@/lib/game/random";
import { getEligibleExecutionTargets, getPlayerById, getPresident, getPlayerBySeat } from "@/lib/game/rules";
import type {
  ExecutivePower,
  ExecutiveResolution,
  PendingExecutivePower,
  Player,
  Room
} from "@/lib/game/types";

function alivePlayers(room: Room): Player[] {
  return room.players.filter((player) => player.alive);
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

function validateInvestigateTarget(room: Room, targetId: string): void {
  const target = getPlayerById(room, targetId);
  if (!target || !target.alive) {
    throw new GameInvariantError("INVALID_EXECUTION_TARGET", "Executive target must be an alive player.");
  }
}

function validateSpecialElectionSeat(room: Room, presidentSeat: number): void {
  const target = getPlayerBySeat(room, presidentSeat);
  if (!target || !target.alive) {
    throw new GameInvariantError("INVALID_EXECUTION_TARGET", "Special election seat must belong to an alive player.");
  }
}

export function createPendingExecutivePower(params: {
  power: ExecutivePower;
  sourceFascistCount: number;
  presidentSeat: number;
}): PendingExecutivePower | undefined {
  if (params.power === "NONE") {
    return undefined;
  }

  return {
    power: params.power,
    sourceFascistCount: params.sourceFascistCount,
    presidentSeat: params.presidentSeat
  };
}

export function resolvePendingExecutivePower(
  room: Room,
  actorId: string,
  resolution: ExecutiveResolution
): { executedTargetId?: string } {
  const game = room.game;
  if (!game || !game.pendingExecutivePower) {
    throw new GameInvariantError("NO_PENDING_EXECUTIVE_POWER", "No executive power is pending.");
  }

  validateResolveActor(room, actorId);
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
      game.pendingExecutivePower = undefined;
      return { executedTargetId: target.id };
    }

    case "INVESTIGATE_LOYALTY": {
      validateInvestigateTarget(room, resolution.targetId);
      game.pendingExecutivePower = undefined;
      return {};
    }

    case "SPECIAL_ELECTION": {
      validateSpecialElectionSeat(room, resolution.presidentSeat);
      game.pendingExecutivePower = undefined;
      return {};
    }

    case "POLICY_PEEK": {
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

function chooseAliveTarget(room: Room, rng: RandomSource = systemRandom): Player {
  const alive = alivePlayers(room);
  if (alive.length === 0) {
    throw new GameInvariantError("INVALID_EXECUTION_TARGET", "No alive players available for executive resolution.");
  }
  return chooseUniform(alive, rng);
}

export function buildAutoExecutiveResolution(
  room: Room,
  pendingPower: PendingExecutivePower,
  rng: RandomSource = systemRandom
): ExecutiveResolution {
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
      const president = getPresident(room);
      const pool = alivePlayers(room).filter((player) => player.id !== president?.id);
      const target = pool.length > 0 ? chooseUniform(pool, rng) : chooseAliveTarget(room, rng);
      return {
        kind: "INVESTIGATE_LOYALTY",
        targetId: target.id
      };
    }

    case "SPECIAL_ELECTION": {
      const target = chooseAliveTarget(room, rng);
      return {
        kind: "SPECIAL_ELECTION",
        presidentSeat: target.seat
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
