import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/server/api";
import { joinRoomService } from "@/lib/server/roomService";

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ roomCode: string }>;
  }
) {
  try {
    const { roomCode } = await context.params;
    const body = (await request.json()) as {
      name?: string;
    };

    const result = await joinRoomService(roomCode, body.name ?? "");
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
