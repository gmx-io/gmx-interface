import React from "react";
import { FiArrowLeft, FiExternalLink } from "react-icons/fi";
import { Trans } from "@lingui/macro";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

import { HeaderLink } from "./HeaderLink";
import "./Header.css";
import { isHomeSite } from "lib/legacy";
import ExternalLink from "components/ExternalLink/ExternalLink";
import logoImgLight from "img/logo_t3-light.svg";
import logoImgDark from "img/logo_t3-dark.svg";
import { ThemeContext } from "store/theme-provider";
import { useBreakpoints } from "hooks/useBreakpoints";

type Props = {
  small?: boolean;
  clickCloseIcon?: () => void;
  openSettings?: () => void;
  redirectPopupTimestamp: number;
  showRedirectModal: (to: string) => void;
};

export function AppHeaderLinks({
  small,
  openSettings,
  clickCloseIcon,
  redirectPopupTimestamp,
  showRedirectModal,
}: Props) {
  const themeContext = React.useContext(ThemeContext);
  const { mobile } = useBreakpoints();

  const linkVariants = {
    initial: { opacity: 0.8, scale: 1 },
    hover: { opacity: 1, scale: 1.05 },
    tap: { scale: 0.95 },
  };

  return (
    <div className="App-header-links">
      {small && (
        <div className="App-header-links-header">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link className="App-header-link-main" to="/">
              <img src={themeContext.theme === "light" ? logoImgLight : logoImgDark} alt="t3 Logo" />
            </Link>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="App-header-menu-icon-block mobile-cross-menu"
            onClick={() => clickCloseIcon && clickCloseIcon()}
          >
            <FiArrowLeft className="App-header-menu-icon" />
          </motion.div>
        </div>
      )}
      <motion.div
        className="App-header-link-container"
        data-tour="step-1"
        style={{ display: "flex", alignItems: "center" }}
        variants={linkVariants}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
      >
        <HeaderLink
          to="/trade"
          redirectPopupTimestamp={redirectPopupTimestamp}
          showRedirectModal={showRedirectModal}
          style={{ width: "100%" }}
        >
          <Trans>Trade</Trans>
        </HeaderLink>
      </motion.div>
      <motion.div
        className="App-header-link-container"
        data-tour="step-2"
        style={{ display: "flex", alignItems: "center" }}
        variants={linkVariants}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
      >
        <HeaderLink
          to="/earn"
          redirectPopupTimestamp={redirectPopupTimestamp}
          showRedirectModal={showRedirectModal}
          style={{ width: "100%" }}
        >
          <Trans>Earn</Trans>
        </HeaderLink>
      </motion.div>
      <motion.div
        className="App-header-link-container"
        style={{ display: "flex", alignItems: "center" }}
        variants={linkVariants}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
      >
        <HeaderLink
          to="/rewards"
          redirectPopupTimestamp={redirectPopupTimestamp}
          showRedirectModal={showRedirectModal}
          style={{ width: "100%" }}
        >
          <Trans>Rewards</Trans>
        </HeaderLink>
      </motion.div>
      {/* <motion.div
        className="App-header-link-container"
        data-tour="step-2"
        style={{ display: "flex", alignItems: "center" }}
        variants={linkVariants}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
      >
        <HeaderLink
          to="/rewards"
          redirectPopupTimestamp={redirectPopupTimestamp}
          showRedirectModal={showRedirectModal}
          style={{ width: "100%" }}
        >
          <Trans>Rewards</Trans>
        </HeaderLink>
      </motion.div> */}
      <motion.div
        className="App-header-link-container"
        style={{ display: "flex", alignItems: "center", color: mobile ? "white" : "initial" }}
        variants={linkVariants}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
      >
        <HeaderLink
          to="/swap"
          redirectPopupTimestamp={redirectPopupTimestamp}
          showRedirectModal={showRedirectModal}
          style={{ width: "100%" }}
        >
          <Trans>Swap</Trans>
        </HeaderLink>
      </motion.div>
      <motion.div
        className="App-header-link-container"
        style={{ display: "flex", alignItems: "center", color: mobile ? "white" : "initial" }}
        variants={linkVariants}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
      >
        <HeaderLink
          style={{ width: "100%" }}
          to="/dashboard"
          redirectPopupTimestamp={redirectPopupTimestamp}
          showRedirectModal={showRedirectModal}
        >
          <Trans>Dashboard</Trans>
        </HeaderLink>
      </motion.div>
      <motion.div
        className="App-header-link-container"
        variants={linkVariants}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
      >
        <ExternalLink href="https://docs.t3.money/dex/" style={{ display: "flex", alignItems: "center" }}>
          <Trans>Docs</Trans> <FiExternalLink fontSize={14} style={{ marginLeft: "0.5rem", opacity: 0.25 }} />
        </ExternalLink>
      </motion.div>
      <motion.div
        className="App-header-link-container"
        data-tour="step-2"
        style={{ display: "flex", alignItems: "center" }}
        variants={linkVariants}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
      >
        <HeaderLink
          to="/v1"
          redirectPopupTimestamp={redirectPopupTimestamp}
          showRedirectModal={showRedirectModal}
          style={{ width: "100%" }}
        >
          <Trans>V1</Trans>
        </HeaderLink>
      </motion.div>
      {small && !isHomeSite() && (
        <motion.div
          className="App-header-link-container"
          variants={linkVariants}
          initial="initial"
          whileHover="hover"
          whileTap="tap"
        >
          {/* eslint-disable-next-line */}
          <a href="#" onClick={openSettings}>
            <Trans>Settings</Trans>
          </a>
        </motion.div>
      )}
    </div>
  );
}
