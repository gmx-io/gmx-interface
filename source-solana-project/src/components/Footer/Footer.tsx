import ExternalLink from '@/components/Common/Link/ExternalLink';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import githubIcon from '@/img/Github.svg';
import telegramIcon from '@/img/Telegram.svg';
import discordIcon from '@/img/Discord.svg';
import xIcon from '@/img/X.svg';
import { appVersion, uiBuildTime } from '@/config/buildInfo';
import { getUiDeployTooltipText } from '@/utils/deployInfo';
import cx from 'classnames';
import { useCallback } from 'react';
import { useMedia } from 'react-use';

type SocialLink = {
  link: string;
  name: string;
  icon: string;
};

const versionLabelStyle = { fontSize: '1.3rem', fontWeight: 500 } as const;

export default function Footer() {
  const isMobile = useMedia('(max-width: 1200px)');

  const SOCIAL_LINKS: SocialLink[] = [
    { link: 'https://x.com/gmtrade_xyz', name: 'Twitter', icon: xIcon },
    { link: 'https://github.com/gmsol-labs', name: 'Github', icon: githubIcon },
    { link: 'https://t.me/gmtrade_xyz', name: 'Telegram', icon: telegramIcon },
    {
      link: 'https://discord.com/invite/gmtrade',
      name: 'Discord',
      icon: discordIcon,
    },
  ];

  const renderDeployTooltip = useCallback(
    () => getUiDeployTooltipText(uiBuildTime),
    []
  );

  const versionHandle = (
    <span
      className="cursor-pointer text-[#A3A3A3]  transition-colors"
      style={versionLabelStyle}
    >
      {`v${appVersion}`}
    </span>
  );

  return (
    <div
      className={cx(
        'grid h-[4rem] grid-cols-[auto_1fr_auto] gap-x-10 py-8 pl-8 pr-20'
      )}
    >
      <div className="text-body-small sm:text-body-medium flex items-center">
        <TooltipWithPortal
          disableHandleStyle
          fitContentWidth
          position="top-start"
          handle={versionHandle}
          renderContent={renderDeployTooltip}
          disabled={!uiBuildTime}
        />
      </div>
      <div></div>
      <div
        className={cx('flex items-center', {
          'justify-end gap-24': !isMobile,
          'justify-end gap-10': isMobile,
        })}
      >
        {SOCIAL_LINKS.map((platform) => (
          <ExternalLink
            key={platform.name}
            href={platform.link}
            className={cx('flex items-center justify-center', {
              'h-20 w-20': !isMobile,
              'h-[20px] w-[20px]': isMobile,
            })}
          >
            <img src={platform.icon} alt={platform.name} width="100%" />
          </ExternalLink>
        ))}
      </div>
    </div>
  );
}
