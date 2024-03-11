import { ReactNode } from "react";

import "./HeaderPromoBanner.scss";

export function HeaderPromoBanner({ children }: { children: ReactNode }) {
  return <div className="HeaderPromoBanner">{children}</div>;
}
