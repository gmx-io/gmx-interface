/* eslint-disable @typescript-eslint/unbound-method */
import Modal from '@/components/Common/Modal/Modal';
import { TableTr } from '@/components/Common/Table/Table';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  Placement,
  shift,
  useFloating,
} from '@floating-ui/react';
import { Popover } from '@headlessui/react';
import cx from 'classnames';
import noop from 'lodash/noop';
import React, {
  PropsWithChildren,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { BiChevronDown, BiChevronUp } from 'react-icons/bi';
import { useMedia } from 'react-use';

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
  chevronSize?: number;
  chevronStyle?: 'default' | 'compact';
}>;

type SelectorContextType = { close: () => void; mobileHeader?: HTMLDivElement };

const selectorContext = React.createContext<SelectorContextType>({
  close: noop,
  mobileHeader: undefined,
});
// eslint-disable-next-line react-refresh/only-export-components
export const useSelectorClose = () => React.useContext(selectorContext).close;
const SelectorContextProvider = (
  props: PropsWithChildren<{ close: () => void; mobileHeader?: HTMLDivElement }>
) => {
  const stableValue = useMemo(
    () => ({ close: props.close, mobileHeader: props.mobileHeader }),
    [props.close, props.mobileHeader]
  );

  return (
    <selectorContext.Provider value={stableValue}>
      {props.children}
    </selectorContext.Provider>
  );
};

export const SELECTOR_BASE_MOBILE_THRESHOLD = 700;

//
export function SelectorBase(props: Props) {
  const isMobile = useMedia(`(max-width: ${SELECTOR_BASE_MOBILE_THRESHOLD}px)`);

  if (isMobile) {
    return <SelectorBaseMobile {...props} />;
  }

  return <SelectorBaseDesktop {...props} />;
}

//#region Utility components

export function SelectorBaseMobileList(props: PropsWithChildren) {
  return <div className="flex flex-col gap-4">{props.children}</div>;
}

export function SelectorBaseMobileButton(
  props: PropsWithChildren<{
    onSelect: () => void;
    disabled?: boolean;
  }>
) {
  return (
    <button
      className={cx(
        'text-body-small appearance-none rounded border border-gray-800 bg-transparent p-3 text-left text-inherit',
        'hover:bg-cold-blue-900 hover:shadow-inner-light',
        {
          'cursor-not-allowed opacity-50': props.disabled,
        }
      )}
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
        className={cx(
          'cursor-not-allowed cursor-pointer opacity-50',
          props.className
        )}
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
          'cursor-pointer underline decoration-dashed decoration-1 underline-offset-2',
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
        'hover:bg-cold-blue-900 hover:shadow-inner-light cursor-pointer',
        {
          'cursor-not-allowed opacity-50': props.disabled,
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
    placement: props.popoverPlacement ?? 'bottom-end',
    whileElementsMounted: autoUpdate,
  });

  const getChevronClassName = () => {
    if (props.chevronClassName) return props.chevronClassName;
    if (props.chevronStyle === 'compact') {
      return 'inline-flex h-[20px] w-[20px] items-center justify-center rounded-4 bg-slate-700 hover:bg-slate-500';
    }
    return 'text-24 -my-5 -mr-4 inline-block align-middle';
  };

  const suppressPointerDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  if (props.disabled) {
    return (
      <div
        data-qa={props.qa ? props.qa + '-button-disabled' : undefined}
        className="flex cursor-text items-center opacity-100"
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
            className={cx(
              'group/selector-base flex cursor-pointer items-center',
              'hover:text-primary-300 group-hover/selector-base:text-primary-300',
              props.handleClassName
            )}
            ref={refs.setReference}
            data-qa={props.qa ? props.qa + '-button' : undefined}
          >
            {props.label}
            {popoverProps.open ? (
              <BiChevronUp
                className={cx(getChevronClassName(), 'ml-[0.4rem]')}
                size={props.chevronSize ?? 24}
                color={'#A3A3A3'}
              />
            ) : (
              <BiChevronDown
                className={cx(getChevronClassName(), 'ml-[0.4rem]')}
                size={props.chevronSize ?? 24}
                color={'#A3A3A3'}
              />
            )}
          </Popover.Button>
          {popoverProps.open && (
            <FloatingPortal>
              <Popover.Panel
                static
                className="z-1000 text-body-medium rounded-4 relative max-h-[48vh] overflow-hidden overflow-y-auto border border-gray-800 bg-slate-800"
                ref={refs.setFloating}
                style={floatingStyles}
                onPointerDown={suppressPointerDown}
              >
                <SelectorContextProvider close={popoverProps.close}>
                  {props.children}
                </SelectorContextProvider>
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
  const [headerContent, setHeaderContent] = useState<
    HTMLDivElement | undefined
  >(undefined);
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

  const getChevronClassName = () => {
    if (props.chevronClassName) return props.chevronClassName;
    if (props.chevronStyle === 'compact') {
      return 'ml-4 inline-flex h-[20px] w-[20px] items-center justify-center rounded-4 bg-slate-700 hover:bg-slate-500';
    }
    return 'text-24 -my-5 -mr-4 ml-4 inline-block align-middle';
  };

  if (props.disabled) {
    return (
      <div className="flex cursor-text items-center opacity-100">
        {props.label}
      </div>
    );
  }

  return (
    <>
      <div
        className={cx(
          'group/selector-base flex cursor-pointer items-center',
          'hover:text-primary-300 group-hover/selector-base:text-primary-300',
          props.handleClassName
        )}
        onClick={toggleVisibility}
      >
        {props.label}
        {!props.disabled &&
          (isVisible ? (
            <BiChevronUp
              className={getChevronClassName()}
              size={props.chevronSize ?? 24}
            />
          ) : (
            <BiChevronDown
              className={getChevronClassName()}
              size={props.chevronSize ?? 24}
            />
          ))}
      </div>
      <Modal
        setIsVisible={setIsVisible}
        isVisible={isVisible}
        label={props.modalLabel}
        className="animate-slide-up"
        headerContent={<div ref={headerContentRef} />}
        contentPadding={props.mobileModalContentPadding}
        noDivider
        footerContent={props.footerContent}
      >
        <SelectorContextProvider
          close={toggleVisibility}
          mobileHeader={headerContent}
        >
          {props.children}
        </SelectorContextProvider>
      </Modal>
    </>
  );
}
