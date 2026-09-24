import './TableFilterBase.scss';

import Button from '@/components/Common/Button/Button';
import ic_filter from '@/img/ic_filter.svg';
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
import { ElementType, PropsWithChildren } from 'react';

type ButtonVariant =
  | 'primary'
  | 'primary-action'
  | 'secondary'
  | 'link'
  | 'ghost';

export type TableFilterBaseProps = PropsWithChildren<{
  label: string;
  isActive?: boolean;
  popupPlacement?: Placement;
  asButton?: boolean;
}>;

const DEFAULT_TABLE_FILTER_POPUP_PLACEMENT: Placement = 'bottom';

const AS_BUTTON_PROPS = {
  as: Button,
  variant: 'secondary' as ButtonVariant,
  refName: 'buttonRef',
};

const AS_DEFAULT_PROPS = {
  as: 'div' as ElementType,
};

export function TableFilterBase({
  popupPlacement,
  isActive,
  label,
  children,
  asButton,
}: TableFilterBaseProps) {
  const { refs, floatingStyles } = useFloating({
    middleware: [offset(10), flip(), shift()],
    strategy: 'fixed',
    placement: popupPlacement || DEFAULT_TABLE_FILTER_POPUP_PLACEMENT,
    whileElementsMounted: autoUpdate,
  });

  return (
    <>
      <Popover>
        <Popover.Button
          {...(asButton
            ? { ...AS_BUTTON_PROPS, variant: 'secondary' }
            : AS_DEFAULT_PROPS)}
          ref={refs.setReference}
          className={cx('inline-flex cursor-pointer items-center', {
            'text-gray-500': isActive,
            'hover:text-gray-500': !isActive,
          })}
        >
          {label}
          <img src={ic_filter} alt="filter" className="brightness-0 invert" />
        </Popover.Button>
        <FloatingPortal>
          <Popover.Panel
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-1000 rounded-4 relative overflow-hidden border border-gray-800 bg-slate-700"
          >
            {children}
          </Popover.Panel>
        </FloatingPortal>
      </Popover>
    </>
  );
}
