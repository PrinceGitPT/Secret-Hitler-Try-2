import { chooseUniform, systemRandom, type RandomSource } from "@/lib/game/random";
import type { Phase } from "@/lib/game/types";

export type ChatBotPhase =
  | "NOMINATION"
  | "VOTING"
  | "LEGISLATIVE_PRESIDENT"
  | "LEGISLATIVE_CHANCELLOR";

const botPhrasesByPhase: Record<ChatBotPhase, readonly string[]> = {
  NOMINATION: [
    "Eyes up. Pick carefully.",
    "I have a good feeling about this nominee.",
    "New government, new possibilities.",
    "Let us keep this moving."
  ],
  VOTING: [
    "Ja or Nein, make it count.",
    "No fence-sitting now.",
    "Votes reveal more than words.",
    "This vote will be interesting."
  ],
  LEGISLATIVE_PRESIDENT: [
    "President has the first discard.",
    "Three cards, one tough cut.",
    "Policy pressure is on.",
    "Let us see what reaches the chancellor."
  ],
  LEGISLATIVE_CHANCELLOR: [
    "Chancellor decides what gets enacted.",
    "Final discard. No mistakes.",
    "Two cards left, one future.",
    "This choice matters."
  ]
};

export function isChatBotPhase(phase: Phase): phase is ChatBotPhase {
  return (
    phase === "NOMINATION" ||
    phase === "VOTING" ||
    phase === "LEGISLATIVE_PRESIDENT" ||
    phase === "LEGISLATIVE_CHANCELLOR"
  );
}

export function listBotPhrasesForPhase(phase: ChatBotPhase): readonly string[] {
  return botPhrasesByPhase[phase];
}

export function chooseBotPhaseMessage(phase: ChatBotPhase, rng: RandomSource = systemRandom): string {
  return chooseUniform(botPhrasesByPhase[phase], rng);
}
