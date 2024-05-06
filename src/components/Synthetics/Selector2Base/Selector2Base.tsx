import { FloatingPortal, autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react";
import { Popover } from "@headlessui/react";
import cx from "classnames";
import { noop } from "lodash";
import React, { PropsWithChildren, ReactNode, useCallback, useState } from "react";
import { BiChevronDown } from "react-icons/bi";
import { useMedia } from "react-use";

import Modal from "components/Modal/Modal";
import Tooltip from "components/Tooltip/Tooltip";

import "./Selector2Base.scss";

type Props = PropsWithChildren<{
  label: string | undefined;
  // eslint-disable-next-line react/no-unused-prop-types
  modalLabel: string;
}>;

type Selector2ContextType = () => void;

const selector2Context = React.createContext<Selector2ContextType>(noop);
export const useSelector2Close = () => React.useContext(selector2Context);
const Selector2ContextProvider = (props: PropsWithChildren<{ close: () => void }>) => {
  return <selector2Context.Provider value={props.close}>{props.children}</selector2Context.Provider>;
};

export function Selector2Base(props: Props) {
  const isMobile = useMedia("(max-width: 1100px)");

  if (isMobile) {
    return <Selector2BaseMobile {...props} />;
  }

  return <Selector2BaseDesktop {...props} />;
}

//#region Utility components

export function Selector2BaseMobileList(props: PropsWithChildren) {
  return <div className="Selector2BaseUtils-mobile-list">{props.children}</div>;
}

export function Selector2BaseMobileButton(
  props: PropsWithChildren<{
    onSelect: () => void;
    disabled?: boolean;
  }>
) {
  return (
    <button
      className={cx("Selector2BaseUtils-mobile-row", {
        "Selector2BaseUtils-mobile-row-disabled": props.disabled,
      })}
      onClick={props.onSelect}
      type="button"
    >
      {props.children}
    </button>
  );
}

export function Selector2BaseDesktopRow(
  props: React.HTMLAttributes<HTMLTableRowElement> & {
    disabled?: boolean;
    disabledMessage?: ReactNode;
  }
) {
  if (props.disabled && props.disabledMessage) {
    return (
      <Tooltip
        as="tr"
        className={cx("Selector2BaseUtils-row", props.className)}
        content={props.disabledMessage}
        position="bottom-end"
      >
        <div className="Selector2BaseUtils-row-disabled">{props.children}</div>
      </Tooltip>
    );
  }

  return (
    <tr
      {...props}
      className={cx(
        "Selector2BaseUtils-row",
        {
          "Selector2BaseUtils-row-disabled": props.disabled,
        },
        props.className
      )}
    >
      {props.children}
    </tr>
  );
}

export function Selector2BaseTableHeadRow(props: PropsWithChildren) {
  return <tr className="Selector2BaseUtils-table-head-row">{props.children}</tr>;
}
//#endregion

function Selector2BaseDesktop(props: Props) {
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
          <Popover.Button as="button" className="Selector2Base-button" ref={refs.setReference}>
            {props.label}
            <BiChevronDown className="TokenSelector-caret" />
          </Popover.Button>

          {popoverProps.open && (
            <FloatingPortal>
              <Popover.Panel
                static
                className="Selector2Base-panel"
                ref={refs.setFloating}
                style={floatingStyles}
                onPointerDown={suppressPointerDown}
              >
                <Selector2ContextProvider close={popoverProps.close}>{props.children}</Selector2ContextProvider>
              </Popover.Panel>
            </FloatingPortal>
          )}
        </>
      )}
    </Popover>
  );
}

function Selector2BaseMobile(props: Props) {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  return (
    <>
      <button className="SwapBox-info-dropdown Selector2Base-button" onClick={toggleVisibility} type="button">
        {props.label}
        <BiChevronDown className="TokenSelector-caret" />
      </button>
      <Modal
        setIsVisible={setIsVisible}
        isVisible={isVisible}
        label={props.modalLabel}
        className="Selector2Base-mobile-modal"
      >
        <Selector2ContextProvider close={toggleVisibility}>{props.children}</Selector2ContextProvider>
      </Modal>
    </>
  );
}
