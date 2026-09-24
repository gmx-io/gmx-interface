import { AnimatePresence, motion } from 'framer-motion';
import ExternalLink from '@/components/Common/Link/ExternalLink';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import { appVersion, uiBuildTime } from '@/config/buildInfo';
import { DEFAULT_DOCS_ENV } from '@/config/env';
import mobileMenuClose from '@/img/new-landing/mobile-menu-close.svg';
import logoMark from '@/img/new-landing/logo-mark.svg';
import { getUiDeployTooltipText } from '@/utils/deployInfo';
import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../scss/landingMobileMenu.scss';
import '../scss/landing.scss';
import { LANDING_FOOTER_SOCIAL_LINKS } from '../constants/landingFooterSocialLinks';

type LandingMobileMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  onLaunch: (e: React.MouseEvent) => void;
};

const OVERLAY_VARIANTS = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const PANEL_VARIANTS = {
  hidden: { x: '100%' },
  visible: { x: 0 },
};

const TRANSITION = { duration: 0.2 };

export default function LandingMobileMenu({
  isOpen,
  onClose,
  onLaunch,
}: LandingMobileMenuProps) {
  const renderDeployTooltip = useCallback(
    () => getUiDeployTooltipText(uiBuildTime),
    []
  );

  const versionHandle = (
    <span className="landing-mobile-menu__version-handle">
      {`v${appVersion}`}
    </span>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="landing-mobile-menu font-inter "
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={OVERLAY_VARIANTS}
          transition={TRANSITION}
        >
          <button
            type="button"
            className="landing-mobile-menu__backdrop"
            onClick={onClose}
            aria-label="Close mobile menu"
          />

          <motion.div
            className="landing-mobile-menu__panel"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={PANEL_VARIANTS}
            transition={TRANSITION}
          >
            <div>
              <div className="landing-mobile-menu__header">
                <Link
                  to="/"
                  className="landing-mobile-menu__brand no-underline"
                  onClick={onClose}
                >
                  <img
                    src={logoMark}
                    alt=""
                    className="landing-mobile-menu__brand-logo"
                  />
                  <span className="landing-mobile-menu__brand-text">
                    GMTrade
                  </span>
                </Link>
                <button
                  type="button"
                  className="landing-mobile-menu__close"
                  onClick={onClose}
                  aria-label="Close mobile menu"
                >
                  <img src={mobileMenuClose} alt="" />
                </button>
              </div>

              <nav className="landing-mobile-menu__nav">
                <ExternalLink
                  href="https://github.com/gmsol-labs/"
                  className="landing-mobile-menu__link"
                >
                  Protocol
                </ExternalLink>
                <ExternalLink
                  href={DEFAULT_DOCS_ENV}
                  className="landing-mobile-menu__link"
                >
                  Docs
                </ExternalLink>
                <ExternalLink
                  href="https://dune.com/gmtrade/gmtrade-analytics"
                  className="landing-mobile-menu__link"
                >
                  Stats
                </ExternalLink>
              </nav>

              <button
                type="button"
                onClick={(e) => {
                  onLaunch(e);
                  onClose();
                }}
                className="landing-mobile-menu__launch"
              >
                Launch App
              </button>
            </div>
            <div>
              <nav
                className="landing-mobile-menu__social"
                aria-label="GMTrade social links"
              >
                {LANDING_FOOTER_SOCIAL_LINKS.map(({ href, label, Icon }) => (
                  <ExternalLink
                    key={label}
                    href={href}
                    className="landing-mobile-menu__social-link"
                    ariaLabel={label}
                  >
                    <Icon aria-hidden="true" focusable="false" />
                  </ExternalLink>
                ))}
              </nav>
              <div className="landing-mobile-menu__version">
                <TooltipWithPortal
                  disableHandleStyle
                  fitContentWidth
                  position="top"
                  handle={versionHandle}
                  renderContent={renderDeployTooltip}
                  disabled={!uiBuildTime}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
