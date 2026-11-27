import { Trans } from "@lingui/macro";
import cx from "classnames";

import { ARBITRUM, getChainName } from "config/chains";

import BellIcon from "img/ic_bell.svg?react";

import { getIsPwaInstallUiEnabled } from "./pwaPlatform";
import { usePwaState } from "./pwaStore";

/**
 * Notifications cover Arbitrum only. On the trade page, when they're on and the person looks at their positions on
 * another network, one line above the list says those positions get none. The notifications state is a placeholder:
 * the build task reads it from the Notifications tab's state.
 */
export function OtherNetworkNotificationsNote({
  chainId,
  hasPositions,
  isMobile,
}: {
  chainId: number;
  hasPositions: boolean;
  isMobile: boolean;
}) {
  const { notifications } = usePwaState();

  const isVisible = notifications === "on" && chainId !== ARBITRUM && hasPositions;

  if (!getIsPwaInstallUiEnabled() || !isVisible) {
    return null;
  }

  const name = getChainName(chainId) as string | undefined;
  const chainName = name && name !== "Unknown" ? name : "";

  // On phones and tablets the positions are separate cards, so the note is its own rounded block with the card gap.
  // On computers it sits inside the table's panel, in line with the first column.
  return (
    <div
      data-qa="pwa-other-network-note"
      className={cx("bg-slate-900", isMobile ? "mb-8 rounded-8 p-8" : "px-20 pt-18")}
    >
      <div className="text-body-small flex items-start gap-6 rounded-8 bg-slate-800 px-12 py-8 text-typography-secondary">
        <BellIcon className="mt-1 size-14 shrink-0" />
        <span>
          {chainName ? (
            <Trans>Notifications cover Arbitrum only, so positions on {chainName} don't get any</Trans>
          ) : (
            <Trans>Notifications cover Arbitrum only, so positions on this network don't get any</Trans>
          )}
        </span>
      </div>
    </div>
  );
}
