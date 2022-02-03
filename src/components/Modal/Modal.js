import React, { useEffect } from "react";
import cx from "classnames";
import { motion, AnimatePresence } from "framer-motion";

import { MdClose } from "react-icons/md";
import { useLockBodyScroll, createBreakpoint } from "react-use";

import "./Modal.css";

export default function Modal(props) {
  const { isVisible, setIsVisible, className, zIndex } = props;
  const useBreakpoint = createBreakpoint();
  let isMobile = useBreakpoint() === "tablet";
  useLockBodyScroll(isVisible && !isMobile);

  useEffect(() => {
    function close(e) {
      if (e.keyCode === 27) {
        setIsVisible(false);
      }
    }
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [setIsVisible]);

  const fadeVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={cx("Modal", className)}
          style={{ zIndex }}
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={fadeVariants}
          transition={{ duration: 0.2 }}
        >
          <div
            className="Modal-backdrop"
            onClick={() => setIsVisible(false)}
          ></div>
          <div className="Modal-content">
            <div className="Modal-title-bar">
              <div className="Modal-title">{props.label}</div>
              <div
                className="Modal-close-button"
                onClick={() => setIsVisible(false)}
              >
                <MdClose fontSize={20} className="Modal-close-icon" />
              </div>
            </div>
            <div className="divider" />
            <div className="Modal-body">{props.children}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
