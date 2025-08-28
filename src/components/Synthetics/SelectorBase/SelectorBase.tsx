/* eslint-disable react/no-unused-prop-types */
import { FloatingPortal, Placement, autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react";
import { Popover } from "@headlessui/react";
import cx from "classnames";
import noop from "lodash/noop";
import React, { PropsWithChildren, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FaChevronDown } from "react-icons/fa";
import { useMedia } from "react-use";

import { SlideModal } from "components/Modal/SlideModal";
import { TableTr } from "components/Table/Table";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import "./SelectorBase.scss";

type Props = PropsWithChildren<{
  handleClassName?: string;
  chevronClassName?: string;
  desktopPanelClassName?: string;
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
    rowClassName?: string;
  }>
) {
  return (
    <button
      className={cx("SelectorBaseUtils-mobile-row", props.rowClassName, {
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
        position="left-start"
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
          "SelectorBaseUtils-row underline decoration-gray-400 decoration-dashed decoration-1 underline-offset-4",
          props.className
        )}
        content={props.message}
        position="bottom-end"
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
        mainAxis: props.popoverYOffset ?? 8,
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
            className={cx("SelectorBase-button group/selector-base group gap-8", props.handleClassName)}
            ref={refs.setReference}
            data-qa={props.qa ? props.qa + "-button" : undefined}
          >
            {props.label}
            <FaChevronDown
              className={cx("inline-block text-[12px] text-typography-secondary", props.chevronClassName)}
            />
          </Popover.Button>
          {popoverProps.open && (
            <FloatingPortal>
              <Popover.Panel
                static
                className={cx("SelectorBase-panel", props.desktopPanelClassName)}
                ref={refs.setFloating}
                style={floatingStyles}
                onPointerDown={suppressPointerDown}
              >
                <SelectorContextProvider close={popoverProps.close}>{props.children}</SelectorContextProvider>
                {props.footerContent && (
                  <>
                    <div className="divider" />
                    {props.footerContent}
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
        {!props.disabled && <FaChevronDown className={cx("text-s inline-block", props.chevronClassName)} />}
      </div>

      <SlideModal
        setIsVisible={setIsVisible}
        isVisible={isVisible}
        label={props.modalLabel}
        qa={props.qa}
        headerRef={headerContentRef}
        contentPadding={props.mobileModalContentPadding}
        footerContent={props.footerContent}
      >
        <SelectorContextProvider close={toggleVisibility} mobileHeader={headerContent}>
          {props.children}
        </SelectorContextProvider>
      </SlideModal>
    </>
  );
}
