import type { Middleware } from "@floating-ui/react";

export const DEFAULT_ARROW_COLOR = "rgb(49, 54, 85)";

export function arrowColor(): Middleware {
  return {
    name: "color",
    fn: ({ rects, middlewareData }) => {
      const arrowWidth = 14;
      const popupWidth = rects.floating.width;
      const arrowLeftOffset = middlewareData.arrow?.x;

      let color = DEFAULT_ARROW_COLOR;
      if (popupWidth !== undefined && arrowLeftOffset !== undefined) {
        const arrowLeftOffsetPercent = ((arrowLeftOffset + arrowWidth / 2) / popupWidth) * 100;
        color = `color-mix(in srgb, rgba(49, 54, 85, 0.9) ${arrowLeftOffsetPercent}%, rgba(37, 40, 65, 0.9))`;
      }

      return {
        data: { color },
      };
    },
  };
}
