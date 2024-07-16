import type { PropsWithChildren } from "react";

import Tooltip, { TooltipProps } from "./Tooltip";

import "./Tooltip.scss";

export default function TooltipWithPortal<T extends PropsWithChildren = PropsWithChildren>(
  props: Omit<TooltipProps<T>, "withPortal">
) {
  return <Tooltip withPortal {...(props as TooltipProps<T>)} />;
}
