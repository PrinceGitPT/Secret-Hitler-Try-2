import { beforeEach, describe, expect, it } from "vitest";
import { CHAT_MAX_LENGTH } from "@/lib/chat/types";
import { listMessages, postMessage } from "@/lib/chat/service";
import { resetMemoryKvForTests } from "@/lib/store/kv";

describe("chat service", () => {
  beforeEach(() => {
    resetMemoryKvForTests();
  });

  it("trims and stores posted messages", async () => {
    await postMessage("ROOM1", "p1", "   hello table   ", 1);

    const messages = await listMessages("ROOM1");
    expect(messages).toHaveLength(1);
    expect(messages[0]?.body).toBe("hello table");
  });

  it("rejects empty messages", async () => {
    await expect(postMessage("ROOM1", "p1", "     ")).rejects.toMatchObject({
      code: "INVALID_CHAT_BODY"
    });
  });

  it("rejects messages over max length", async () => {
    const body = "x".repeat(CHAT_MAX_LENGTH + 1);
    await expect(postMessage("ROOM1", "p1", body)).rejects.toMatchObject({
      code: "CHAT_MESSAGE_TOO_LONG"
    });
  });

  it("retains only the last 100 messages", async () => {
    for (let index = 1; index <= 120; index += 1) {
      await postMessage("ROOM1", "p1", `msg-${index}`, index);
    }

    const messages = await listMessages("ROOM1");
    expect(messages).toHaveLength(100);
    expect(messages[0]?.body).toBe("msg-21");
    expect(messages[messages.length - 1]?.body).toBe("msg-120");
  });
});
