import { t } from "@lingui/macro";

import DiscordIcon from "img/ic_discord.svg?react";
import GithubIcon from "img/ic_github.svg?react";
import SubstackIcon from "img/ic_substack.svg?react";
import TelegramIcon from "img/ic_telegram.svg?react";
import XIcon from "img/ic_x.svg?react";

type Link = {
  label: string;
  link: string;
  external?: boolean;
  isAppLink?: boolean;
};

type SocialLink = {
  link: string;
  name: string;
  icon: React.ReactNode;
};

export function getFooterLinks(isHome) {
  const FOOTER_LINKS: { home: Link[]; app: Link[] } = {
    home: [
      { label: t`Terms and Conditions`, link: "/terms-and-conditions" },
      { label: t`Referral Terms`, link: "/referral-terms" },
      { label: t`Media Kit`, link: "https://docs.gmx.io/docs/community/media-kit", external: true },
      // { label: "Jobs", link: "/jobs", isAppLink: true },
    ],
    app: [
      { label: t`Media Kit`, link: "https://docs.gmx.io/docs/community/media-kit", external: true },
      { label: t`Charts by TradingView`, link: "https://www.tradingview.com/", external: true },
      // { label: "Jobs", link: "/jobs" },
    ],
  };
  return FOOTER_LINKS[isHome ? "home" : "app"];
}

export const SOCIAL_LINKS: SocialLink[] = [
  { link: "https://twitter.com/GMX_IO", name: "Twitter", icon: <XIcon /> },
  { link: "https://gmxio.substack.com/", name: "Substack", icon: <SubstackIcon /> },
  { link: "https://github.com/gmx-io", name: "Github", icon: <GithubIcon /> },
  { link: "https://t.me/GMX_IO", name: "Telegram", icon: <TelegramIcon /> },
  { link: "https://discord.gg/H5PeQru3Aa", name: "Discord", icon: <DiscordIcon /> },
];
