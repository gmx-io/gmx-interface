import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import { ExchangeInfo } from '@/components/Exchange/ExchangeInfo';
import cx from 'classnames';
import { ReactNode, useCallback, useEffect, useMemo } from 'react';
import { BiChevronDown, BiChevronUp } from 'react-icons/bi';
import { usePrevious } from 'react-use';

interface Props {
  title: ReactNode;
  open: boolean;
  children: ReactNode;
  onToggle: (val: boolean) => void;
  /**
   * if true - disables the collapse when the error is present
   */
  disableCollapseOnError?: boolean;
  /**
   * if true - expands the row when the error is present
   */
  autoExpandOnError?: boolean;
  /**
   * if true - hides the expand-toggle row
   */
  hideExpand?: boolean;
  hasError?: boolean;
  /**
   * error message to show in the tooltip when disableCollapseOnError=true
   */
  errorMessage?: ReactNode;
  className?: string;
}

export function ExpandableRow({
  open,
  children,
  title,
  onToggle,
  hasError,
  disableCollapseOnError = false,
  autoExpandOnError = true,
  hideExpand = false,
  errorMessage,
  className,
}: Props) {
  const previousHasError = usePrevious(hasError);

  useEffect(() => {
    if (autoExpandOnError && hasError && !previousHasError) {
      onToggle(true);
    }
  }, [hasError, previousHasError, open, onToggle, autoExpandOnError]);

  const handleOnClick = useCallback(() => {
    if (hasError && disableCollapseOnError) {
      return;
    }

    onToggle(!open);
  }, [onToggle, open, hasError, disableCollapseOnError]);

  const label = useMemo(() => {
    return hasError && disableCollapseOnError ? (
      <TooltipWithPortal handle={title} content={errorMessage} />
    ) : (
      title
    );
  }, [hasError, disableCollapseOnError, title, errorMessage]);

  const disabled = disableCollapseOnError && hasError;

  return (
    <div
      className={cx('py-[1rem]', className, {
        'bg-slate-800': open && !hideExpand,
      })}
    >
      {!hideExpand && (
        <ExchangeInfo.Row
          className={cx(
            'group !items-center hover:text-primary-300',
            open ? '!mb-4' : '!mb-0',
            {
              'cursor-not-allowed': disabled,
            }
          )}
          onClick={disabled ? undefined : handleOnClick}
          label={
            <span className="flex flex-row justify-between align-middle group-hover:text-primary-300">
              {label}
            </span>
          }
          value={
            open ? (
              <BiChevronUp className="-mb-4 -mr-[0.3rem] -mt-4 h-20 w-20 rounded bg-slate-700  " />
            ) : (
              <BiChevronDown className="-mb-4 -mr-[0.3rem] -mt-4 h-20 w-20 rounded bg-slate-700 " />
            )
          }
        />
      )}
      <div
        className={cx({
          hidden: !open,
        })}
      >
        {children}
      </div>
    </div>
  );
}
