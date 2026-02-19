import { Trans } from "@lingui/macro";
import toPairs from "lodash/toPairs";
import values from "lodash/values";

import { ContractsChainId, getChainName } from "config/chains";
import type { CodeOwnershipInfo } from "domain/referrals/types";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import AlertIcon from "img/ic_alert.svg?react";
import InfoIcon from "img/ic_info_circle.svg?react";

type Props = {
  allOwnersOnOtherChains:
    | {
        [chainId: number]: CodeOwnershipInfo;
      }
    | undefined;
};

export function ReferralCodeWarnings({ allOwnersOnOtherChains }: Props) {
  const areSomeCodesNotTaken = values(allOwnersOnOtherChains).some((o) => !o.isTaken);
  const nonTakenNetworkNames = toPairs(allOwnersOnOtherChains)
    .filter(([, o]) => !o.isTaken)
    .map(([chainId]) => getChainName(Number(chainId) as ContractsChainId))
    .join(", ");

  const areSomeCodesTakenByOthers = values(allOwnersOnOtherChains).some((o) => o.isTaken && !o.isTakenByCurrentUser);
  const takenNetworkNames = toPairs(allOwnersOnOtherChains)
    .filter(([, o]) => o.isTaken && !o.isTakenByCurrentUser)
    .map(([chainId]) => getChainName(Number(chainId) as ContractsChainId))
    .join(", ");

  return (
    <>
      {areSomeCodesNotTaken && (
        <div className="info">
          <TooltipWithPortal
            position="right"
            handle={<AlertIcon className="size-16 text-yellow-300" />}
            variant="none"
            className="flex"
            renderContent={() => (
              <div>
                <Trans>
                  Code not registered on {nonTakenNetworkNames}. Switch networks to register and earn rebates.
                </Trans>
              </div>
            )}
          />
        </div>
      )}
      {areSomeCodesTakenByOthers && (
        <div className="info">
          <TooltipWithPortal
            position="right"
            handle={<InfoIcon className="size-16 text-red-500" />}
            variant="none"
            className="flex"
            renderContent={() => (
              <div>
                <Trans>Code taken by another user on {takenNetworkNames}. No rebates from those networks.</Trans>
              </div>
            )}
          />
        </div>
      )}
    </>
  );
}
