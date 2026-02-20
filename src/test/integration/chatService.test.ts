import { beforeEach, describe, expect, it } from "vitest";
import { makeSeededRandom } from "@/lib/game/random";
import { postBotPhaseMessage, getRoomChatService, postRoomChatService } from "@/lib/server/chatService";
import { createRoomService, startRoomService } from "@/lib/server/roomService";
import { readRoom, resetMemoryKvForTests, writeRoom } from "@/lib/store/kv";

async function setupStartedRoom() {
  const rng = makeSeededRandom(33);
  const created = await createRoomService(
    {
      hostName: "Host",
      roomSize: 5,
      themeId: "classic"
    },
    rng
  );

  await startRoomService({
    roomCode: created.room.room.code,
    actorId: created.actorId,
    rng
  });

  return {
    roomCode: created.room.room.code,
    hostId: created.actorId,
    rng
  };
}

describe("chat service integration", () => {
  beforeEach(() => {
    resetMemoryKvForTests();
  });

  it("posts and lists projected human chat messages", async () => {
    const { roomCode, hostId } = await setupStartedRoom();

    const posted = await postRoomChatService({
      roomCode,
      actorId: hostId,
      body: "   hello room   "
    });

    expect(posted.message.senderId).toBe(hostId);
    expect(posted.message.senderName).toBe("Host");
    expect(posted.message.senderIsBot).toBe(false);
    expect(posted.message.body).toBe("hello room");

    const listed = await getRoomChatService({ roomCode, actorId: hostId });
    expect(listed.messages.some((message) => message.id === posted.message.id)).toBe(true);
  });

  it("rejects dead players sending chat", async () => {
    const { roomCode, hostId } = await setupStartedRoom();
    const room = await readRoom(roomCode);
    if (!room) {
      throw new Error("Room should exist");
    }

    room.players = room.players.map((player) =>
      player.id === hostId ? { ...player, alive: false } : player
    );
    await writeRoom(room);

    await expect(
      postRoomChatService({
        roomCode,
        actorId: hostId,
        body: "I should be blocked"
      })
    ).rejects.toMatchObject({ code: "CHAT_SENDER_DEAD" });
  });

  it("enforces retention cap at 100 messages", async () => {
    const { roomCode, hostId } = await setupStartedRoom();

    for (let index = 1; index <= 120; index += 1) {
      await postRoomChatService({
        roomCode,
        actorId: hostId,
        body: `msg-${index}`
      });
    }

    const listed = await getRoomChatService({ roomCode, actorId: hostId });
    expect(listed.messages).toHaveLength(100);
    expect(listed.messages[0]?.body).toBe("msg-21");
    expect(listed.messages[99]?.body).toBe("msg-120");
  });

  it("bot phase messages pick an alive bot sender", async () => {
    const { roomCode, hostId, rng } = await setupStartedRoom();
    const room = await readRoom(roomCode);
    if (!room) {
      throw new Error("Room should exist");
    }

    const aliveBots = room.players.filter((player) => player.isBot).sort((a, b) => a.seat - b.seat);
    const keepAliveBot = aliveBots[0];
    if (!keepAliveBot) {
      throw new Error("Expected at least one bot");
    }

    room.players = room.players.map((player) =>
      player.isBot && player.id !== keepAliveBot.id ? { ...player, alive: false } : player
    );
    await writeRoom(room);

    const posted = await postBotPhaseMessage({
      room,
      phase: "VOTING",
      rng
    });

    expect(posted).toBeDefined();
    expect(posted?.senderId).toBe(keepAliveBot.id);
    expect(posted?.senderIsBot).toBe(true);

    const listed = await getRoomChatService({ roomCode, actorId: hostId });
    expect(listed.messages.some((message) => message.id === posted?.id)).toBe(true);
  });
});
