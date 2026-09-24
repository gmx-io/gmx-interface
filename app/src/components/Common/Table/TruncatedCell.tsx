import Tooltip from '@/components/Common/Tooltip/Tooltip';
import { ReactNode } from 'react';

interface TruncatedCellProps {
  children: ReactNode;
  className?: string;
}

/**
 * A component that truncates text with ellipsis and shows the full text in a tooltip on hover.
 * Does not display the underline style that is typically associated with tooltips.
 * Uses a portal to ensure the tooltip is not clipped by overflow containers.
 */
export function TruncatedCell({ children, className }: TruncatedCellProps) {
  return (
    <Tooltip
      content={children}
      disableHandleStyle={true}
      handleClassName="truncate-text-cell"
      className={className}
      withPortal={true}
      tooltipClassName="compact-tooltip"
    >
      {children}
    </Tooltip>
  );
}
