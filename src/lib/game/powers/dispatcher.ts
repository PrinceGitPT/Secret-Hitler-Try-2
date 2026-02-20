import type { GameEventPowerSlotReached } from "@/lib/game/types";

export function dispatchExecutivePower(event: GameEventPowerSlotReached): void {
  void event;
  // Intentionally no-op in MVP. Kept as a dedicated integration point.
}
