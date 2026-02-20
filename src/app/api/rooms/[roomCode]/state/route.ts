import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/server/api";
import { getRoomStateService } from "@/lib/server/roomService";

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ roomCode: string }>;
  }
) {
  try {
    const { roomCode } = await context.params;
    const actorId = request.nextUrl.searchParams.get("actorId") ?? undefined;

    const result = await getRoomStateService({
      roomCode,
      actorId
    });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
