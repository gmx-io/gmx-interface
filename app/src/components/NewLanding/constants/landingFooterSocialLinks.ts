import type { ComponentType, SVGProps } from 'react';

import DiscordIcon from '@/img/Discord.svg?react';
import GithubIcon from '@/img/Github.svg?react';
import TelegramIcon from '@/img/Telegram.svg?react';
import XIcon from '@/img/X.svg?react';

export type LandingFooterSocialLink = {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export const LANDING_FOOTER_SOCIAL_LINKS: LandingFooterSocialLink[] = [
  { href: 'https://x.com/gmtrade_xyz', label: 'X', Icon: XIcon },
  { href: 'https://github.com/gmsol-labs', label: 'Github', Icon: GithubIcon },
  { href: 'https://t.me/gmtrade_xyz', label: 'Telegram', Icon: TelegramIcon },
  {
    href: 'https://discord.com/invite/gmtrade',
    label: 'Discord',
    Icon: DiscordIcon,
  },
];
