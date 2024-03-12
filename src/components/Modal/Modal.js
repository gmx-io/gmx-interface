import "./Modal.css";
import React, { useRef, useEffect, useContext } from "react";
import cx from "classnames";
import { motion, AnimatePresence } from "framer-motion";
import { RemoveScroll } from "react-remove-scroll";
import { MdClose } from "react-icons/md";
import { ThemeContext } from "store/theme-provider";

export default function Modal(props) {
  const { isVisible, setIsVisible, className, zIndex, onAfterOpen, isWalletConnect } = props;

  const modalRef = useRef(null);

  useEffect(() => {
    function close(e) {
      if (e.keyCode === 27 && setIsVisible) {
        setIsVisible(false);
      }
    }
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [setIsVisible]);

  useEffect(() => {
    if (typeof onAfterOpen === "function") onAfterOpen();
  }, [onAfterOpen]);

  const fadeVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const themeContext = useContext(ThemeContext);

  // console.log("modal ", themeContext.theme);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={cx("Modal", className)}
          id={themeContext.theme}
          style={{ zIndex }}
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={fadeVariants}
          transition={{ duration: 0.2 }}
        >
          <div
            className={`${isWalletConnect ? "Wallet-Connect-Modal-backdrop" : "Modal-backdrop"}  `}
            style={{
              overflow: isVisible ? "hidden" : "visible",
              position: "fixed",
            }}
            onClick={() => setIsVisible(false)}
          ></div>
          <div className={`Modal-content`}>
            <div className="Modal-header-wrapper">
              <div className="Modal-title-bar">
                <div className="Modal-title">{props.label}</div>
                {!isWalletConnect && (
                  <div className="Modal-close-button" onClick={() => setIsVisible(false)}>
                    <MdClose fontSize={20} className="Modal-close-icon" />
                  </div>
                )}
              </div>
              {props.headerContent && props.headerContent()}
            </div>
            {/* <div className="divider" /> */}
            <RemoveScroll>
              <div className={cx("Modal-body")} ref={modalRef}>
                {props.children}
              </div>
            </RemoveScroll>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
