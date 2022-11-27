import { ReactNode } from "react";

type Props = {
  label: ReactNode;
  value: ReactNode;
};

export function InfoRow(p: Props) {
  return (
    <div className="Exchange-info-row">
      <div className="Exchange-info-label">{p.label}</div>
      <div className="align-right">{p.value}</div>
    </div>
  );
}
