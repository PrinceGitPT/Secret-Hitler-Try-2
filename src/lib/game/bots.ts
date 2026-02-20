import { GameInvariantError } from "@/lib/game/errors";
import { chooseUniform, type RandomSource, systemRandom } from "@/lib/game/random";
import { getEligibleExecutionTargets, getEligibleNominees } from "@/lib/game/rules";
import type { Policy, Room, Vote } from "@/lib/game/types";

export function chooseBotNominee(room: Room, rng: RandomSource = systemRandom): string {
  const nominees = getEligibleNominees(room);
  if (nominees.length === 0) {
    throw new GameInvariantError("NO_NOMINEES", "No eligible nominees for bot nomination.");
  }
  return chooseUniform(
    nominees.map((nominee) => nominee.id),
    rng
  );
}

export function chooseBotVote(rng: RandomSource = systemRandom): Vote {
  return chooseUniform(["JA", "NEIN"] as const, rng);
}

export function chooseBotDiscardIndex(hand: Policy[], rng: RandomSource = systemRandom): number {
  if (hand.length === 0) {
    throw new GameInvariantError("EMPTY_HAND", "Cannot discard from empty hand.");
  }
  const indices = Array.from({ length: hand.length }, (_, index) => index);
  return chooseUniform(indices, rng);
}

export function chooseBotExecutionTarget(room: Room, rng: RandomSource = systemRandom): string {
  const targets = getEligibleExecutionTargets(room);
  if (targets.length === 0) {
    throw new GameInvariantError("INVALID_EXECUTION_TARGET", "No eligible execution targets for bot.");
  }

  return chooseUniform(targets, rng).id;
}
