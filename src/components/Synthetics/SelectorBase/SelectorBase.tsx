/* eslint-disable react/no-unused-prop-types */
import { FloatingPortal, autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react";
import { Popover } from "@headlessui/react";
import cx from "classnames";
import { noop } from "lodash";
import React, { PropsWithChildren, ReactNode, useCallback, useMemo, useState } from "react";
import { BiChevronDown } from "react-icons/bi";
import { useMedia } from "react-use";

import Modal from "components/Modal/Modal";
import Tooltip from "components/Tooltip/Tooltip";

import "./SelectorBase.scss";

type Props = PropsWithChildren<{
  label: ReactNode | string | undefined;
  modalLabel: string;
  disabled?: boolean;
  popoverXOffset?: number;
  popoverYOffset?: number;
  mobileModalHeaderContent?: ReactNode;
  mobileModalContentPadding?: boolean;
  manager?: {
    isVisible: boolean;
    setIsVisible: React.Dispatch<React.SetStateAction<boolean>>;
  };
}>;

type SelectorContextType = () => void;

const selectorContext = React.createContext<SelectorContextType>(noop);
export const useSelectorClose = () => React.useContext(selectorContext);
const SelectorContextProvider = (props: PropsWithChildren<{ close: () => void }>) => {
  return <selectorContext.Provider value={props.close}>{props.children}</selectorContext.Provider>;
};

export const useSelectorStateManager = () => {
  const [isVisible, setIsVisible] = useState(false);

  const stableObject = useMemo(
    () => ({ isVisible, setIsVisible, close: () => setIsVisible(false) }),
    [isVisible, setIsVisible]
  );

  return stableObject;
};

export function SelectorBase(props: Props) {
  const isMobile = useMedia("(max-width: 1100px)");

  if (isMobile) {
    return <SelectorBaseMobile {...props} />;
  }

  return <SelectorBaseDesktop {...props} />;
}

//#region Utility components

export function SelectorBaseMobileList(props: PropsWithChildren) {
  return <div className="SelectorBaseUtils-mobile-list">{props.children}</div>;
}

export function SelectorBaseMobileButton(
  props: PropsWithChildren<{
    onSelect: () => void;
    disabled?: boolean;
  }>
) {
  return (
    <button
      className={cx("SelectorBaseUtils-mobile-row", {
        "SelectorBaseUtils-mobile-row-disabled": props.disabled,
      })}
      onClick={props.onSelect}
      type="button"
    >
      {props.children}
    </button>
  );
}

export function SelectorBaseDesktopRow(
  props: React.HTMLAttributes<HTMLTableRowElement> & {
    disabled?: boolean;
    disabledMessage?: ReactNode;
  }
) {
  if (props.disabled && props.disabledMessage) {
    return (
      <Tooltip
        as="tr"
        className={cx("SelectorBaseUtils-row", props.className)}
        content={props.disabledMessage}
        position="bottom-end"
      >
        <div className="SelectorBaseUtils-row-disabled">{props.children}</div>
      </Tooltip>
    );
  }

  return (
    <tr
      {...props}
      className={cx(
        "SelectorBaseUtils-row",
        {
          "SelectorBaseUtils-row-disabled": props.disabled,
        },
        props.className
      )}
    >
      {props.children}
    </tr>
  );
}

export function SelectorBaseTableHeadRow(props: PropsWithChildren) {
  return <tr className="SelectorBaseUtils-table-head-row">{props.children}</tr>;
}
//#endregion

function SelectorBaseDesktop(props: Props) {
  const { refs, floatingStyles } = useFloating({
    middleware: [
      offset({
        mainAxis: props.popoverYOffset ?? 0,
        crossAxis: props.popoverXOffset ?? 0,
      }),
      flip(),
      shift(),
    ],
    placement: "bottom-end",
    whileElementsMounted: autoUpdate,
  });

  const suppressPointerDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  if (props.disabled) {
    return <div className="SelectorBase-button SelectorBase-button-disabled">{props.label}</div>;
  }

  return (
    <Popover>
      {(popoverProps) => (
        <>
          <Popover.Button as="div" className="SelectorBase-button" ref={refs.setReference}>
            {props.label}
            <BiChevronDown className="-my-5 -mr-4 ml-5 inline-block align-middle text-24" />
          </Popover.Button>

          {popoverProps.open && (
            <FloatingPortal>
              <Popover.Panel
                static
                className="SelectorBase-panel"
                ref={refs.setFloating}
                style={floatingStyles}
                onPointerDown={suppressPointerDown}
              >
                <SelectorContextProvider close={popoverProps.close}>{props.children}</SelectorContextProvider>
              </Popover.Panel>
            </FloatingPortal>
          )}
        </>
      )}
    </Popover>
  );
}

function SelectorBaseMobile(props: Props) {
  const [isVisibleInternal, setIsVisibleInternal] = useState(false);

  const isVisible = props.manager?.isVisible ?? isVisibleInternal;
  const setIsVisible = props.manager?.setIsVisible ?? setIsVisibleInternal;

  const toggleVisibility = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, [setIsVisible]);

  if (props.disabled) {
    return <div className="SelectorBase-button SelectorBase-button-disabled">{props.label}</div>;
  }

  return (
    <>
      <div className="SelectorBase-button" onClick={toggleVisibility}>
        {props.label}
        {!props.disabled && <BiChevronDown className="-my-5 -mr-4 ml-5 inline-block align-middle text-24" />}
      </div>
      <Modal
        setIsVisible={setIsVisible}
        isVisible={isVisible}
        label={props.modalLabel}
        className="SelectorBase-mobile-modal"
        headerContent={props.mobileModalHeaderContent}
        contentPadding={props.mobileModalContentPadding}
      >
        <SelectorContextProvider close={toggleVisibility}>{props.children}</SelectorContextProvider>
      </Modal>
    </>
  );
}
