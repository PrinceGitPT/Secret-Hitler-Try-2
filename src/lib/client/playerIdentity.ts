const PLAYER_ID_KEY_PREFIX = "secret-hitler:player:";

export function getStoredPlayerId(roomCode: string): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return window.localStorage.getItem(`${PLAYER_ID_KEY_PREFIX}${roomCode.toUpperCase()}`) ?? undefined;
}

export function setStoredPlayerId(roomCode: string, playerId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(`${PLAYER_ID_KEY_PREFIX}${roomCode.toUpperCase()}`, playerId);
}
