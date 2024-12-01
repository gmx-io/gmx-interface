import { Trans } from "@lingui/macro";
import { HeaderLink } from "components/Header/HeaderLink";
import { motion } from "framer-motion";
import { useBreakpoints } from "hooks/useBreakpoints";
import { useState } from "react";

export const TradeNowButton = ({ showRedirectModal, redirectPopupTimestamp, ...props }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { mobile } = useBreakpoints();

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
        fontSize: mobile ? "2rem" : "3rem",
        background: "linear-gradient(-72deg, rgba(15,85,232,0.2), rgba(157,223,243,0.2))",
        border: "1px solid rgba(255,255,255,0.2)",
        padding: mobile ? "2rem 2rem" : "1.5rem 3rem",
        borderRadius: "4rem",
        width: "fit-content",
        backdropFilter: "blur(5px)",
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
