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

const classicWinnerBannerByReason: ThemeManifest["winnerBannerByReason"] = {
  LIBERAL_POLICY: "/themes/classic/winner-liberal-policy.svg",
  FASCIST_POLICY: "/themes/classic/winner-fascist-policy.svg",
  HITLER_ELECTED_CHANCELLOR: "/themes/classic/winner-hitler-elected.svg",
  HITLER_EXECUTED: "/themes/classic/winner-hitler-executed.svg"
};

const minimalWinnerBannerByReason: ThemeManifest["winnerBannerByReason"] = {
  LIBERAL_POLICY: "/themes/minimal/winner-liberal-policy.svg",
  FASCIST_POLICY: "/themes/minimal/winner-fascist-policy.svg",
  HITLER_ELECTED_CHANCELLOR: "/themes/minimal/winner-hitler-elected.svg",
  HITLER_EXECUTED: "/themes/minimal/winner-hitler-executed.svg"
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
    botColorImages: classicBotColorImages,
    winnerBannerByReason: classicWinnerBannerByReason
  },
  {
    id: "minimal",
    name: "Minimal Brass",
    boardImage: "/themes/minimal/board.svg",
    liberalCardFace: "/themes/minimal/liberal-card.svg",
    fascistCardFace: "/themes/minimal/fascist-card.svg",
    cardBack: "/themes/minimal/card-back.svg",
    deadPlayerOverlayImage: "/themes/minimal/dead-overlay.svg",
    botColorImages: minimalBotColorImages,
    winnerBannerByReason: minimalWinnerBannerByReason
  }
];

export function listThemes(): ThemeManifest[] {
  return themeManifest;
}

export function getThemeById(themeId: string): ThemeManifest | undefined {
  return themeManifest.find((theme) => theme.id === themeId);
}
