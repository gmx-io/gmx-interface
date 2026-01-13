import { Trans } from "@lingui/macro";
import toPairs from "lodash/toPairs";
import values from "lodash/values";

import { ContractsChainId, getChainName } from "config/chains";
import type { CodeOwnershipInfo } from "domain/referrals/types";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import InfoIcon from "img/ic_info_circle.svg?react";
import WarnIcon from "img/ic_warn.svg?react";

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
            handle={<WarnIcon className="size-16 text-yellow-300" />}
            variant="none"
            className="flex"
            renderContent={() => (
              <div>
                <Trans>
                  This code is not yet registered on {nonTakenNetworkNames}, you will not receive rebates there.
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
                <Trans>
                  This code has been taken by someone else on {takenNetworkNames}, you will not receive rebates from
                  traders using this code on {takenNetworkNames}.
                </Trans>
              </div>
            )}
          />
        </div>
      )}
    </>
  );
}
