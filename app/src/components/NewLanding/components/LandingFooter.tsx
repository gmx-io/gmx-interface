import { useEffect, useRef, useState } from 'react';
import { useMedia } from 'react-use';

import ExternalLink from '@/components/Common/Link/ExternalLink';
import { resolveScrollRoot } from '../hooks/scrollRevealUtils';
import logoGmTrade from '@/img/new-landing/logo-gmtrade.svg';
import logoMark from '@/img/new-landing/logo-mark.svg';
import TradingViewIcon from '@/img/new-landing/tradingview-icon.svg';

import logoMarkFooter from '@/img/new-landing/logo-mask-footer.png';

import { LANDING_FOOTER_SOCIAL_LINKS } from '../constants/landingFooterSocialLinks';

import '../scss/landingFooter.scss';

function LandingFooterTopMobile() {
  return (
    <div className="new-landing-footer__top-mobile">
      <div className="new-landing-footer__brand">
        <img
          src={logoMark}
          alt=""
          className="new-landing-footer__mark"
          aria-hidden="true"
        />
        <img
          src={logoGmTrade}
          alt="GMTrade"
          className="new-landing-footer__wordmark"
        />
      </div>

      <p className="new-landing-footer__tagline">
        Trade Everything. Anywhere
      </p>

      <nav
        className="new-landing-footer__social"
        aria-label="GMTrade social links"
      >
        {LANDING_FOOTER_SOCIAL_LINKS.map(({ href, label, Icon }) => (
          <ExternalLink
            key={label}
            href={href}
            className="new-landing-footer__social-link"
            ariaLabel={label}
          >
            <Icon aria-hidden="true" focusable="false" />
          </ExternalLink>
        ))}
      </nav>
    </div>
  );
}

export default function LandingFooter() {
  const isDesktop = useMedia('(min-width: 1280px)');
  const isMobile = useMedia('(max-width: 767px)');
  const markRef = useRef<HTMLImageElement>(null);
  const [hasSpun, setHasSpun] = useState(false);

  useEffect(() => {
    if (!isDesktop || hasSpun) {
      return;
    }

    const element = markRef.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 1) {
          setHasSpun(true);
          observer.disconnect();
        }
      },
      {
        root: resolveScrollRoot(element),
        threshold: 1,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [hasSpun, isDesktop]);

  return (
    <footer className="new-landing-footer">
      <div className="new-landing-footer__inner">
        <img
          src={isMobile ? logoMarkFooter : logoMark}
          alt=""
          className="new-landing-footer__background-mark"
          aria-hidden="true"
        />

        {isDesktop ? (
          <>
            <div className="new-landing-footer__top">
              <div className="new-landing-footer__brand">
                <img
                  ref={markRef}
                  src={logoMark}
                  alt=""
                  className={`new-landing-footer__mark${
                    hasSpun ? ' new-landing-footer__mark--spin-once' : ''
                  }`}
                  aria-hidden="true"
                />
                <img
                  src={logoGmTrade}
                  alt="GMTrade"
                  className="new-landing-footer__wordmark"
                />
              </div>

              <nav
                className="new-landing-footer__social"
                aria-label="GMTrade social links"
              >
                {LANDING_FOOTER_SOCIAL_LINKS.map(({ href, label, Icon }) => (
                  <ExternalLink
                    key={label}
                    href={href}
                    className="new-landing-footer__social-link"
                    ariaLabel={label}
                  >
                    <Icon aria-hidden="true" focusable="false" />
                  </ExternalLink>
                ))}
              </nav>
            </div>

            <p className="new-landing-footer__tagline">
              Trade Everything. Anywhere
            </p>
          </>
        ) : (
          <LandingFooterTopMobile />
        )}

        <div className="new-landing-footer__legal">
          <ExternalLink
            href="https://docs.gmtrade.xyz/legal/user_terms"
            className="new-landing-footer__legal-link"
          >
            Terms &amp; Conditions
          </ExternalLink>
          <div className="new-landing-footer__trading-view">
            <img src={TradingViewIcon} alt="TradingView" aria-hidden="true" height={16} width={16} />
            <span>Charts by TradingView</span>
          </div>
          <ExternalLink
            href="https://docs.gmtrade.xyz/legal/referral_terms"
            className="new-landing-footer__legal-link"
          >
            Referral Terms
          </ExternalLink>
         
        </div>
      </div>
    </footer>
  );
}
