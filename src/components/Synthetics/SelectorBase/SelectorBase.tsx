/* eslint-disable react/no-unused-prop-types */
import { FloatingPortal, Placement, autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react";
import { Popover } from "@headlessui/react";
import cx from "classnames";
import noop from "lodash/noop";
import React, { PropsWithChildren, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { BiChevronDown } from "react-icons/bi";
import { useMedia } from "react-use";

import Modal from "components/Modal/Modal";
import { TableTr } from "components/Table/Table";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import "./SelectorBase.scss";

type Props = PropsWithChildren<{
  handleClassName?: string;
  chevronClassName?: string;
  label: ReactNode | string | undefined;
  modalLabel: string;
  disabled?: boolean;
  popoverXOffset?: number;
  popoverYOffset?: number;
  mobileModalContentPadding?: boolean;
  popoverPlacement?: Placement;
  footerContent?: ReactNode;
  qa?: string;
}>;

type SelectorContextType = { close: () => void; mobileHeader?: HTMLDivElement };

const selectorContext = React.createContext<SelectorContextType>({
  close: noop,
  mobileHeader: undefined,
});
export const useSelectorClose = () => React.useContext(selectorContext).close;
const SelectorContextProvider = (props: PropsWithChildren<{ close: () => void; mobileHeader?: HTMLDivElement }>) => {
  const stableValue = useMemo(
    () => ({ close: props.close, mobileHeader: props.mobileHeader }),
    [props.close, props.mobileHeader]
  );

  return <selectorContext.Provider value={stableValue}>{props.children}</selectorContext.Provider>;
};

export const SELECTOR_BASE_MOBILE_THRESHOLD = 700;

export function SelectorBase(props: Props) {
  const isMobile = useMedia(`(max-width: ${SELECTOR_BASE_MOBILE_THRESHOLD}px)`);

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
  props: PropsWithChildren<{
    disabled?: boolean;
    disabledMessage?: ReactNode;
    message?: ReactNode;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
  }>
) {
  if (props.disabled && props.disabledMessage) {
    return (
      <TooltipWithPortal
        as={TableTr}
        className={cx("SelectorBaseUtils-row SelectorBaseUtils-row-disabled", props.className)}
        content={props.disabledMessage}
        position="bottom-end"
        bordered={false}
        hoverable={false}
      >
        {props.children}
      </TooltipWithPortal>
    );
  }

  if (props.message) {
    return (
      <TooltipWithPortal
        as={TableTr}
        className={cx(
          "SelectorBaseUtils-row underline decoration-dashed decoration-1 underline-offset-2",
          props.className
        )}
        content={props.message}
        position="bottom-end"
        bordered={false}
        hoverable={!!props.onClick}
        onClick={props.disabled ? undefined : props.onClick}
      >
        {props.children}
      </TooltipWithPortal>
    );
  }

  return (
    <TableTr
      className={cx(
        "SelectorBaseUtils-row",
        {
          "SelectorBaseUtils-row-disabled": props.disabled,
        },
        props.className
      )}
      bordered={false}
      hoverable={!!props.onClick}
      onClick={props.disabled ? undefined : props.onClick}
    >
      {props.children}
    </TableTr>
  );
}

export function SelectorBaseMobileHeaderContent(props: PropsWithChildren) {
  const element = useContext(selectorContext).mobileHeader;

  if (!element) {
    return null;
  }

  return createPortal(props.children, element);
}
//#endregion

function SelectorBaseDesktop(props: Props & { qa?: string }) {
  const { refs, floatingStyles } = useFloating({
    middleware: [
      offset({
        mainAxis: props.popoverYOffset ?? 0,
        crossAxis: props.popoverXOffset ?? 0,
      }),
      flip(),
      shift(),
    ],
    placement: props.popoverPlacement ?? "bottom-end",
    whileElementsMounted: autoUpdate,
  });

  const suppressPointerDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  if (props.disabled) {
    return (
      <div
        data-qa={props.qa ? props.qa + "-button-disabled" : undefined}
        className="SelectorBase-button SelectorBase-button-disabled"
      >
        {props.label}
      </div>
    );
  }

  return (
    <Popover>
      {(popoverProps) => (
        <>
          <Popover.Button
            as="div"
            className={cx("SelectorBase-button group/selector-base", props.handleClassName)}
            ref={refs.setReference}
            data-qa={props.qa ? props.qa + "-button" : undefined}
          >
            {props.label}
            <BiChevronDown className={cx("-my-5 -mr-4 inline-block align-middle text-24", props.chevronClassName)} />
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
                {props.footerContent && (
                  <>
                    <div className="divider" />
                    <div className="px-15 py-12">{props.footerContent}</div>
                  </>
                )}
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
  const [headerContent, setHeaderContent] = useState<HTMLDivElement | undefined>(undefined);
  const headerContentRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      setHeaderContent(node);
    } else {
      setHeaderContent(undefined);
    }
  }, []);

  const toggleVisibility = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, [setIsVisible]);

  if (props.disabled) {
    return <div className="SelectorBase-button SelectorBase-button-disabled">{props.label}</div>;
  }

  return (
    <>
      <div className={cx("SelectorBase-button group/selector-base", props.handleClassName)} onClick={toggleVisibility}>
        {props.label}
        {!props.disabled && <BiChevronDown className="-my-5 -mr-4 inline-block align-middle text-24" />}
      </div>
      <Modal
        setIsVisible={setIsVisible}
        isVisible={isVisible}
        label={props.modalLabel}
        className="SelectorBase-mobile-modal"
        headerContent={<div ref={headerContentRef} />}
        contentPadding={props.mobileModalContentPadding}
        noDivider
      >
        <SelectorContextProvider close={toggleVisibility} mobileHeader={headerContent}>
          {props.children}
        </SelectorContextProvider>
        {props.footerContent && (
          <div className="absolute bottom-0 left-0 right-0 bg-slate-800">
            <div className="divider" />
            <div className="px-15 py-12">{props.footerContent}</div>
          </div>
        )}
      </Modal>
    </>
  );
}
