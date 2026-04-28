import { Trans } from "@lingui/macro";
import { Link } from "react-router-dom";

import { ARBITRUM } from "config/chains";
import { selectUserReferralInfo } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxFees,
  selectTradeboxTradeFeesType,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useGmxPrice } from "domain/legacy";
import { isIncentivesEnabled, MULTIPLIER_DECIMALS } from "domain/synthetics/incentives/constants";
import { getEstimatedTradeRewards } from "domain/synthetics/incentives/pointsEstimate";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/useAccountIncentiveStatus";
import { useChainId } from "lib/chains";
import { formatAmount, formatUsd } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";
import { bigMath } from "sdk/utils/bigmath";

import { MultiplierBadge } from "components/MultiplierBadge/MultiplierBadge";

export function PointsRow() {
  const { chainId } = useChainId();
  const { account, active, signer } = useWallet();
  const fees = useSelector(selectTradeboxFees);
  const feesType = useSelector(selectTradeboxTradeFeesType);
  const userReferralInfo = useSelector(selectUserReferralInfo);

  const enabled = isIncentivesEnabled(chainId);
  const { data: status } = useAccountIncentiveStatus(chainId, {
    account,
    enabled: enabled && Boolean(account),
  });
  const { gmxPrice } = useGmxPrice(chainId, { arbitrum: chainId === ARBITRUM ? signer : undefined }, active);

  const multiplier = status?.multiplier;
  const hasMultiplier = multiplier !== undefined && multiplier > 0;
  const positionFeeUsd =
    feesType !== "swap" && fees?.positionFee?.deltaUsd !== undefined
      ? bigMath.abs(fees.positionFee.deltaUsd)
      : undefined;

  const estimatedRewards = getEstimatedTradeRewards({
    feeUsd: positionFeeUsd,
    multiplier,
    multiplierDecimals: MULTIPLIER_DECIMALS,
    totalRebate: userReferralInfo?.totalRebate,
    discountShare: userReferralInfo?.discountShare,
    gmxPrice,
  });

  const hasEstimatedRewards = estimatedRewards?.rewardsUsd !== undefined && estimatedRewards.rewardsUsd > 0n;

  if (!enabled) return null;

  return (
    <Link
      to="/points"
      className="flex items-center justify-between gap-8 rounded-8 p-8 text-12 text-typography-secondary transition-colors"
    >
      <span className="flex min-w-0 items-center gap-8">
        <MultiplierBadge multiplier={multiplier} />
        {hasMultiplier && hasEstimatedRewards ? (
          <span className="truncate">
            <Trans>Estimated rewards</Trans>
          </span>
        ) : (
          <span className="truncate">
            <Trans>
              <span className="text-typography-primary">Earn GMX Points</span> and unlock rewards{" "}
              <span className="align-text-top text-16">→</span>
            </Trans>
          </span>
        )}
      </span>

      {hasEstimatedRewards && (
        <span className="shrink-0 text-right text-typography-primary numbers">
          {estimatedRewards?.rewardsGmx !== undefined ? (
            <>
              {formatAmount(estimatedRewards.rewardsGmx, 18, 2, true)} GMX{" "}
              <span className="text-typography-secondary">
                ({formatUsd(estimatedRewards.rewardsUsd, { displayDecimals: 2 })})
              </span>
            </>
          ) : (
            formatUsd(estimatedRewards.rewardsUsd, { displayDecimals: 2 })
          )}
        </span>
      )}
    </Link>
  );
}
