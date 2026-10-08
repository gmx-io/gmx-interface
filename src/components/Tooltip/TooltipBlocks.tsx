import cx from "classnames";
import type { ReactNode } from "react";

import ExternalLink from "components/ExternalLink/ExternalLink";

// Building blocks for StandardTooltip content.
// They always stack in this order: Title → Text → Rows → Table → Link or Footnote.
// Main text inherits the tooltip text color (.Tooltip-popup--standard), muted text is set explicitly.

export function TooltipContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("flex flex-col gap-8", className)}>{children}</div>;
}

export function TooltipTitle({
  children,
  value,
  valueClassName,
}: {
  children: ReactNode;
  value?: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-16 font-medium">
      <span>{children}</span>
      {value !== undefined && <span className={cx("shrink-0 text-right numbers", valueClassName)}>{value}</span>}
    </div>
  );
}

export function TooltipText({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

export function TooltipRows({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-8">{children}</div>;
}

/**
 * Label + value. No colon: the muted label sits on the left, the value on the right in the main tooltip text color.
 */
export function TooltipRow({
  label,
  value,
  valueClassName,
  isTotal,
}: {
  label: ReactNode;
  value: ReactNode;
  valueClassName?: string;
  isTotal?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-16">
      <span className={isTotal ? undefined : "text-typography-secondary"}>{label}</span>
      <span className={cx("shrink-0 text-right numbers", valueClassName)}>{value}</span>
    </div>
  );
}

export function TooltipDivider() {
  return <div className="h-1 shrink-0 bg-fill-accent" />;
}

export function TooltipTotal({
  label,
  value,
  valueClassName,
}: {
  label: ReactNode;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <>
      <TooltipDivider />
      <TooltipRow label={label} value={value} valueClassName={valueClassName} isTotal />
    </>
  );
}

export type TooltipTableColumn = {
  label: ReactNode;
  align?: "left" | "right";
};

const GRID_COLUMNS: Record<number, string> = {
  2: "grid-cols-[1fr_auto]",
  3: "grid-cols-[1fr_auto_auto]",
  4: "grid-cols-[1fr_auto_auto_auto]",
};

/**
 * Multi-column table. Use it only with `size="wide"`.
 */
export function TooltipTable({ columns, rows }: { columns: TooltipTableColumn[]; rows: ReactNode[][] }) {
  const alignClass = (index: number) => (columns[index]?.align === "right" ? "text-right" : "text-left");

  return (
    <div className={cx("grid gap-x-24 gap-y-8", GRID_COLUMNS[columns.length] ?? GRID_COLUMNS[3])}>
      {columns.map((column, index) => (
        <div key={index} className={cx("text-body-small uppercase text-typography-secondary", alignClass(index))}>
          {column.label}
        </div>
      ))}
      {rows.map((row, rowIndex) =>
        row.map((cell, index) => (
          <div key={`${rowIndex}-${index}`} className={cx(alignClass(index), { numbers: index > 0 })}>
            {cell}
          </div>
        ))
      )}
    </div>
  );
}

/**
 * A link on its own line, always last. White and underlined, blue on hover.
 * The tooltip needs `interactive` so the link can be clicked.
 */
export function TooltipLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <div>
      <ExternalLink href={href}>{children}</ExternalLink>
    </div>
  );
}

export function TooltipFootnote({ children }: { children: ReactNode }) {
  return <div className="text-body-small text-typography-secondary">{children}</div>;
}
