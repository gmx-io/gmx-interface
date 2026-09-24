import ExternalLink from '@/components/Common/Link/ExternalLink';
import { DEFAULT_DOCS_ENV } from '@/config/env';
import logoMark from '@/img/new-landing/logo-mark.svg';
import cx from 'classnames';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useLandingHeaderScroll } from '../hooks/useLandingHeaderScroll';
import '../scss/landingHeader.scss';
import mobileMenu from '@/img/new-landing/mobile-menu.svg';
import LandingMobileMenu from './LandingMobileMenu';
import { useMedia } from 'react-use';

type LandingHeaderProps = {
  onLaunch: (e: React.MouseEvent) => void;
};

export default function LandingHeader({ onLaunch }: LandingHeaderProps) {
  const headerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isVisible, showGlass } = useLandingHeaderScroll(headerRef);
  const isMobile = useMedia('(max-width: 767px)');
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen, isMounted]);

  const header = (
    <div
      ref={headerRef}
      className={cx('landing-header', {
        'landing-header--hidden': !isVisible,
        'landing-header--glass': showGlass || isMobile,
      })}
    >
      <div className=" mx-auto flex h-[6.4rem] w-full max-w-[144rem]  items-center justify-between px-[2.4rem] md:h-[8rem] md:px-[8rem]">
        <Link
          to="/"
          className="flex items-center gap-[0.7rem] no-underline"
        >
          <img
            src={logoMark}
            alt=""
            className="h-[2.6rem] w-[2.6rem] shrink-0"
          />
          <span className="font-nunito text-[2rem] font-semibold leading-[1.05] tracking-[-0.02rem] text-[#F1F1F1] md:text-[2.4rem] md:tracking-[-0.024rem] ">
            GMTrade
          </span>
        </Link>

        <div className="flex items-center gap-[2.4rem]">
          <nav className="hidden items-center gap-[2.4rem] md:flex">
            <ExternalLink
              href="https://github.com/gmsol-labs/"
              className="ExternalLink text-[1.6rem] tracking-[-0.016rem] text-white"
            >
              Protocol
            </ExternalLink>
            <ExternalLink
              href={DEFAULT_DOCS_ENV}
              className="ExternalLink text-[1.6rem] tracking-[-0.016rem] text-white"
            >
              Docs
            </ExternalLink>
            <ExternalLink
              href="https://dune.com/gmtrade/gmtrade-analytics"
              className="ExternalLink text-[1.6rem] tracking-[-0.016rem]  text-white"
            >
              Stats
            </ExternalLink>
          </nav>

          <button
            type="button"
            onClick={onLaunch}
            className="hidden shrink-0 rounded-[0.8rem] bg-[#FA7B4E] px-[1.2rem] py-[0.8rem] text-[1.6rem] font-medium leading-[1.5] text-white transition-opacity duration-300 hover:opacity-80 md:block"
          >
            Launch App
          </button>
          <div
            className="block md:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open mobile menu"
          >
            <img src={mobileMenu} alt="" />
          </div>
        </div>
      </div>
      <LandingMobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onLaunch={onLaunch}
      />
    </div>
  );

  if (!isMounted) {
    return null;
  }

  return createPortal(header, document.body);
}
