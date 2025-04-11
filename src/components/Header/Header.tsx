import { Trans } from "@lingui/macro";
import cx from "classnames";
import { AnimatePresence as FramerAnimatePresence, motion } from "framer-motion";
import React, { ReactNode, useCallback, useEffect, useState } from "react";
import { RiMenuLine } from "react-icons/ri";
import { Link } from "react-router-dom";
import { useLocalStorage, useMedia } from "react-use";

import { getExpressTradingBannerDismissedKey, getOneClickTradingPromoHiddenKey } from "config/localStorage";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import { useChainId } from "lib/chains";
import { isHomeSite } from "lib/legacy";
import useWallet from "lib/wallets/useWallet";

import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";
import { HeaderPromoBanner } from "components/HeaderPromoBanner/HeaderPromoBanner";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import OneClickIcon from "img/ic_one_click.svg?react";
import IconBolt from "img/icon-bolt.svg?react";
import logoImg from "img/logo_GMX.svg";
import logoSmallImg from "img/logo_GMX_small.svg";

import { AppHeaderChainAndSettings } from "./AppHeaderChainAndSettings";
import { AppHeaderLinks } from "./AppHeaderLinks";
import { HeaderLink } from "./HeaderLink";
import { HomeHeaderLinks } from "./HomeHeaderLinks";

import "./Header.scss";

// Fix framer-motion old React FC type (solved in react 18)
const AnimatePresence = (props: React.ComponentProps<typeof FramerAnimatePresence> & { children: ReactNode }) => (
  <FramerAnimatePresence {...props} />
);

const FADE_VARIANTS = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const SLIDE_VARIANTS = {
  hidden: { x: "100%" },
  visible: { x: "0" },
};

const TRANSITION = { duration: 0.2 };

type Props = {
  disconnectAccountAndCloseSettings: () => void;
  openSettings: () => void;
  showRedirectModal: (to: string) => void;
};

export function OneClickPromoBanner() {
  const { chainId } = useChainId();
  const { account } = useWallet();
  const subaccountState = useSubaccountContext();
  const settings = useSettings();
  const [isOneClickPromoHidden, setIsOneClickPromoHidden] = useLocalStorage(
    getOneClickTradingPromoHiddenKey(chainId),
    false
  );

  if (isOneClickPromoHidden || subaccountState.subaccount || !settings.expressOrdersEnabled || !account) {
    return null;
  }

  return (
    <ColorfulBanner
      color="blue"
      icon={<OneClickIcon className="-mr-6 -mt-4 ml-2" />}
      onClose={() => setIsOneClickPromoHidden(true)}
    >
      <TooltipWithPortal
        handle={
          <div
            className="clickable mr-8"
            onClick={() =>
              subaccountState.tryEnableSubaccount().then((res) => {
                if (res) {
                  setIsOneClickPromoHidden(true);
                }
              })
            }
          >
            <Trans>Enable One-Click Trading</Trans>
          </div>
        }
        content={
          <Trans>
            Express Trading simplifies your trades on GMX. Instead of sending transactions directly and paying gas fees
            in ETH/AVAX, you sign secure off-chain messages.
            <br />
            <br />
            These messages are then processed on-chain for you, which helps reduce issues with network congestion and
            RPC errors. 
          </Trans>
        }
      />
    </ColorfulBanner>
  );
}

export function ExpressTradingBanner() {
  const { chainId } = useChainId();
  const settings = useSettings();
  const [isExpressTradingBannerDismissed, setIsExpressTradingBannerDismissed] = useLocalStorage(
    getExpressTradingBannerDismissedKey(chainId),
    false
  );

  if (isExpressTradingBannerDismissed || settings.expressOrdersEnabled) {
    return null;
  }

  return (
    <ColorfulBanner color="blue" icon={<IconBolt />} onClose={() => setIsExpressTradingBannerDismissed(true)}>
      <TooltipWithPortal
        handle={
          <div
            className="clickable -ml-4 mr-8"
            onClick={() => {
              settings.setExpressOrdersEnabled(true);
              setIsExpressTradingBannerDismissed(true);
            }}
          >
            <Trans>Enable Express Trading</Trans>
          </div>
        }
        content={
          <Trans>
            Express Trading simplifies your trades on GMX. Instead of sending transactions directly and paying gas fees
            in ETH/AVAX, you sign secure off-chain messages.
            <br />
            <br />
            These messages are then processed on-chain for you, which helps reduce issues with network congestion and
            RPC errors. 
          </Trans>
        }
      />
    </ColorfulBanner>
  );
}

export function Header({ disconnectAccountAndCloseSettings, openSettings, showRedirectModal }: Props) {
  const isMobile = useMedia("(max-width: 1200px)");

  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isNativeSelectorModalVisible, setIsNativeSelectorModalVisible] = useState(false);
  const isTradingIncentivesActive = false;

  const toggleDrawer = useCallback(() => {
    setIsDrawerVisible(!isDrawerVisible);
  }, [isDrawerVisible]);

  useEffect(() => {
    if (isDrawerVisible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
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
              onClick={toggleDrawer}
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
              onClick={() => setIsNativeSelectorModalVisible(!isNativeSelectorModalVisible)}
            ></motion.div>
          )}
        </AnimatePresence>
      )}
      <header data-qa="header">
        {!isMobile && (
          <div className="App-header large">
            <div className="App-header-container-left">
              <Link className="App-header-link-main" to="/">
                <img src={logoImg} className="big" alt="GMX Logo" />
                <img src={logoSmallImg} className="small" alt="GMX Logo" />
              </Link>
              {isHomeSite() ? (
                <HomeHeaderLinks showRedirectModal={showRedirectModal} />
              ) : (
                <AppHeaderLinks showRedirectModal={showRedirectModal} />
              )}
            </div>
            <div className="App-header-container-right">
              <AppHeaderChainAndSettings openSettings={openSettings} showRedirectModal={showRedirectModal} />
            </div>
          </div>
        )}
        {isMobile && (
          <div className={cx("App-header", "small", { active: isDrawerVisible })}>
            <div
              className={cx("App-header-link-container", "App-header-top", {
                active: isDrawerVisible,
              })}
            >
              <div className="App-header-container-left">
                <div className="App-header-link-main clickable" onClick={toggleDrawer}>
                  <img src={logoImg} className="big" alt="GMX Logo" />
                  <img src={logoSmallImg} className="small" alt="GMX Logo" />
                </div>
              </div>
              <div className="App-header-container-right">
                <ExpressTradingBanner />
                <OneClickPromoBanner />
                <AppHeaderChainAndSettings
                  openSettings={openSettings}
                  small
                  showRedirectModal={showRedirectModal}
                  menuToggle={
                    <div className="App-header-menu-icon-block" onClick={toggleDrawer}>
                      <RiMenuLine className="App-header-menu-icon" />
                    </div>
                  }
                />
              </div>
            </div>
          </div>
        )}
        {isTradingIncentivesActive && (
          <HeaderPromoBanner>
            <Trans>
              Trade&nbsp;on GMX&nbsp;V2 in&nbsp;Arbitrum and win&nbsp;280,000&nbsp;ARB ({">"} $500k) in prizes in{" "}
              <HeaderLink
                to="/competitions/"
                showRedirectModal={showRedirectModal}
                className="clickable inline-block underline"
              >
                two&nbsp;weekly
              </HeaderLink>{" "}
              competitions. Live&nbsp;from&nbsp;March 13th to 27th.
            </Trans>
          </HeaderPromoBanner>
        )}
      </header>
      <AnimatePresence>
        {isDrawerVisible && (
          <motion.div
            onClick={() => setIsDrawerVisible(false)}
            className="App-header-links-container App-header-drawer"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={SLIDE_VARIANTS}
            transition={TRANSITION}
          >
            {isHomeSite() ? (
              <HomeHeaderLinks
                small
                clickCloseIcon={() => setIsDrawerVisible(false)}
                showRedirectModal={showRedirectModal}
              />
            ) : (
              <AppHeaderLinks
                small
                openSettings={openSettings}
                clickCloseIcon={() => setIsDrawerVisible(false)}
                showRedirectModal={showRedirectModal}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
