import cx from "classnames";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { usePrevious } from "lib/usePrevious";
import { ReactNode, useCallback, useEffect, useMemo } from "react";
import { BiChevronDown, BiChevronUp } from "react-icons/bi";
import { SyntheticsInfoRow } from "./SyntheticsInfoRow";

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
  hasError?: boolean;
  /**
   * error message to show in the tooltip when disableCollapseOnError=true
   */
  errorMessage?: ReactNode;
  className?: string;
  /**
   * if true - occupies the space of the expandable content even when closed
   */
  occupyExpandableSpace?: boolean;
  contentClassName?: string;
}

export function ExpandableRow({
  open,
  children,
  title,
  onToggle,
  hasError,
  disableCollapseOnError = false,
  autoExpandOnError = true,
  errorMessage,
  className,
  // todo remove
  occupyExpandableSpace = false,
  contentClassName,
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
    return hasError && disableCollapseOnError ? <TooltipWithPortal handle={title} content={errorMessage} /> : title;
  }, [hasError, disableCollapseOnError, title, errorMessage]);

  const disabled = disableCollapseOnError && hasError;

  return (
    <div className={className}>
      <SyntheticsInfoRow
        className={cx("group !items-center hover:text-blue-300", {
          "cursor-not-allowed": disabled,
        })}
        onClick={disabled ? undefined : handleOnClick}
        label={<span className="flex flex-row justify-between align-middle group-hover:text-blue-300">{label}</span>}
        value={
          open ? (
            <BiChevronUp className="-mb-4 -mr-[0.3rem] -mt-4 h-24 w-24 text-white group-hover:text-blue-300" />
          ) : (
            <BiChevronDown className="-mb-4 -mr-[0.3rem] -mt-4 h-24 w-24 text-white group-hover:text-blue-300" />
          )
        }
      />

      <div
        className={cx(
          contentClassName,
          occupyExpandableSpace
            ? {
                invisible: !open,
              }
            : {
                hidden: !open,
              }
        )}
      >
        {children}
      </div>
    </div>
  );
}
