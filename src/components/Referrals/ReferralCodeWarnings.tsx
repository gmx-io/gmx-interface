import { Trans } from "@lingui/macro";
import { toPairs, values } from "lodash";
import { BiErrorCircle } from "react-icons/bi";
import { IoWarningOutline } from "react-icons/io5";

import { CHAIN_NAMES_MAP } from "config/chains";
import type { CodeOwnershipInfo } from "domain/referrals/types";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

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
    .map(([chainId]) => CHAIN_NAMES_MAP[chainId])
    .join(", ");

  const areSomeCodesTakenByOthers = values(allOwnersOnOtherChains).some((o) => o.isTaken && !o.isTakenByCurrentUser);
  const takenNetworkNames = toPairs(allOwnersOnOtherChains)
    .filter(([, o]) => o.isTaken && !o.isTakenByCurrentUser)
    .map(([chainId]) => CHAIN_NAMES_MAP[chainId])
    .join(", ");

  return (
    <>
      {areSomeCodesNotTaken && (
        <div className="info">
          <TooltipWithPortal
            position="right"
            handle={<IoWarningOutline color="#ffba0e" size={16} />}
            renderContent={() => (
              <div>
                <Trans>
                  This code is not yet registered on {nonTakenNetworkNames}, you will not receive rebates there.
                  <br />
                  <br />
                  Switch your network to create this code on {nonTakenNetworkNames}.
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
            handle={<BiErrorCircle color="#e82e56" size={16} />}
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
