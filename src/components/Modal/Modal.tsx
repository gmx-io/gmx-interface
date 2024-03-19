import React, { useRef, useEffect, useMemo, PropsWithChildren, useCallback } from "react";
import cx from "classnames";
import { motion, AnimatePresence } from "framer-motion";
import { RemoveScroll } from "react-remove-scroll";
import { MdClose } from "react-icons/md";

import "./Modal.css";

const FADE_VARIANTS = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const VISIBLE_STYLES: React.CSSProperties = {
  overflow: "hidden",
  position: "fixed",
};

const HIDDEN_STYLES: React.CSSProperties = {
  overflow: "visible",
  position: "fixed",
};

const TRANSITION = { duration: 0.2 };

export type ModalProps = PropsWithChildren<{
  isVisible?: boolean;
  setIsVisible: (isVisible: boolean) => void;
  className?: string;
  zIndex?: number;
  onAfterOpen?: () => void;
  label?: React.ReactNode;
  headerContent?: () => React.ReactNode;
}>;

export default function Modal(props: ModalProps) {
  const { isVisible, setIsVisible, className, zIndex, onAfterOpen } = props;

  const modalRef = useRef(null);

  useEffect(() => {
    function close(e: KeyboardEvent) {
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

  const style = useMemo(() => ({ zIndex }), [zIndex]);

  const stopPropagation = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
  }, []);

  return (
    // @ts-ignore
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={cx("Modal", className)}
          style={style}
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={FADE_VARIANTS}
          transition={TRANSITION}
        >
          <div
            className="Modal-backdrop"
            style={isVisible ? VISIBLE_STYLES : HIDDEN_STYLES}
            onClick={() => setIsVisible(false)}
          ></div>
          <div className="Modal-content" onClick={stopPropagation}>
            <div className="Modal-header-wrapper">
              <div className="Modal-title-bar">
                <div className="Modal-title">{props.label}</div>
                <div className="Modal-close-button" onClick={() => setIsVisible(false)}>
                  <MdClose fontSize={20} className="Modal-close-icon" />
                </div>
              </div>
              {props.headerContent && props.headerContent()}
            </div>
            <div className="divider" />
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
