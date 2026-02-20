import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/server/api";
import { createRoomService } from "@/lib/server/roomService";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      roomSize?: number;
      themeId?: string;
      hostName?: string;
    };

    const result = await createRoomService({
      roomSize: body.roomSize ?? 0,
      themeId: body.themeId ?? "classic",
      hostName: body.hostName ?? ""
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
