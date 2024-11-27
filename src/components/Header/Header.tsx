import React, { ReactNode, useContext, useEffect, useState } from "react";
import cx from "classnames";

import { AppHeaderUser } from "./AppHeaderUser";
import { AppHeaderLinks } from "./AppHeaderLinks";

import logoImgLight from "img/logo_t3-light.svg";
import logoImgDark from "img/logo_t3-dark.svg";
import logoSmallImg from "img/t3_logo_small.svg";
import { RiMenuLine } from "react-icons/ri";
import { FiX } from "react-icons/fi";
import { AnimatePresence as FramerAnimatePresence, motion } from "framer-motion";

import "./Header.css";
import { Link } from "react-router-dom";
import { isHomeSite } from "lib/legacy";
import { HomeHeaderLinks } from "./HomeHeaderLinks";
import { ThemeContext } from "store/theme-provider";

// Fix framer-motion old React FC type (solved in react 18)
const AnimatePresence = (props: React.ComponentProps<typeof FramerAnimatePresence> & { children: ReactNode }) => (
  <FramerAnimatePresence {...props} />
);

const fadeVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const slideVariants = {
  hidden: { x: "-100%" },
  visible: { x: 0 },
};

type Props = {
  disconnectAccountAndCloseSettings: () => void;
  openSettings: () => void;

  setApprovalsModalVisible: (visible: boolean) => void;
  setDoesUserHaveEmail: (visible: boolean) => void;
  redirectPopupTimestamp: number;
  showRedirectModal: (to: string) => void;
  activeModal: string | null;
  setActiveModal: (modal: string | null) => void;
  setNewUser: (status: boolean) => void;
};

export function Header({
  disconnectAccountAndCloseSettings,
  openSettings,

  setApprovalsModalVisible,
  setDoesUserHaveEmail,
  redirectPopupTimestamp,
  showRedirectModal,
  activeModal,
  setActiveModal,
  setNewUser,
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

  const theme = useContext(ThemeContext);

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
              variants={fadeVariants}
              transition={{ duration: 0.2 }}
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
              variants={fadeVariants}
              transition={{ duration: 0.2 }}
              onClick={() => setIsNativeSelectorModalVisible(!isNativeSelectorModalVisible)}
            ></motion.div>
          )}
        </AnimatePresence>
      )}
      <header>
        <div className="App-header large">
          <div className="App-header-container-left">
            <Link className="App-header-link-main" to="/">
              <img src={theme.isLight ? logoImgLight : logoImgDark} className="big" alt="t3 Logo" />
              <img src={logoSmallImg} className="small mobile-logo" alt="t3 Logo" style={{ marginLeft: "16px" }} />
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
              setApprovalsModalVisible={setApprovalsModalVisible}
              setDoesUserHaveEmail={setDoesUserHaveEmail}
              redirectPopupTimestamp={redirectPopupTimestamp}
              showRedirectModal={showRedirectModal}
              activeModal={activeModal}
              setActiveModal={setActiveModal}
              setNewUser={setNewUser}
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
              <div className="App-header-link-main clickable" onClick={() => setIsDrawerVisible(!isDrawerVisible)}>
                <img src={theme.isLight ? logoImgLight : logoImgDark} className="big" alt="t3 Logo" />
                <img src={logoSmallImg} className="small mobile-logo" alt="t3 Logo" style={{ marginLeft: "9px" }} />
              </div>
            </div>
            <div className="App-header-container-right">
              <AppHeaderUser
                disconnectAccountAndCloseSettings={disconnectAccountAndCloseSettings}
                openSettings={openSettings}
                small
                setApprovalsModalVisible={setApprovalsModalVisible}
                setDoesUserHaveEmail={setDoesUserHaveEmail}
                redirectPopupTimestamp={redirectPopupTimestamp}
                showRedirectModal={showRedirectModal}
                activeModal={activeModal}
                setActiveModal={setActiveModal}
                setNewUser={setNewUser}
              />
              <div className="App-header-menu-icon-block" onClick={() => setIsDrawerVisible(!isDrawerVisible)}>
                {!isDrawerVisible && (
                  <RiMenuLine className={"App-header-menu-icon"} color={theme.isLight ? "black" : "white"} />
                )}
                {isDrawerVisible && (
                  <FiX className={"App-header-menu-icon"} color={theme.isLight ? "black" : "white"} />
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
      <AnimatePresence>
        {isDrawerVisible && (
          <motion.div
            onClick={() => setIsDrawerVisible(false)}
            className="App-header-links-container App-header-drawer"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={slideVariants}
            transition={{ duration: 0.2 }}
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
