import type { RefObject } from "react";

type StylisElement = {
  type: string;
  value: string;
  return?: string;
};

const REM_VALUE_REGEX = /(\d*\.?\d+)rem(?![a-zA-Z])/g;

/**
 * GMX sets html font-size to 10px while Privy's styled-components UI is sized in rem
 * assuming a 16px root, so Privy screens render at 62.5% of their design size (FEDEV-4037).
 * Privy resolves styled-components from our dependency tree, so this stylis middleware,
 * passed via StyleSheetManager around PrivyProvider, rewrites rem to the intended px.
 * Remove once Privy ships root-font-size-independent styles.
 */
function privyRemToPx(element: StylisElement) {
  if (element.type !== "decl" || !element.value.includes("rem")) {
    return;
  }

  element.return = element.value.replace(REM_VALUE_REGEX, (_, value) => `${parseFloat(value) * 16}px`);
}

export const PRIVY_STYLIS_PLUGINS = [privyRemToPx];

/**
 * react-remove-scroll in our modals cancels wheel/touch events outside their subtree,
 * and Privy renders #privy-dialog in a body-level portal, so lists inside Privy dialogs
 * cannot be scrolled while a GMX modal is open underneath. The lazily resolved shard
 * whitelists the Privy dialog for those events.
 */
export const PRIVY_DIALOG_SCROLL_SHARDS: RefObject<HTMLElement | null>[] = [
  {
    get current() {
      return document.getElementById("privy-dialog");
    },
  },
];
