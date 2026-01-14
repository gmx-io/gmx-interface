import { t } from "@lingui/macro";
import { ReactNode } from "react";

import DiscordIcon from "img/ic_discord.svg?react";
import GithubIcon from "img/ic_github.svg?react";
import SubstackIcon from "img/ic_substack.svg?react";
import TelegramIcon from "img/ic_telegram.svg?react";
import XIcon from "img/ic_x.svg?react";

type Link = {
  label: ReactNode;
  link: string;
  external?: boolean;
  isAppLink?: boolean;
};

type SocialLink = {
  link: string;
  name: string;
  icon: React.ReactNode;
};

export const getFooterLinks = (): Link[] => [
  {
    label: (
      <>
        <V1Icon />
        {t`V1 interface`}
      </>
    ),
    link: "https://v1.app.gmx.io/#/v1",
    external: true,
  },
  { label: t`Media kit`, link: "https://docs.gmx.io/docs/community/media-kit", external: true },
  { label: t`Charts by TradingView`, link: "https://www.tradingview.com/", external: true },
  // { label: "Jobs", link: "/jobs" },
];

export const SOCIAL_LINKS: SocialLink[] = [
  { link: "https://twitter.com/GMX_IO", name: "Twitter", icon: <XIcon className="size-16" /> },
  { link: "https://gmxio.substack.com/", name: "Substack", icon: <SubstackIcon className="size-16" /> },
  { link: "https://github.com/gmx-io", name: "Github", icon: <GithubIcon className="size-16" /> },
  { link: "https://t.me/GMX_IO", name: "Telegram", icon: <TelegramIcon className="size-16" /> },
  { link: "https://discord.gg/H5PeQru3Aa", name: "Discord", icon: <DiscordIcon className="size-16" /> },
];

function V1Icon() {
  return (
    <div className="rounded-2 bg-typography-secondary px-3 py-2 text-[8px] font-medium text-white dark:text-black">
      V1
    </div>
  );
}
