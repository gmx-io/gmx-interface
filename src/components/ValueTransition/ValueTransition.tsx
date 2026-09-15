import "./ValueTransition.scss";
import { ReactNode } from "react";

import { isNumberParts, joinNumberParts, NumberPart } from "lib/numbers";

import { NumericText } from "components/NumericValue/NumericValue";

import ArrowRightIcon from "img/ic_arrow_right.svg?react";

export type TransitionValue = ReactNode | NumberPart[];

type Props = {
  from?: TransitionValue;
  to?: TransitionValue;
};

function toComparable(value: TransitionValue) {
  return isNumberParts(value) ? joinNumberParts(value) : value;
}

function TransitionSide({ value, className }: { value: TransitionValue; className?: string }) {
  if (isNumberParts(value) || typeof value === "string") {
    return <NumericText text={value} className={className} />;
  }

  return className ? <span className={className}>{value}</span> : <>{value}</>;
}

export function ValueTransition(p: Props) {
  if (!p.to || toComparable(p.to) === toComparable(p.from))
    return <TransitionSide value={p.from} className="numbers" />;
  if (!p.from) return <TransitionSide value={p.to} className="numbers" />;

  return (
    <div className="ValueTransition numbers">
      <div className="muted inline-block">
        <TransitionSide value={p.from} /> <ArrowRightIcon className="transition-arrow inline-block" />
      </div>{" "}
      <TransitionSide value={p.to} />
    </div>
  );
}
