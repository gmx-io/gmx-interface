import { FloatingPortal, autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react";
import { Popover } from "@headlessui/react";
import cx from "classnames";
import { noop } from "lodash";
import React, { PropsWithChildren, ReactNode, useCallback, useState } from "react";
import { BiChevronDown } from "react-icons/bi";
import { useMedia } from "react-use";

import Modal from "components/Modal/Modal";
import Tooltip from "components/Tooltip/Tooltip";

import "./SelectorBase.scss";

type Props = PropsWithChildren<{
  label: string | undefined;
  // eslint-disable-next-line react/no-unused-prop-types
  modalLabel: string;
  disabled?: boolean;
}>;

type SelectorContextType = () => void;

const selectorContext = React.createContext<SelectorContextType>(noop);
export const useSelectorClose = () => React.useContext(selectorContext);
const SelectorContextProvider = (props: PropsWithChildren<{ close: () => void }>) => {
  return <selectorContext.Provider value={props.close}>{props.children}</selectorContext.Provider>;
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
    middleware: [offset(), flip(), shift()],
    placement: "bottom-end",
    whileElementsMounted: autoUpdate,
  });

  const suppressPointerDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  if (props.disabled) {
    return <div className="SwapBox-info-dropdown SelectorBase-button SelectorBase-button-disabled">{props.label}</div>;
  }

  return (
    <Popover className="SwapBox-info-dropdown">
      {(popoverProps) => (
        <>
          <Popover.Button as="div" className="SelectorBase-button" ref={refs.setReference}>
            {props.label}
            {<BiChevronDown className="TokenSelector-caret" />}
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
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  if (props.disabled) {
    return <div className="SwapBox-info-dropdown SelectorBase-button SelectorBase-button-disabled">{props.label}</div>;
  }

  return (
    <>
      <div className="SwapBox-info-dropdown SelectorBase-button" onClick={toggleVisibility}>
        {props.label}
        {!props.disabled && <BiChevronDown className="TokenSelector-caret" />}
      </div>
      <Modal
        setIsVisible={setIsVisible}
        isVisible={isVisible}
        label={props.modalLabel}
        className="SelectorBase-mobile-modal"
      >
        <SelectorContextProvider close={toggleVisibility}>{props.children}</SelectorContextProvider>
      </Modal>
    </>
  );
}
