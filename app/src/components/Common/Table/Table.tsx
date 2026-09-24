import cx from 'classnames';
import { PropsWithChildren, forwardRef } from 'react';

interface TableTdThProps
  extends PropsWithChildren,
  React.HTMLProps<HTMLTableCellElement> {
  padding?: Padding;
}

export function Table(
  props: PropsWithChildren & React.HTMLProps<HTMLTableElement>
) {
  return (
    <table
      {...props}
      className={cx(
        'rounded-4 text-body-medium w-full bg-fill-surface-base',
        props.className
      )}
    />
  );
}

export function TableTh(props: TableTdThProps) {
  const { padding = 'all', ...rest } = props;

  return (
    <th
      {...rest}
      className={cx(
        'text-body-medium text-left font-normal text-gray-300 last-of-type:[&:not(:first-of-type)]:text-right',
        props.className,
        {
          'px-10 py-10 first-of-type:pl-10 last-of-type:pr-10':
            padding === 'all',
          'px-10 first-of-type:pl-10 last-of-type:pr-10':
            padding === 'horizontal',
          'py-10': padding === 'vertical',
          'p-0': padding === 'none',
        }
      )}
    />
  );
}

export function TableTheadTr({
  bordered,
  ...props
}: PropsWithChildren<{ bordered?: boolean }> &
  React.HTMLProps<HTMLTableRowElement>) {
  return (
    <tr
      {...props}
      className={cx('text-body-medium', {
        'border-b border-slate-700': bordered,
      })}
    />
  );
}

export const TableTr = forwardRef<
  HTMLTableRowElement,
  PropsWithChildren<{ hoverable?: boolean; bordered?: boolean }> &
  React.HTMLProps<HTMLTableRowElement>
>(function TableTrInternal(
  { hoverable = true, bordered = true, className, ...props },
  ref
) {
  return (
    <tr
      {...props}
      ref={ref}
      className={cx(className, 'text-body-medium', {
        'border-b border-slate-700 last-of-type:border-b-0': bordered,
        'hover:bg-fill-surface-hover': hoverable,
        'cursor-pointer': !!props.onClick,
      })}
    />
  );
});

type Padding = 'all' | 'horizontal' | 'vertical' | 'none';

export function TableTd(props: TableTdThProps) {
  const { padding = 'all', ...rest } = props;
  return (
    <td
      {...rest}
      className={cx(
        'text-body-medium last-of-type:[&:not(:first-of-type)]:text-right',
        props.className,
        {
          'px-10 py-10 first-of-type:pl-10 last-of-type:pr-10':
            padding === 'all',
          'px-10 first-of-type:pl-10 last-of-type:pr-10':
            padding === 'horizontal',
          'py-10': padding === 'vertical',
          'p-0': padding === 'none',
        }
      )}
    />
  );
}
