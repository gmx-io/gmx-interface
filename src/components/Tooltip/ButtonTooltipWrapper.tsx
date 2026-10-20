import { ReactNode } from "react";

import TooltipWithPortal from "./TooltipWithPortal";

type Props = {
  children: ReactNode;
  content?: ReactNode | null;
  isHandlerDisabled?: boolean;
};

export function ButtonTooltipWrapper({ children, content, isHandlerDisabled = true }: Props) {
  if (!content) {
    return <>{children}</>;
  }

  return (
    <TooltipWithPortal
      content={content}
      position="bottom"
      variant="none"
      className="w-full"
      handleClassName="w-full"
      isHandlerDisabled={isHandlerDisabled}
      shouldPreventDefault={false}
    >
      {children}
    </TooltipWithPortal>
  );
}
