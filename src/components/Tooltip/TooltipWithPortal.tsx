import type { ElementType } from "react";

import Tooltip, { TooltipProps } from "./Tooltip";

import "./Tooltip.scss";

export default function TooltipWithPortal<T extends ElementType>(props: Omit<TooltipProps<T>, "withPortal">) {
  return <Tooltip withPortal {...(props as TooltipProps<T>)} />;
}
