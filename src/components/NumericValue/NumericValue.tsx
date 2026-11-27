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

  // a long value may wrap at its break parts (amount, then "(USD)" on the next line); each number stays whole.
  // whitespace-normal wins over a parent's nowrap (e.g. a "numbers" value cell), so the break can wrap there too
  if (parts.some((part) => part.kind === "break")) {
    const groups = splitAtBreaks(parts);

    return (
      <span className={cx(className, "!whitespace-normal")}>
        {groups.map((group, index) => (
          <Fragment key={index}>
            {index > 0 && " "}
            <NumericValue parts={group} affixClassName={affixClassName} />
          </Fragment>
        ))}
      </span>
    );
  }

  return (
    <span className={cx("whitespace-nowrap", className)}>
      {parts.map((part, index) =>
        part.kind === "text" ? (
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

function splitAtBreaks(parts: NumberPart[]): NumberPart[][] {
  const groups: NumberPart[][] = [[]];

  for (const part of parts) {
    if (part.kind === "break") {
      groups.push([]);
    } else {
      groups[groups.length - 1].push(part);
    }
  }

  return groups.filter((group) => group.length > 0);
}

export function NumericText({ text, className }: { text: string | NumberPart[] | undefined; className?: string }) {
  if (isNumberParts(text)) {
    return <NumericValue parts={text} className={className} />;
  }

  return className ? <span className={className}>{text}</span> : <>{text}</>;
}
