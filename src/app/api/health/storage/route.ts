import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/server/api";
import { getStorageDiagnostics } from "@/lib/store/kv";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const storage = await getStorageDiagnostics();
    return NextResponse.json(
      {
        ok: true,
        storage
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
