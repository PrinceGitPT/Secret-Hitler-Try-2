import { describe, expect, it } from "vitest";
import { apiErrorResponse } from "@/lib/server/api";
import { GameInvariantError } from "@/lib/game/errors";

describe("api error mapping", () => {
  it("maps KV errors to 503", async () => {
    const notConfigured = apiErrorResponse(
      new GameInvariantError("KV_NOT_CONFIGURED", "KV is required in production.")
    );
    expect(notConfigured.status).toBe(503);
    await expect(notConfigured.json()).resolves.toMatchObject({
      error: {
        code: "KV_NOT_CONFIGURED"
      }
    });

    const unavailable = apiErrorResponse(
      new GameInvariantError("KV_UNAVAILABLE", "KV backend failed.")
    );
    expect(unavailable.status).toBe(503);
    await expect(unavailable.json()).resolves.toMatchObject({
      error: {
        code: "KV_UNAVAILABLE"
      }
    });
  });
});
