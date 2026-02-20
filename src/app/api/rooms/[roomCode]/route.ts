import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/server/api";
import { updateRoomConfigService } from "@/lib/server/roomService";

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ roomCode: string }>;
  }
) {
  try {
    const { roomCode } = await context.params;
    const body = (await request.json()) as {
      actorId?: string;
      roomSize?: number;
      themeId?: string;
    };

    const result = await updateRoomConfigService({
      roomCode,
      actorId: body.actorId ?? "",
      roomSize: body.roomSize,
      themeId: body.themeId
    });

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
