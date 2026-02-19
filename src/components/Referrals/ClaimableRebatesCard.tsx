import { Trans } from "@lingui/macro";
import { useMemo, useState } from "react";

import { useMarketsInfoRequest } from "domain/synthetics/markets";
import { useAffiliateRewards } from "domain/synthetics/referrals/useAffiliateRewards";
import { getTotalClaimableAffiliateRewardsUsd } from "domain/synthetics/referrals/utils";
import { useTokensDataRequest } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { formatUsd } from "lib/numbers";

import Button from "components/Button/Button";

import EarnIcon from "img/ic_earn.svg?react";

import { ClaimAffiliatesModal } from "./ClaimAffiliatesModal/ClaimAffiliatesModal";

export function ClaimableRebatesCard() {
  const { chainId, srcChainId } = useChainId();
  const [isClaiming, setIsClaiming] = useState(false);

  const { tokensData } = useTokensDataRequest(chainId, srcChainId);
  const { marketsInfoData } = useMarketsInfoRequest(chainId, { tokensData });
  const { affiliateRewardsData } = useAffiliateRewards(chainId);

  const totalClaimableRewardsUsd = useMemo(() => {
    if (!affiliateRewardsData || !marketsInfoData) {
      return 0n;
    }
    return getTotalClaimableAffiliateRewardsUsd(marketsInfoData, affiliateRewardsData);
  }, [affiliateRewardsData, marketsInfoData]);

  return (
    <>
      <div className="rounded-8 bg-slate-900 p-20">
        <div className="text-body-medium mb-8 font-medium text-typography-secondary">
          <Trans>Claimable rebates</Trans>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="text-24 font-medium text-typography-primary numbers">
            {formatUsd(totalClaimableRewardsUsd)}
          </div>
          <Button variant="primary" onClick={() => setIsClaiming(true)} disabled={totalClaimableRewardsUsd <= 0n}>
            <Trans>Claim rebates</Trans>
            <EarnIcon className="size-16" />
          </Button>
        </div>
      </div>
      {isClaiming && <ClaimAffiliatesModal onClose={() => setIsClaiming(false)} />}
    </>
  );
}
