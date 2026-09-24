import './LandingFooter.scss';

import GithubIcon from '@/img/Github.svg?react';
import TelegramIcon from '@/img/Telegram.svg?react';
import DiscordIcon from '@/img/Discord.svg?react';
import XIcon from '@/img/X.svg?react';
import ExternalLink from '@/components/Common/Link/ExternalLink';
import TradingViewIcon from '@/img/TradingView.svg?react';
import { useMedia } from 'react-use';
import React, { ComponentType } from 'react';

type SocialLink = {
  link: string;
  name: string;
  icon: ComponentType<React.SVGProps<SVGSVGElement>>;
};


export const LandingFooter = () => {
  const SOCIAL_LINKS: SocialLink[] = [
    {
      link: 'https://discord.com/invite/gmtrade',
      name: 'Discord',
      icon: DiscordIcon,
    },
    { link: 'https://x.com/gmtrade_xyz', name: 'X Twitter', icon: XIcon },
    { link: 'https://t.me/gmtrade_xyz', name: 'Telegram', icon: TelegramIcon },
    { link: 'https://github.com/gmsol-labs', name: 'Github', icon: GithubIcon },
  ];

  const isScreen640 = useMedia('(max-width: 640px)');
  return (
    <div className="landing-footer">
      <div className="landing-footer__social-section">
        {SOCIAL_LINKS.map((platform) => {
          const IconComponent = platform.icon;
          return (
            <ExternalLink
              key={platform.name}
              href={platform.link}
              className="social-link"
            >
              <IconComponent />
              {!isScreen640 && (
                <span style={{ whiteSpace: 'nowrap' }}>{platform.name}</span>
              )}
            </ExternalLink>
          );
        })}
      </div>

      {!isScreen640 ? (
        <div className="landing-footer__grid-section">
          <ExternalLink
            href="https://docs.gmtrade.xyz/legal/referral_terms"
            className="grid-item !no-underline"
          >
            Referral Terms
          </ExternalLink>
          <div className="grid-item">
            <TradingViewIcon />
            <span className="text-[#fff]">Charts by TradingView</span>
          </div>
          <ExternalLink
            href="https://docs.gmtrade.xyz/legal/user_terms"
            className="grid-item !no-underline "
          >
            Terms and Conditions
          </ExternalLink>
        </div>
      ) : (
        <div className="landing-footer__grid-section-mobile">
          <div className="mt-[0.4rem] flex h-[2.8rem] items-center justify-center gap-20 text-[1.2rem] text-[#A3A3A3]">
            <ExternalLink
              href="https://docs.gmtrade.xyz/legal/referral_terms"
              className="grid-item !no-underline "
            >
              Referral Terms
            </ExternalLink>
            <ExternalLink
              href="https://docs.gmtrade.xyz/legal/user_terms"
              className="grid-item !no-underline "
            >
              Terms and Conditions
            </ExternalLink>
          </div>
          <div className="grid-item flex h-[2.8rem] items-center justify-center gap-8 text-[1.2rem] text-[#fff]">
            <TradingViewIcon />
            Charts by TradingView
          </div>
        </div>
      )}
    </div>
  );
};
