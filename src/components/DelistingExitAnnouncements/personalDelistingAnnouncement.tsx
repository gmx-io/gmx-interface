import { i18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/macro";

import type { EventData } from "config/events";

import type { DelistingExposure } from "./delistingExitAnnouncementsLogic";

export const PERSONAL_DELISTING_ANNOUNCEMENT_ID = "personal-delisting-final-notice";

type Translate = (descriptor: MessageDescriptor) => string;

export function getPersonalDelistingAnnouncement(
  account: string | undefined,
  chainId: number,
  exposure: DelistingExposure,
  translate: Translate = (descriptor) => i18n._(descriptor)
): EventData | undefined {
  const { positionNames, liquidityNames } = exposure;

  if (!account || (positionNames.length === 0 && liquidityNames.length === 0)) {
    return undefined;
  }

  const links: NonNullable<EventData["links"]> = [];
  if (positionNames.length > 0) {
    links.push({ text: translate(msg`Close positions`), href: "/trade" });
  }
  if (liquidityNames.length > 0) {
    links.push({ text: translate(msg`Withdraw liquidity`), href: "/pools" });
  }

  return {
    id: PERSONAL_DELISTING_ANNOUNCEMENT_ID,
    type: "delisting",
    isActive: true,
    startDate: "30 Jul 2026, 0:00",
    endDate: "05 Aug 2026, 23:59",
    variant: "error",
    chains: [chainId],
    title: translate(msg`Final notice: market delistings`),
    description: (
      <span className="flex flex-col gap-12 break-words">
        <span>
          {translate(
            msg`Your wallet ${account} still holds capital in markets that are being delisted. These markets will be disabled after August 5, 2026, 23:59 UTC.`
          )}
        </span>
        {positionNames.length > 0 && (
          <span>
            <span className="font-medium text-typography-primary">{translate(msg`Positions to close:`)}</span>{" "}
            {positionNames.join(", ")}
          </span>
        )}
        {liquidityNames.length > 0 && (
          <span>
            <span className="font-medium text-typography-primary">{translate(msg`Liquidity to withdraw:`)}</span>{" "}
            {liquidityNames.join(", ")}
          </span>
        )}
        <span>
          {translate(
            msg`After the deadline, trading and withdrawals on these markets are disabled, and capital left in them won't be accessible from the app. Close your positions and withdraw your liquidity now.`
          )}
        </span>
      </span>
    ),
    links,
  };
}
