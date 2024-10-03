import React, { useRef, useEffect, useMemo, PropsWithChildren, useCallback, ReactNode } from "react";
import cx from "classnames";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { RemoveScroll } from "react-remove-scroll";
import { MdClose } from "react-icons/md";

import "./Modal.css";

const FADE_VARIANTS: Variants = {
  hidden: { opacity: 0, pointerEvents: "none" },
  visible: { opacity: 1, pointerEvents: "auto" },
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
  className?: string;
  isVisible?: boolean;
  setIsVisible: (isVisible: boolean) => void;
  zIndex?: number;
  label?: React.ReactNode;
  headerContent?: React.ReactNode;
  footerContent?: ReactNode;
  onAfterOpen?: () => void;
  contentPadding?: boolean;
  qa?: string;
  noDivider?: boolean;
}>;

export default function Modal({
  className,
  isVisible,
  label,
  zIndex,
  children,
  headerContent,
  footerContent,
  contentPadding = true,
  noDivider = false,
  onAfterOpen,
  setIsVisible,
  qa,
}: ModalProps) {
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

  const stopPropagation = useCallback((e: React.MouseEvent) => {
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
          />
          <div className="Modal-content" onClick={stopPropagation} data-qa={qa}>
            <div className="Modal-header-wrapper">
              <div className="Modal-title-bar">
                <div className="Modal-title">{label}</div>
                <div className="Modal-close-button pb-5" onClick={() => setIsVisible(false)}>
                  <MdClose fontSize={20} className="Modal-close-icon" />
                </div>
              </div>
              {headerContent}
            </div>
            {!noDivider && <div className="divider" />}
            <RemoveScroll className="overflow-auto">
              <div className={cx("Modal-body", { "no-content-padding": !contentPadding })} ref={modalRef}>
                {children}
              </div>
            </RemoveScroll>
            {footerContent && (
              <>
                <div className="divider" />
                <div>{footerContent}</div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
