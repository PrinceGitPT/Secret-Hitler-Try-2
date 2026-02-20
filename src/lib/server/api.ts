import { NextResponse } from "next/server";
import { GameInvariantError } from "@/lib/game/errors";

const statusByErrorCode: Record<string, number> = {
  ROOM_NOT_FOUND: 404,
  ROOM_FULL: 409,
  ROOM_LOCKED: 409,
  GAME_ALREADY_STARTED: 409,
  GAME_OVER: 409,
  NOT_HOST: 403,
  ACTOR_NOT_IN_ROOM: 403,
  NOT_ALIVE: 403,
  CHAT_DISABLED: 409,
  INVALID_CHAT_BODY: 400,
  CHAT_MESSAGE_TOO_LONG: 400,
  CHAT_SENDER_NOT_ALLOWED: 403,
  CHAT_SENDER_DEAD: 403,
  NO_PENDING_EXECUTIVE_POWER: 409,
  INVALID_EXECUTIVE_RESOLUTION: 400,
  INVALID_EXECUTION_TARGET: 400
};

export function apiErrorResponse(error: unknown) {
  if (error instanceof GameInvariantError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message
        }
      },
      { status: statusByErrorCode[error.code] ?? 400 }
    );
  }

  console.error("Unexpected API error", error);

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred."
      }
    },
    { status: 500 }
  );
}
