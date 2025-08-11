import IconDiscord from "img/social/ic_discord_new.svg?react";
import IconGithub from "img/social/ic_github_new.svg?react";
import IconSubstack from "img/social/ic_substack_new.svg?react";
import IconTelegram from "img/social/ic_telegram_new.svg?react";
import IconX from "img/social/ic_x_new.svg?react";

export const SOCIAL_MAP = {
  Discord: {
    link: "https://discord.gg/H5PeQru3Aa",
    name: "Discord",
    IconComponent: IconDiscord,
    onClick: () => {
      window.open("https://discord.gg/H5PeQru3Aa", "_blank");
    },
  },
  Telegram: {
    link: "https://t.me/GMX_IO",
    name: "Telegram",
    IconComponent: IconTelegram,
    onClick: () => {
      window.open("https://t.me/GMX_IO", "_blank");
    },
  },
  Substack: {
    link: "https://gmxio.substack.com/",
    name: "Substack",
    IconComponent: IconSubstack,
    onClick: () => {
      window.open("https://gmxio.substack.com/", "_blank");
    },
  },
  Github: {
    link: "https://github.com/gmx-io",
    name: "Github",
    IconComponent: IconGithub,
    onClick: () => {
      window.open("https://github.com/gmx-io", "_blank");
    },
  },
  Twitter: {
    link: "https://twitter.com/GMX_IO",
    name: "Twitter",
    IconComponent: IconX,
    onClick: () => {
      window.open("https://twitter.com/GMX_IO", "_blank");
    },
  },
} as const;

export const SOCIAL_LINKS = Object.values(SOCIAL_MAP);
