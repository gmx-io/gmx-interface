import React, { useRef, useEffect } from "react";
import cx from "classnames";
import { motion, AnimatePresence } from "framer-motion";

import { MdClose } from "react-icons/md";

import "./Modal.css";
import useLockBodyScroll, { TOUCH_MOVE_CONTAINER_CLASS_NAME } from "lib/useLockBodyScroll";

export default function Modal(props) {
  const { isVisible, setIsVisible, className, zIndex, onAfterOpen, disableBodyScrollLock, allowContentTouchMove } =
    props;

  const modalRef = useRef(null);

  useLockBodyScroll(modalRef, isVisible, {
    disableLock: disableBodyScrollLock,
    allowTouchMove: allowContentTouchMove,
  });

  useEffect(() => {
    function close(e) {
      if (e.keyCode === 27) {
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
            style={{
              overflow: isVisible ? "hidden" : "visible",
              position: "fixed",
            }}
            onClick={() => setIsVisible(false)}
          ></div>
          <div className="Modal-content">
            <div className="Modal-title-bar">
              <div className="Modal-title">{props.label}</div>
              <div className="Modal-close-button" onClick={() => setIsVisible(false)}>
                <MdClose fontSize={20} className="Modal-close-icon" />
              </div>
            </div>
            <div className="divider" />
            <div className={cx("Modal-body", TOUCH_MOVE_CONTAINER_CLASS_NAME)} ref={modalRef}>
              {props.children}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
