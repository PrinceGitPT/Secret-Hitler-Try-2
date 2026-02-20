import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/server/api";
import { startRoomService } from "@/lib/server/roomService";

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ roomCode: string }>;
  }
) {
  try {
    const { roomCode } = await context.params;
    const body = (await request.json()) as {
      actorId?: string;
    };

    const result = await startRoomService({
      roomCode,
      actorId: body.actorId ?? ""
    });

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
