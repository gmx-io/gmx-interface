/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import './Modal.scss';

import cx from 'classnames';
import { AnimatePresence, motion, Variants } from 'framer-motion';
import React, {
  PropsWithChildren,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef
} from 'react';
import { MdClose } from 'react-icons/md';
import { RemoveScroll } from 'react-remove-scroll';

const FADE_VARIANTS: Variants = {
  hidden: { opacity: 0, pointerEvents: 'none' },
  visible: { opacity: 1, pointerEvents: 'auto' },
};

const VISIBLE_STYLES: React.CSSProperties = {
  overflow: 'hidden',
  position: 'fixed',
};

const HIDDEN_STYLES: React.CSSProperties = {
  overflow: 'visible',
  position: 'fixed',
};

const TRANSITION = { duration: 0.2 };

export type ModalProps = PropsWithChildren<{
  className?: string;
  isVisible?: boolean;
  setIsVisible: any;
  zIndex?: number;
  label?: React.ReactNode;
  headerContent?: React.ReactNode;
  footerContent?: ReactNode;
  onAfterOpen?: () => void;
  contentPadding?: boolean;
  qa?: string;
  noDivider?: boolean;
  closeOnClickModal?: boolean;
  animateOnMount?: boolean;
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
  closeOnClickModal = true,
  animateOnMount = true,
  onAfterOpen,
  setIsVisible,
  qa,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: KeyboardEvent) {
      if (e.keyCode === 27 && setIsVisible) {
        setIsVisible(false);
      }
    }
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [setIsVisible]);

  useEffect(() => {
    if (typeof onAfterOpen === 'function') onAfterOpen();
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

  const style = useMemo(() => ({ zIndex }), [zIndex]);

  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={cx('Modal', className)}
          ref={modalRef}
          style={style}
          initial={animateOnMount ? 'hidden' : false}
          animate="visible"
          exit="hidden"
          variants={FADE_VARIANTS}
          transition={TRANSITION}
        >
          <div
            className="Modal-backdrop"
            style={isVisible ? VISIBLE_STYLES : HIDDEN_STYLES}
            onClick={() => {
              if (closeOnClickModal) {
                setIsVisible(false)
              }
            }}
          />
          <div className="Modal-content" onClick={stopPropagation} data-qa={qa}>
            <div className="Modal-header-wrapper">
              <div className="Modal-title-bar">
                <div className="Modal-title">{label}</div>
                <div
                  className="Modal-close-button"
                  onClick={() => setIsVisible(false)}
                >
                  <MdClose fontSize={14} className="Modal-close-icon" />
                </div>
              </div>
              {headerContent}
            </div>
            {!noDivider && <div className="divider" />}
            <RemoveScroll className="overflow-auto">
              <div
                className={cx('Modal-body', {
                  'no-content-padding': !contentPadding,
                })}
                ref={modalBodyRef}
              >
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
