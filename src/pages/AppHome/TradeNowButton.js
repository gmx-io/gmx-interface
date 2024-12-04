import { Trans } from "@lingui/macro";
import { HeaderLink } from "components/Header/HeaderLink";
import { motion } from "framer-motion";
import { useBreakpoints } from "hooks/useBreakpoints";

export const TradeNowButton = ({ showRedirectModal, redirectPopupTimestamp, ...props }) => {
  const { mobile } = useBreakpoints();

  const rocketVariants = {
    initial: { x: 5, y: 0, rotate: 0 },
    move: {
      x: [5, 6, 4, 5, 4, 5],
      y: [0, -1, 1, 0, 1, 0],
      rotate: [0, 5, -5, 0, 5, 0],
      transition: {
        repeat: Infinity,
        repeatType: "mirror",
        duration: 2,
        ease: "easeInOut",
        type: "spring",
        stiffness: 120,
        damping: 10,
      },
    },
  };

  return (
    <HeaderLink
      className="btn text-white orange-cta"
      to="/trade"
      redirectPopupTimestamp={redirectPopupTimestamp}
      showRedirectModal={showRedirectModal}
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
        backdropFilter: "blur(5px)",
        ...(props?.style || {}),
      }}
    >
      <Trans>Trade Now</Trans>
      <motion.span variants={rocketVariants} initial="initial" animate="move">
        🚀
      </motion.span>
    </HeaderLink>
  );
};
