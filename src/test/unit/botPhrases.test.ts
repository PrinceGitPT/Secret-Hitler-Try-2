import { describe, expect, it } from "vitest";
import { chooseBotPhaseMessage, listBotPhrasesForPhase } from "@/lib/chat/botPhrases";
import { makeSeededRandom } from "@/lib/game/random";

describe("bot phase phrases", () => {
  it("draws messages from each phase pool", () => {
    const phases = ["NOMINATION", "VOTING", "LEGISLATIVE_PRESIDENT", "LEGISLATIVE_CHANCELLOR"] as const;
    const rng = makeSeededRandom(7);

    for (const phase of phases) {
      const pool = listBotPhrasesForPhase(phase);
      expect(pool.length).toBeGreaterThan(0);

      const sample = chooseBotPhaseMessage(phase, rng);
      expect(pool).toContain(sample);
    }
  });

  it("produces roughly varied picks with uniform random source", () => {
    const rng = makeSeededRandom(11);
    const seen = new Set<string>();

    for (let index = 0; index < 100; index += 1) {
      seen.add(chooseBotPhaseMessage("VOTING", rng));
    }

    expect(seen.size).toBeGreaterThan(1);
  });
});
