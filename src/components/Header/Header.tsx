import React, { ReactNode, useEffect, useState } from "react";
import cx from "classnames";

import { AppHeaderUser } from "./AppHeaderUser";
import { AppHeaderLinks } from "./AppHeaderLinks";

import logoImg from "img/logo_GMX.svg";
import logoSmallImg from "img/logo_GMX_small.svg";
import { RiMenuLine } from "react-icons/ri";
import { FaTimes } from "react-icons/fa";
import { AnimatePresence as FramerAnimatePresence, motion } from "framer-motion";

import "./Header.css";
import { Link } from "react-router-dom";
import { isHomeSite } from "lib/legacy";
import { HomeHeaderLinks } from "./HomeHeaderLinks";
import { Trans } from "@lingui/macro";
import { HeaderPromoBanner } from "components/HeaderPromoBanner/HeaderPromoBanner";
import { HeaderLink } from "./HeaderLink";

// Fix framer-motion old React FC type (solved in react 18)
const AnimatePresence = (props: React.ComponentProps<typeof FramerAnimatePresence> & { children: ReactNode }) => (
  <FramerAnimatePresence {...props} />
);

const FADE_VARIANTS = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const SLIDE_VARIANTS = {
  hidden: { x: "-100%" },
  visible: { x: 0 },
};

const TRANSITION = { duration: 0.2 };

type Props = {
  disconnectAccountAndCloseSettings: () => void;
  openSettings: () => void;
  redirectPopupTimestamp: number;
  tradePageVersion: number;
  showRedirectModal: (to: string) => void;
};

export function Header({
  disconnectAccountAndCloseSettings,
  openSettings,
  redirectPopupTimestamp,
  showRedirectModal,
  tradePageVersion,
}: Props) {
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isNativeSelectorModalVisible, setIsNativeSelectorModalVisible] = useState(false);

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
              onClick={() => setIsNativeSelectorModalVisible(!isNativeSelectorModalVisible)}
            ></motion.div>
          )}
        </AnimatePresence>
      )}
      <header>
        <div className="App-header large">
          <div className="App-header-container-left">
            <Link className="App-header-link-main" to="/">
              <img src={logoImg} className="big" alt="GMX Logo" />
              <img src={logoSmallImg} className="small" alt="GMX Logo" />
            </Link>
            {isHomeSite() ? (
              <HomeHeaderLinks redirectPopupTimestamp={redirectPopupTimestamp} showRedirectModal={showRedirectModal} />
            ) : (
              <AppHeaderLinks redirectPopupTimestamp={redirectPopupTimestamp} showRedirectModal={showRedirectModal} />
            )}
          </div>
          <div className="App-header-container-right">
            <AppHeaderUser
              disconnectAccountAndCloseSettings={disconnectAccountAndCloseSettings}
              openSettings={openSettings}
              redirectPopupTimestamp={redirectPopupTimestamp}
              showRedirectModal={showRedirectModal}
              tradePageVersion={tradePageVersion}
            />
          </div>
        </div>
        <div className={cx("App-header", "small", { active: isDrawerVisible })}>
          <div
            className={cx("App-header-link-container", "App-header-top", {
              active: isDrawerVisible,
            })}
          >
            <div className="App-header-container-left">
              <div className="App-header-menu-icon-block" onClick={() => setIsDrawerVisible(!isDrawerVisible)}>
                {!isDrawerVisible && <RiMenuLine className="App-header-menu-icon" />}
                {isDrawerVisible && <FaTimes className="App-header-menu-icon" />}
              </div>
              <div className="App-header-link-main clickable" onClick={() => setIsDrawerVisible(!isDrawerVisible)}>
                <img src={logoImg} className="big" alt="GMX Logo" />
                <img src={logoSmallImg} className="small" alt="GMX Logo" />
              </div>
            </div>
            <div className="App-header-container-right">
              <AppHeaderUser
                disconnectAccountAndCloseSettings={disconnectAccountAndCloseSettings}
                openSettings={openSettings}
                small
                redirectPopupTimestamp={redirectPopupTimestamp}
                showRedirectModal={showRedirectModal}
                tradePageVersion={tradePageVersion}
              />
            </div>
          </div>
        </div>
        <HeaderPromoBanner>
          <Trans>
            Trade&nbsp;on GMX&nbsp;V2 in&nbsp;Arbitrum and win&nbsp;280,000&nbsp;ARB ({">"} $500k) in prizes in{" "}
            <HeaderLink
              to="/competitions/"
              redirectPopupTimestamp={redirectPopupTimestamp}
              showRedirectModal={showRedirectModal}
              className="underline inline-block clickable"
            >
              two&nbsp;weekly
            </HeaderLink>{" "}
            competitions. Live&nbsp;from&nbsp;March 13th to 27th.
          </Trans>
        </HeaderPromoBanner>
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
                redirectPopupTimestamp={redirectPopupTimestamp}
                showRedirectModal={showRedirectModal}
              />
            ) : (
              <AppHeaderLinks
                small
                openSettings={openSettings}
                clickCloseIcon={() => setIsDrawerVisible(false)}
                redirectPopupTimestamp={redirectPopupTimestamp}
                showRedirectModal={showRedirectModal}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
