import { Trans } from "@lingui/macro";
import toPairs from "lodash/toPairs";

import { ContractsChainId, getChainName } from "config/chains";
import type { CodeOwnershipInfo } from "domain/referrals/types";

import StandardTooltip from "components/Tooltip/StandardTooltip";
import { TooltipContent, TooltipText } from "components/Tooltip/TooltipBlocks";

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
      <StandardTooltip
        handle={<AlertIcon className="size-16 text-yellow-300" />}
        variant="none"
        className="flex"
        content={
          <TooltipContent>
            {nonTakenNetworkNames.length > 0 && (
              <TooltipText>
                <Trans>
                  Code not registered on: {nonTakenNetworkNamesJoined}. Switch networks to register and earn rebates.
                </Trans>
              </TooltipText>
            )}
            {takenNetworkNames.length > 0 && (
              <TooltipText>
                {takenNetworkNames.length === 1 ? (
                  <Trans>
                    Code already taken on: {takenNetworkNamesJoined}. No rebates received from this network.
                  </Trans>
                ) : (
                  <Trans>
                    Code already taken on: {takenNetworkNamesJoined}. No rebates received from these networks.
                  </Trans>
                )}
              </TooltipText>
            )}
          </TooltipContent>
        }
      />
    </div>
  );
}
