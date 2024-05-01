/* eslint-disable react/no-unused-prop-types */
import { FloatingPortal, autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react";
import { Popover } from "@headlessui/react";
import cx from "classnames";
import { AnimatePresence, Variants, motion } from "framer-motion";
import { noop } from "lodash";
import React, { PropsWithChildren, ReactNode, startTransition, useCallback, useState } from "react";
import { BiChevronDown } from "react-icons/bi";
import { useMedia } from "react-use";

import Modal from "components/Modal/Modal";
import Tooltip from "components/Tooltip/Tooltip";

import "./NewSelectorBase.scss";

type Props = PropsWithChildren<{
  label: string | undefined;
  modalLabel: string;
}>;

type NewSelectorContextType = () => void;

const newSelectorContext = React.createContext<NewSelectorContextType>(noop);
export const useNewSelectorClose = () => React.useContext(newSelectorContext);
const NewSelectorContextProvider = (props: PropsWithChildren<{ close: () => void }>) => {
  const handleClose = useCallback(() => {
    startTransition(props.close);
  }, [props.close]);

  return <newSelectorContext.Provider value={handleClose}>{props.children}</newSelectorContext.Provider>;
};

export function NewSelectorBase(props: Props) {
  const isMobile = useMedia("(max-width: 1100px)");

  if (isMobile) {
    return <NewSelectorBaseMobile {...props} />;
  }

  return <NewSelectorBaseDesktop {...props} />;
}

export function NewSelectorBaseMobileList(props: PropsWithChildren) {
  return <div className="NewSelectorBaseUtils-mobile-list">{props.children}</div>;
}

export function NewSelectorBaseMobileButton(
  props: PropsWithChildren<{
    onSelect: () => void;
    isSelected: boolean;
    disabled?: boolean;
  }>
) {
  return (
    <button
      className={cx("NewSelectorBaseUtils-mobile-row", {
        "NewSelectorBaseUtils-mobile-row-selected": props.isSelected,
        "NewSelectorBaseUtils-mobile-row-disabled": props.disabled,
      })}
      onClick={props.onSelect}
      // disabled={props.disabled}
    >
      {props.children}
    </button>
  );
}

export function NewSelectorBaseDesktopRow(
  props: React.HTMLAttributes<HTMLTableRowElement> & {
    isSelected?: boolean;
    disabled?: boolean;
    disabledMessage?: ReactNode;
  }
) {
  if (props.disabled && props.disabledMessage) {
    return (
      <Tooltip
        as="tr"
        className={cx(
          "NewSelectorBaseUtils-row",
          {
            "NewSelectorBaseUtils-row-selected": props.isSelected,
          },
          props.className
        )}
        content={props.disabledMessage}
        position="bottom-end"
      >
        <div className="NewSelectorBaseUtils-row-disabled">{props.children}</div>
      </Tooltip>
    );
  }

  return (
    <tr
      {...props}
      className={cx(
        "NewSelectorBaseUtils-row",
        {
          "NewSelectorBaseUtils-row-selected": props.isSelected,
          "NewSelectorBaseUtils-row-disabled": props.disabled,
        },
        props.className
      )}
    >
      {props.children}
    </tr>
  );
}

const FADE_VARIANTS: Variants = {
  hidden: { opacity: 0, pointerEvents: "none" },
  visible: { opacity: 1, pointerEvents: "auto" },
};

const TRANSITION = { duration: 0.1 };

function NewSelectorBaseDesktop(props: Props) {
  const { refs, floatingStyles } = useFloating({
    middleware: [offset(), flip(), shift()],
    placement: "bottom-end",
    whileElementsMounted: autoUpdate,
  });

  const suppressPointerDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  return (
    <Popover className="SwapBox-info-dropdown">
      {(popoverProps) => (
        <>
          <Popover.Button as="button" className="NewSelectorBase-button" ref={refs.setReference}>
            {props.label}
            <BiChevronDown className="TokenSelector-caret" />
          </Popover.Button>
          {/* @ts-ignore */}
          <AnimatePresence>
            {popoverProps.open && (
              <FloatingPortal>
                <Popover.Panel
                  static
                  className="NewSelectorBase-panel"
                  as={motion.div}
                  ref={refs.setFloating}
                  style={floatingStyles}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={FADE_VARIANTS}
                  transition={TRANSITION}
                  onPointerDown={suppressPointerDown}
                >
                  <NewSelectorContextProvider close={popoverProps.close}>{props.children}</NewSelectorContextProvider>
                </Popover.Panel>
              </FloatingPortal>
            )}
          </AnimatePresence>
        </>
      )}
    </Popover>
  );
}

function NewSelectorBaseMobile(props: Props) {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  return (
    <>
      <button className="SwapBox-info-dropdown NewSelectorBase-button" onClick={toggleVisibility}>
        {props.label}
        <BiChevronDown className="TokenSelector-caret" />
      </button>
      <Modal setIsVisible={setIsVisible} isVisible={isVisible} label={props.modalLabel}>
        <NewSelectorContextProvider close={toggleVisibility}>{props.children}</NewSelectorContextProvider>
      </Modal>
    </>
  );
}
