import { getPlayerById } from "@/lib/game/rules";
import type { GameState, Room, WinReason, WinnerTeam } from "@/lib/game/types";

export interface WinOutcome {
  winner: WinnerTeam;
  reason: WinReason;
}

export function applyGameOver(game: GameState, outcome: WinOutcome): void {
  game.phase = "GAME_OVER";
  game.winner = outcome.winner;
  game.winReason = outcome.reason;
  game.pendingVotes = {};
  game.legislativeHand = undefined;
  game.pendingExecutivePower = undefined;
}

export function checkPolicyWin(game: GameState): WinOutcome | undefined {
  if (game.liberalEnacted >= 5) {
    return {
      winner: "LIBERAL",
      reason: "LIBERAL_POLICY"
    };
  }

  if (game.fascistEnacted >= 6) {
    return {
      winner: "FASCIST",
      reason: "FASCIST_POLICY"
    };
  }

  return undefined;
}

export function checkHitlerElectionWin(room: Room): WinOutcome | undefined {
  if (!room.game || room.game.fascistEnacted < 3 || room.game.chancellorSeat === undefined) {
    return undefined;
  }

  const chancellor = room.players.find((player) => player.seat === room.game?.chancellorSeat);
  if (!chancellor || chancellor.role !== "HITLER") {
    return undefined;
  }

  return {
    winner: "FASCIST",
    reason: "HITLER_ELECTED_CHANCELLOR"
  };
}

export function checkHitlerExecutedWin(room: Room, targetId: string): WinOutcome | undefined {
  const target = getPlayerById(room, targetId);
  if (!target || target.role !== "HITLER" || target.alive) {
    return undefined;
  }

  return {
    winner: "LIBERAL",
    reason: "HITLER_EXECUTED"
  };
}
