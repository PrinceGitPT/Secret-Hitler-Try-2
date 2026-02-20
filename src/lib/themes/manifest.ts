import type { ThemeManifest } from "@/lib/game/types";

const classicBotColorImages: ThemeManifest["botColorImages"] = {
  YELLOW: "/themes/classic/bots/yellow.svg",
  BLUE: "/themes/classic/bots/blue.svg",
  GREEN: "/themes/classic/bots/green.svg",
  ORANGE: "/themes/classic/bots/orange.svg",
  PURPLE: "/themes/classic/bots/purple.svg",
  TEAL: "/themes/classic/bots/teal.svg",
  RED: "/themes/classic/bots/red.svg",
  PINK: "/themes/classic/bots/pink.svg",
  BROWN: "/themes/classic/bots/brown.svg",
  GRAY: "/themes/classic/bots/gray.svg"
};

const minimalBotColorImages: ThemeManifest["botColorImages"] = {
  YELLOW: "/themes/minimal/bots/yellow.svg",
  BLUE: "/themes/minimal/bots/blue.svg",
  GREEN: "/themes/minimal/bots/green.svg",
  ORANGE: "/themes/minimal/bots/orange.svg",
  PURPLE: "/themes/minimal/bots/purple.svg",
  TEAL: "/themes/minimal/bots/teal.svg",
  RED: "/themes/minimal/bots/red.svg",
  PINK: "/themes/minimal/bots/pink.svg",
  BROWN: "/themes/minimal/bots/brown.svg",
  GRAY: "/themes/minimal/bots/gray.svg"
};

export const themeManifest: ThemeManifest[] = [
  {
    id: "classic",
    name: "Classic Felt",
    boardImage: "/themes/classic/board.svg",
    liberalCardFace: "/themes/classic/liberal-card.svg",
    fascistCardFace: "/themes/classic/fascist-card.svg",
    cardBack: "/themes/classic/card-back.svg",
    deadPlayerOverlayImage: "/themes/classic/dead-overlay.svg",
    botColorImages: classicBotColorImages
  },
  {
    id: "minimal",
    name: "Minimal Brass",
    boardImage: "/themes/minimal/board.svg",
    liberalCardFace: "/themes/minimal/liberal-card.svg",
    fascistCardFace: "/themes/minimal/fascist-card.svg",
    cardBack: "/themes/minimal/card-back.svg",
    deadPlayerOverlayImage: "/themes/minimal/dead-overlay.svg",
    botColorImages: minimalBotColorImages
  }
];

export function listThemes(): ThemeManifest[] {
  return themeManifest;
}

export function getThemeById(themeId: string): ThemeManifest | undefined {
  return themeManifest.find((theme) => theme.id === themeId);
}
