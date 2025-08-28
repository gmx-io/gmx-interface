import cx from "classnames";
import { AnimatePresence, Variants, motion } from "framer-motion";
import React, { PropsWithChildren, ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import { FaCross } from "react-icons/fa";
import { RemoveScroll } from "react-remove-scroll";

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
  contentClassName?: string;
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
  onAfterOpen,
  setIsVisible,
  qa,
  contentClassName,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(
    function blurOutsideOnVisible() {
      if (isVisible) {
        const focusedElement = document.activeElement;
        const isNotBody = !document.body.isSameNode(focusedElement);
        const isOutside = !modalRef.current?.contains(focusedElement);

        if (focusedElement && isNotBody && isOutside) {
          (focusedElement as HTMLElement).blur();
        }
      }
    },
    [isVisible]
  );

  const modalStyle = useMemo(() => ({ zIndex }), [zIndex]);

  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <RemoveScroll>
          <motion.div
            className={cx("Modal", className)}
            ref={modalRef}
            style={modalStyle}
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

            <div
              className={cx("Modal-content flex flex-col gap-16 p-20", contentClassName)}
              onClick={stopPropagation}
              data-qa={qa}
            >
              <div className="Modal-header-wrapper flex flex-col gap-8">
                <div className="Modal-title-bar">
                  <div className="Modal-title font-medium text-typography-primary">{label}</div>
                  <div className="Modal-close-button pb-5" onClick={() => setIsVisible(false)}>
                    <FaCross fontSize={20} className="Modal-close-icon" />
                  </div>
                </div>
                {headerContent}
              </div>
              <div className="overflow-auto">
                <div className={cx("Modal-body", { "no-content-padding": !contentPadding })}>{children}</div>
              </div>
              {footerContent && (
                <>
                  <div>{footerContent}</div>
                </>
              )}
            </div>
          </motion.div>
        </RemoveScroll>
      )}
    </AnimatePresence>
  );
}
