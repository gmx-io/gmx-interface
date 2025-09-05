import "./ValueTransition.scss";
import { ReactNode } from "react";
import { BsArrowRight } from "react-icons/bs";

type Props = {
  from?: ReactNode;
  to?: ReactNode;
};

export function ValueTransition(p: Props) {
  if (!p.to || p.to === p.from) return <span className="numbers">{p.from}</span>;
  if (!p.from) return <span className="numbers">{p.to}</span>;

  return (
    <div className="ValueTransition numbers">
      <div className="muted inline-block">
        {p.from} <BsArrowRight className="transition-arrow inline-block" />
      </div>{" "}
      {p.to}
    </div>
  );
}
