import { Trans } from "@lingui/macro";
import toPairs from "lodash/toPairs";

import { ContractsChainId, getChainName } from "config/chains";
import type { CodeOwnershipInfo } from "domain/referrals/types";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import AlertIcon from "img/ic_alert.svg?react";

type Props = {
  allOwnersOnOtherChains:
    | {
        [chainId: number]: CodeOwnershipInfo;
      }
    | undefined;
};

export function ReferralCodeWarnings({ allOwnersOnOtherChains }: Props) {
  const nonTakenNetworkNames = toPairs(allOwnersOnOtherChains)
    .filter(([, o]) => !o.isTaken)
    .map(([chainId]) => getChainName(Number(chainId) as ContractsChainId));

  const takenNetworkNames = toPairs(allOwnersOnOtherChains)
    .filter(([, o]) => o.isTaken && !o.isTakenByCurrentUser)
    .map(([chainId]) => getChainName(Number(chainId) as ContractsChainId));

  if (nonTakenNetworkNames.length === 0 && takenNetworkNames.length === 0) {
    return null;
  }

  const nonTakenNetworkNamesJoined = nonTakenNetworkNames.join(", ");
  const takenNetworkNamesJoined = takenNetworkNames.join(", ");

  return (
    <div className="info">
      <TooltipWithPortal
        position="right"
        handle={<AlertIcon className="size-16 text-yellow-300" />}
        variant="none"
        className="flex"
        content={
          <div className="flex flex-col gap-8">
            {nonTakenNetworkNames.length > 0 && (
              <div>
                <Trans>
                  Code not registered on: {nonTakenNetworkNamesJoined}. Switch networks to register and earn rebates.
                </Trans>
              </div>
            )}
            {takenNetworkNames.length > 0 && (
              <div>
                {takenNetworkNames.length === 1 ? (
                  <Trans>
                    Code already taken on: {takenNetworkNamesJoined}. No rebates received from this network.
                  </Trans>
                ) : (
                  <Trans>
                    Code already taken on: {takenNetworkNamesJoined}. No rebates received from these networks.
                  </Trans>
                )}
              </div>
            )}
          </div>
        }
      />
    </div>
  );
}
