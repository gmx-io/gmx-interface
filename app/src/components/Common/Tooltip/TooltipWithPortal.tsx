import Tooltip, { TooltipProps } from './Tooltip';

import type { ElementType } from 'react';

export default function TooltipWithPortal<T extends ElementType | undefined>(
  props: Omit<TooltipProps<T>, 'withPortal'>
) {
  return <Tooltip withPortal {...(props as TooltipProps<T>)} />;
}
