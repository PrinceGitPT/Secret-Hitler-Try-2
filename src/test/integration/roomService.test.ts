import { beforeEach, describe, expect, it } from "vitest";
import { makeSeededRandom } from "@/lib/game/random";
import {
  createRoomService,
  getRoomStateService,
  joinRoomService,
  startRoomService,
  submitActionService
} from "@/lib/server/roomService";
import { getRoomChatService } from "@/lib/server/chatService";
import { resetMemoryKvForTests } from "@/lib/store/kv";

describe("room service integration", () => {
  beforeEach(() => {
    resetMemoryKvForTests();
  });

  it("runs a full flow with multi-human and bot fill", async () => {
    const rng = makeSeededRandom(99);

    const created = await createRoomService(
      {
        hostName: "Host",
        roomSize: 5,
        themeId: "classic"
      },
      rng
    );

    const roomCode = created.room.room.code;
    const hostId = created.actorId;

    const joined = await joinRoomService(roomCode, "Second Human");
    const secondId = joined.actorId;

    await startRoomService({ roomCode, actorId: hostId, rng });

    const started = await getRoomStateService({ roomCode, actorId: hostId });
    expect(started.room.locked).toBe(true);
    expect(started.room.players).toHaveLength(5);
    expect(started.room.players.filter((player) => player.isBot)).toHaveLength(3);
    expect(started.room.game?.phase).toBe("NOMINATION");
    expect(started.viewer).toBeDefined();
    expect(started.viewer?.isHitler).toBe(started.viewer?.role === "HITLER");
    expect(started.viewer?.team).toBe(started.viewer?.role === "LIBERAL" ? "LIBERAL" : "FASCIST");
    expect(Array.isArray(started.viewer?.knownFactionMembers)).toBe(true);

    const chatAfterStart = await getRoomChatService({ roomCode, actorId: hostId });
    const startChatCount = chatAfterStart.messages.length;
    expect(startChatCount).toBeGreaterThan(0);
    expect(chatAfterStart.messages.some((message) => message.senderIsBot)).toBe(true);

    const secondPerspective = await getRoomStateService({ roomCode, actorId: secondId });
    expect(secondPerspective.viewer).toBeDefined();
    expect(secondPerspective.viewer?.isHitler).toBe(secondPerspective.viewer?.role === "HITLER");
    expect(secondPerspective.viewer?.team).toBe(
      secondPerspective.viewer?.role === "LIBERAL" ? "LIBERAL" : "FASCIST"
    );
    expect(Array.isArray(secondPerspective.viewer?.knownFactionMembers)).toBe(true);

    await submitActionService({
      roomCode,
      action: {
        type: "NOMINATE_CHANCELLOR",
        actorId: hostId,
        nomineeId: secondId
      },
      rng
    });

    const chatAfterNomination = await getRoomChatService({ roomCode, actorId: hostId });
    expect(chatAfterNomination.messages.length).toBeGreaterThan(startChatCount);
    expect(chatAfterNomination.messages.some((message) => message.senderIsBot)).toBe(true);

    await submitActionService({
      roomCode,
      action: {
        type: "CAST_VOTE",
        actorId: hostId,
        vote: "JA"
      },
      rng
    });

    await submitActionService({
      roomCode,
      action: {
        type: "CAST_VOTE",
        actorId: secondId,
        vote: "JA"
      },
      rng
    });

    const legislative = await getRoomStateService({ roomCode, actorId: hostId });
    expect(legislative.room.game?.phase).toBe("LEGISLATIVE_PRESIDENT");
    expect(legislative.room.game?.legislativeHand).toHaveLength(3);

    await submitActionService({
      roomCode,
      action: {
        type: "LEGISLATIVE_DISCARD",
        actorId: hostId,
        cardIndex: 0
      },
      rng
    });

    await submitActionService({
      roomCode,
      action: {
        type: "CHANCELLOR_DISCARD",
        actorId: secondId,
        cardIndex: 0
      },
      rng
    });

    const afterEnact = await getRoomStateService({ roomCode, actorId: hostId });
    const enacted =
      (afterEnact.room.game?.liberalEnacted ?? 0) + (afterEnact.room.game?.fascistEnacted ?? 0);

    expect(afterEnact.room.game?.phase).toBe("NOMINATION");
    expect(enacted).toBe(1);
  });
});
