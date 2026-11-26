import cx from "classnames";
import { Fragment, ReactNode } from "react";

import { isNumberParts, NumberPart } from "lib/numbers";

export const HAIR_SPACE = " ";

export type NumericValuePresentation = {
  className?: string;
  affixClassName?: string;
  fallback?: ReactNode;
};

type Props = NumericValuePresentation & {
  parts: NumberPart[] | undefined;
};

export function NumericValue({ parts, className, affixClassName = "numeric-affix", fallback }: Props) {
  if (!parts) {
    return fallback === undefined ? null : <span className={cx("whitespace-nowrap", className)}>{fallback}</span>;
  }

  return (
    <span className={cx("whitespace-nowrap", className)}>
      {parts.map((part, index) =>
        // $ takes the color of its number; only other units (the x of leverage) are muted
        part.kind === "text" || part.kind === "currency" ? (
          <Fragment key={index}>{part.text}</Fragment>
        ) : (
          <span key={index} className={affixClassName}>
            {part.kind === "multiplier" ? `${HAIR_SPACE}${part.text}` : part.text}
          </span>
        )
      )}
    </span>
  );
}

export function NumericText({ text, className }: { text: string | NumberPart[] | undefined; className?: string }) {
  if (isNumberParts(text)) {
    return <NumericValue parts={text} className={className} />;
  }

  return className ? <span className={className}>{text}</span> : <>{text}</>;
}
