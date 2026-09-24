import './Header.scss';
import './HeaderCollapse.scss';

import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useMedia } from 'react-use';
import { useAppStore } from '@/zustand/useAppStore';

import cx from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';
import ExternalLink from '@/components/Common/Link/ExternalLink';
import githubIcon from '@/img/Github.svg';
import telegramIcon from '@/img/Telegram.svg';
import discordIcon from '@/img/Discord.svg';
import xIcon from '@/img/X.svg';
import { AppHeaderLinks } from '@/components/Header/AppHeaderLinks';
import { AppHeaderOther } from '@/components/Header/AppHeaderOther';
import closeIcon from '@/img/close.png';
import logoImgWithText from '@/img/logo_gmx_solana.svg';
// import logo_new from '@/img/logo_new.svg';
// import logoImg from '@/img/logo_gmx_solana_24.svg';
import logo_new from '@/img/logo-gm-trade-white.svg';
import logoImg from '@/img/logo-collapse.svg';
import { t } from '@lingui/macro';
const FADE_VARIANTS = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const SLIDE_VARIANTS = {
  hidden: { x: '-100%' },
  visible: { x: 0 },
};

const TRANSITION = { duration: 0.2 };

interface MobileHeaderProps {
  onClose?: () => void;
}
type SocialLink = {
  link: string;
  name: string;
  icon: string;
};

export function MobileHeader({ onClose }: MobileHeaderProps) {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  const settings = useAppStore((state) => state.settings);
  const { isCollapsed, setIsCollapsed } = settings;
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
  useEffect(() => {
    if (isCollapsed) {
      setIsCollapsed(false);
    }
  }, [isCollapsed, setIsCollapsed]);
  return (
    <div className="mobile-header-content">
      {/* Logo */}
      <div className="mobile-header-logo">
        <Link to="/trade" className="flex items-center">
          <img src={logo_new} alt="GMX Solana Logo" className="max-h-[4rem]" />
        </Link>
        <img
          src={closeIcon}
          alt="Close"
          style={{
            width: '1.2rem',
            height: '1.2rem',
            alignSelf: 'center',
            cursor: 'pointer',
          }}
          onClick={onClose}
        />
      </div>

      {/* link */}
      {!isLandingPage && (
        <div className="mobile-header-links">
          <AppHeaderLinks clickCloseIcon={onClose} />
        </div>
      )}

      <div className="mobile-header-user">
        <AppHeaderOther />
      </div>

      <div>
        <div>
          {SOCIAL_LINKS.map((platform) => (
            <ExternalLink key={platform.name} href={platform.link}>
              <img src={platform.icon} alt={platform.name} width="100%" />
            </ExternalLink>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Header() {
  const isMobile = useMedia('(max-width: 768px)');
  const isMaxScreen = useMedia('(min-width: 1025px)');
  const isScreen1280 = useMedia('(max-width: 1280px)');
  const isScreen1024 = useMedia('(max-width: 1024px)');
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  const settings = useAppStore((state) => state.settings);
  const { isCollapsed } = settings;

  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isNativeSelectorModalVisible, setIsNativeSelectorModalVisible] =
    useState(false);

  useEffect(() => {
    if (isDrawerVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isDrawerVisible]);

  return (
    <>
      {isDrawerVisible && (
        <AnimatePresence>
          {isDrawerVisible && (
            <motion.div
              className="App-header-backdrop"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={FADE_VARIANTS}
              transition={TRANSITION}
              onClick={() => setIsDrawerVisible(!isDrawerVisible)}
            ></motion.div>
          )}
        </AnimatePresence>
      )}

      {isNativeSelectorModalVisible && (
        <AnimatePresence>
          {isNativeSelectorModalVisible && (
            <motion.div
              className="selector-backdrop"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={FADE_VARIANTS}
              transition={TRANSITION}
              onClick={() =>
                setIsNativeSelectorModalVisible(!isNativeSelectorModalVisible)
              }
            ></motion.div>
          )}
        </AnimatePresence>
      )}

      {!isScreen1024 && (
        <header
          data-qa="header"
          className={cx('App-header-container', {
            hello: isDrawerVisible,
            collapsed: isCollapsed,
          })}
        >
          {!isMobile && (
            <div
              className={cx('App-header-left App-header large', {
                'w-[5rem]': isCollapsed,
                'w-[20rem]': !isCollapsed && !isScreen1280,
                'w-[16rem]': !isCollapsed && isScreen1280,
              })}
            >
              <div className="App-header-container-left">
                <Link
                  className={`App-header-link-main text-body-medium h-[5.6rem] items-center ${isCollapsed && "justify-center !p-0"}`}
                  style={{ paddingLeft: isMaxScreen ? '1rem' : '0' }}
                  to="/trade"
                >
                  {isCollapsed ? (
                    <img
                      src={logoImg}
                      alt="GMX Solana Logo"
                      className="max-h-[24px]"
                    />
                  ) : (
                    <img
                      src={logo_new}
                      alt="GMX Solana Logo"
                      // className="ml-[0.8rem]"
                      className="w-[14.8rem]"
                    />
                  )}
                </Link>
                {!isLandingPage && <AppHeaderLinks collapsed={isCollapsed} />}
              </div>
              <div className="App-header-container-right">
                {isLandingPage ? (
                  <AppHeaderOther minimal />
                ) : (
                  <AppHeaderOther />
                )}
              </div>
            </div>
          )}

          {/* {isMobile && (
          <div
            className={cx('App-header', 'small', { active: isDrawerVisible })}
          >
            <div
              className={cx('App-header-link-container', 'App-header-top', {
                active: isDrawerVisible,
              })}
            >
              <div className="App-header-container-left">
                {!isLandingPage && (
                  <div
                    className="App-header-menu-icon-block"
                    onClick={() => setIsDrawerVisible(!isDrawerVisible)}
                  >
                    {!isDrawerVisible && (
                      <RiMenuLine className="App-header-menu-icon" />
                    )}
                    {isDrawerVisible && (
                      <FaTimes className="App-header-menu-icon" />
                    )}
                  </div>
                )}
                <div
                  className="App-header-link-main clickable text-body-medium"
                  onClick={() =>
                    !isLandingPage && setIsDrawerVisible(!isDrawerVisible)
                  }
                >
                  <img src={logoImg} className="big" alt="GMX Solana Logo" />
                  <img src={logoImg} className="small" alt="GMX Solana Logo" />
                </div>
              </div>
              <div className="App-header-container-right">
                {isLandingPage ? (
                  <AppHeaderOther small minimal />
                ) : (
                  <AppHeaderOther small />
                )}
              </div>
            </div>
          </div>
        )} */}
        </header>
      )}

      <AnimatePresence>
        {!isLandingPage && isDrawerVisible && (
          <motion.div
            onClick={() => setIsDrawerVisible(false)}
            className="App-header-links-container App-header-drawer"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={SLIDE_VARIANTS}
            transition={TRANSITION}
          >
            <AppHeaderLinks
              small
              clickCloseIcon={() => setIsDrawerVisible(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}