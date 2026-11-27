import { ReactNode } from "react";

import { isNumberParts, joinNumberParts, type NumberPart } from "lib/numbers";

import { NumericValue } from "components/NumericValue/NumericValue";

/** "≈" and a hint value; a capped value already reads "> …", so it gets no "≈" in front. */
export function ApproxValue({ value }: { value: ReactNode | NumberPart[] }) {
  if (isNumberParts(value)) {
    return (
      <>
        {isCapped(joinNumberParts(value)) ? null : "≈"}
        <NumericValue parts={value} />
      </>
    );
  }

  return (
    <>
      {typeof value === "string" && isCapped(value) ? null : "≈"}
      {value}
    </>
  );
}

function isCapped(text: string) {
  return /^[<>]/.test(text.trim());
}
