import type { ReactNode } from "react";

import { HeaderMenu } from "../HeaderMenu/HeaderMenu";

type Props = {
  children: ReactNode;
  headerBadge?: ReactNode;
};

export function LandingLayout({ children, headerBadge }: Props) {
  return (
    <>
      <HeaderMenu badge={headerBadge} />
      {children}
    </>
  );
}
