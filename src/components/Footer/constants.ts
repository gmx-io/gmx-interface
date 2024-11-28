import { defineMessage } from "@lingui/macro";
import "./Footer.css";
import xIcon from "img/ic_x.svg";
import discordIcon from "img/ic_discord2.svg";
import telegramIcon from "img/ic_telegram.svg";
import githubIcon from "img/ic_github.svg";
import { MessageDescriptor } from "@lingui/core";

type Link = {
  text: MessageDescriptor;
  link: string;
  external?: boolean;
  isAppLink?: boolean;
};

type SocialLink = {
  link: string;
  name: string;
  icon: string;
};

export const FOOTER_LINKS: { home: Link[]; app: Link[] } = {
  home: [
    { text: defineMessage({ message: "Terms and Conditions" }), link: "/terms-and-conditions" },
    { text: defineMessage({ message: "Referral Terms" }), link: "/referral-terms" },
    {
      text: defineMessage({ message: "Media Kit" }),
      link: "https://docs.t3.money/tmx/media-kit",
      external: true,
    }, // TODO media kit
  ],
  app: [],
};

export function getFooterLinks(isHome) {
  return FOOTER_LINKS[isHome ? "home" : "app"];
}

// TODO socials
export const SOCIAL_LINKS: SocialLink[] = [
  { link: "https://x.com/t3__money", name: "X", icon: xIcon },
  { link: "https://github.com/t3-money", name: "Github", icon: githubIcon },
  { link: "https://t.me/t3_money", name: "Telegram", icon: telegramIcon },
  { link: "https://discord.gg/8ZUHf9sZ6f", name: "Discord", icon: discordIcon },
];
