import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trans } from '@lingui/macro';
import { useMedia } from 'react-use';
import { RemoveScroll } from 'react-remove-scroll';

import ArrowRight from '@/img/ArrowRight.svg';
import gtPointsTrade from '@/img/new-landing/gt-points-trade.png';
import gtPointsLiquidity from '@/img/new-landing/gt-points-liquidity.png';
import gtPointsRefer from '@/img/new-landing/gt-points-refer.png';
import './EarnGtPanel.scss';

type EarnGtItem = {
  description: ReactNode;
  actionLabel: ReactNode;
  href: string;
  image: string;
};

const EARN_ITEMS: EarnGtItem[] = [
  {
    description: (
      <Trans>
        Every time you trade, the order fees and borrowing fees you pay will earn
        you the same amount of GT rewards — calculated based on the current GT
        minting price.
      </Trans>
    ),
    actionLabel: <Trans>Trade</Trans>,
    href: '/trade',
    image: gtPointsTrade,
  },
  {
    description: (
      <Trans>
        Provide liquidity and stake your GLV/GM tokens to earn GT rewards. The
        longer you stake, the higher your GT reward APY becomes.
      </Trans>
    ),
    actionLabel: <Trans>Stake</Trans>,
    href: '/stake',
    image: gtPointsLiquidity,
  },
  {
    description: (
      <Trans>
        Earn GT referral rewards when your referrals generate GT from trading.
        Your reward rate increases with your GT VIP level.
      </Trans>
    ),
    actionLabel: <Trans>Referral</Trans>,
    href: '/referrals',
    image: gtPointsRefer,
  },
];

const NEWGT_CONTAINER_SELECTOR = '.newgt-container';
const WIDE_MEDIA_QUERY = '(min-width: 1728px)';
const PANEL_GAP_REM = 0.8;

function syncPanelLeft(panel: HTMLElement) {
  if (!window.matchMedia(WIDE_MEDIA_QUERY).matches) {
    panel.style.removeProperty('--earn-gt-panel-left');
    return;
  }

  const container = document.querySelector(NEWGT_CONTAINER_SELECTOR);
  if (!(container instanceof HTMLElement)) {
    panel.style.removeProperty('--earn-gt-panel-left');
    return;
  }

  const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const gap = Number.isFinite(remPx) ? remPx * PANEL_GAP_REM : 8;
  panel.style.setProperty(
    '--earn-gt-panel-left',
    `${container.getBoundingClientRect().right + gap}px`
  );
}

type EarnGtPanelProps = {
  onClose: () => void;
};

function EarnGtPanel({ onClose }: EarnGtPanelProps) {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const isCompact = useMedia('(max-width: 1023px)');

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const updateLeft = () => syncPanelLeft(panel);
    updateLeft();

    const media = window.matchMedia(WIDE_MEDIA_QUERY);
    media.addEventListener('change', updateLeft);
    window.addEventListener('resize', updateLeft);

    const observer = new ResizeObserver(updateLeft);
    const container = document.querySelector(NEWGT_CONTAINER_SELECTOR);
    if (container) observer.observe(container);

    return () => {
      media.removeEventListener('change', updateLeft);
      window.removeEventListener('resize', updateLeft);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div
        className="earn-gt-panel-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className="earn-gt-panel"
        role="dialog"
        aria-label="How To Earn GT"
      >
        <div className="earn-gt-panel-header">
          <h3 className="earn-gt-panel-title">
            <Trans>How To Earn GT ?</Trans>
          </h3>
          <button
            type="button"
            className="earn-gt-panel-close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M5 5L15 15M15 5L5 15"
                stroke="#A3A3A3"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <RemoveScroll enabled={isCompact} className="earn-gt-panel-body">
          {EARN_ITEMS.map((item) => (
            <div key={item.href} className="earn-gt-panel-card">
              <p className="earn-gt-panel-card-desc">{item.description}</p>
              <button
                type="button"
                className="earn-gt-panel-card-btn"
                onClick={() => {
                  onClose();
                  navigate(item.href);
                }}
              >
                {item.actionLabel}
                <img src={ArrowRight} alt="" width={16} height={16} />
              </button>
              <img
                src={item.image}
                alt=""
                aria-hidden="true"
                className="earn-gt-panel-card-img"
                width={134}
                height={134}
              />
            </div>
          ))}
        </RemoveScroll>
      </div>
    </>
  );
}

export default EarnGtPanel;
