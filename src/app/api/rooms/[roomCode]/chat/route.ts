import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/server/api";
import { getRoomChatService, postRoomChatService } from "@/lib/server/chatService";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ roomCode: string }>;
  }
) {
  try {
    const { roomCode } = await context.params;
    const actorId = request.nextUrl.searchParams.get("actorId") ?? "";
    const result = await getRoomChatService({
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
      body?: string;
    };

    const result = await postRoomChatService({
      roomCode,
      actorId: body.actorId ?? "",
      body: body.body ?? ""
    });

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
