import { Trans } from "@lingui/macro";
import { HeaderLink } from "components/Header/HeaderLink";
import { motion } from "framer-motion";
import { useState } from "react";

export const TradeNowButton = ({ showRedirectModal, redirectPopupTimestamp, ...props }) => {
  const [isHovered, setIsHovered] = useState(false);

  const rocketVariants = {
    initial: { x: 0, y: 0, rotate: 0 },
    hover: {
      x: 5,
      y: 0,
      rotate: -45,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  return (
    <HeaderLink
      className="btn text-white orange-cta"
      to="/trade"
      redirectPopupTimestamp={redirectPopupTimestamp}
      showRedirectModal={showRedirectModal}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        width: "fit-content",
        margin: "0 auto",
        ...(props?.style || {}),
      }}
    >
      <Trans>Trade Now</Trans>
      <motion.span variants={rocketVariants} initial="initial" animate={isHovered ? "hover" : "initial"}>
        🚀
      </motion.span>
    </HeaderLink>
  );
};
