import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/server/api";
import { submitActionService } from "@/lib/server/roomService";
import type { GameAction } from "@/lib/game/types";

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ roomCode: string }>;
  }
) {
  try {
    const { roomCode } = await context.params;
    const action = (await request.json()) as GameAction;

    const result = await submitActionService({
      roomCode,
      action
    });

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
