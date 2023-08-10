import { ReactNode } from "react";

type Props = {
  label: ReactNode;
  value: ReactNode;
};

export function CardRow(p: Props) {
  return (
    <div className="App-card-row">
      <div className="label">{p.label}</div>
      <div className="value">{p.value}</div>
    </div>
  );
}
