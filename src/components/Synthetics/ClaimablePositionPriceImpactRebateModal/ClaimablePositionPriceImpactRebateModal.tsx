import { Trans, t } from "@lingui/macro";
import Button from "components/Button/Button";
import Modal from "components/Modal/Modal";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useMarketInfo } from "context/SyntheticsStateContext/hooks/marketHooks";
import {
  selectClaimablePositionPriceImpactFees,
  selectClaimsGroupedPositionPriceImpactClaimableFees,
  selectClaimsPriceImpactClaimableTotal,
} from "context/SyntheticsStateContext/selectors/claimsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { createClaimCollateralTxn } from "domain/synthetics/claimHistory/claimPriceImpactRebate";
import { RebateInfoItem } from "domain/synthetics/fees/useRebatesInfo";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { getTokenData } from "domain/synthetics/tokens";
import { bigMath } from "lib/bigmath";
import { useChainId } from "lib/chains";
import { expandDecimals, formatDeltaUsd, formatTokenAmount } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";
import { memo, useCallback, useMemo, useState } from "react";

export function ClaimablePositionPriceImpactRebateModal({
  isVisible,
  onClose,
}: {
  isVisible: boolean;
  onClose: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { chainId } = useChainId();
  const total = useSelector(selectClaimsPriceImpactClaimableTotal);
  const totalUsd = useMemo(() => formatDeltaUsd(total), [total]);
  const { signer, account } = useWallet();
  const groups = useSelector(selectClaimsGroupedPositionPriceImpactClaimableFees);
  const claimablePositionPriceImpactFees = useSelector(selectClaimablePositionPriceImpactFees);

  const [buttonText, buttonDisabled] = useMemo(() => {
    if (isSubmitting) return [t`Claiming...`, true];
    return [t`Claim`, false];
  }, [isSubmitting]);

  const handleSubmit = useCallback(async () => {
    if (!signer) throw new Error("No signer");
    if (!account) throw new Error("No account");

    setIsSubmitting(true);

    try {
      await createClaimCollateralTxn(chainId, signer, {
        account,
        claimablePositionPriceImpactFees,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }, [account, chainId, claimablePositionPriceImpactFees, onClose, signer]);

  return (
    <Modal
      label={t`Confirm Claim`}
      className="Confirmation-box ClaimableModal"
      setIsVisible={onClose}
      isVisible={isVisible}
    >
      <div className="ConfirmationBox-main">
        <div className="text-center">
          <Trans>Claim {totalUsd}</Trans>
        </div>
      </div>
      <div className="ClaimModal-content ClaimSettleModal-modal-content">
        <div className="App-card-content">
          <div className="App-card-divider" />
          <div className="ClaimSettleModal-header">
            <div>
              <Trans>MARKET</Trans>
            </div>
            <div className="ClaimSettleModal-header-right">
              <Trans>REBATE</Trans>
            </div>
          </div>
          {groups.map((rebateItems) => (
            <Row key={rebateItems[0].marketAddress} rebateItems={rebateItems} />
          ))}
        </div>
      </div>
      <Button className="w-full" variant="primary-action" disabled={buttonDisabled} onClick={handleSubmit}>
        {buttonText}
      </Button>
    </Modal>
  );
}

const Row = memo(({ rebateItems }: { rebateItems: RebateInfoItem[] }) => {
  const market = useMarketInfo(rebateItems[0].marketAddress);
  const label = useMemo(() => {
    if (!market) return "";
    const indexName = getMarketIndexName(market);
    const poolName = getMarketPoolName(market);
    return (
      <div className="flex items-center">
        <span className="text-white">{indexName}</span>
        <span className="subtext">[{poolName}]</span>
      </div>
    );
  }, [market]);

  const tokensData = useTokensData();

  const reducedByTokenItems = useMemo(() => {
    const groupedTokens: Record<string, number> = {};
    const reduced = rebateItems.reduce((acc, rebateItem) => {
      const key = rebateItem.marketAddress + rebateItem.tokenAddress;
      if (typeof groupedTokens[key] === "number") {
        const index = groupedTokens[key];
        acc[index].value = acc[index].value + rebateItem.value;
        acc[index].valueByFactor = acc[index].valueByFactor + rebateItem.valueByFactor;
      } else {
        groupedTokens[key] = acc.length;
        acc.push({ ...rebateItem });
      }

      return acc;
    }, [] as RebateInfoItem[]);
    if (reduced.length !== 2) return reduced;

    reduced.sort((a, b) => {
      let ax = 0;
      let bx = 0;

      if (a.tokenAddress === market?.longTokenAddress) ax = 1;
      else if (a.tokenAddress === market?.shortTokenAddress) ax = -1;

      if (b.tokenAddress === market?.longTokenAddress) bx = 1;
      else if (b.tokenAddress === market?.shortTokenAddress) bx = -1;

      return bx - ax;
    });

    return reduced;
  }, [market?.longTokenAddress, market?.shortTokenAddress, rebateItems]);

  const usd = useMemo(() => {
    let total = 0n;

    rebateItems.forEach((rebateItem) => {
      const tokenData = getTokenData(tokensData, rebateItem.tokenAddress);
      const price = tokenData?.prices.minPrice;
      const decimals = tokenData?.decimals;
      const usd =
        price !== undefined && decimals
          ? bigMath.mulDiv(rebateItem.valueByFactor, price, expandDecimals(1, decimals))
          : null;
      if (usd === null) return;
      total = total + usd;
    });

    return formatDeltaUsd(total);
  }, [rebateItems, tokensData]);

  const renderContent = useCallback(
    () =>
      reducedByTokenItems.map((rebateItem) => {
        const tokenData = getTokenData(tokensData, rebateItem.tokenAddress);
        if (!tokenData) return null;
        return (
          <div key={rebateItem.id}>
            {formatTokenAmount(rebateItem.valueByFactor, tokenData?.decimals, tokenData?.symbol)}
          </div>
        );
      }),
    [reducedByTokenItems, tokensData]
  );

  return (
    <div className="ClaimSettleModal-info-row">
      <div className="Exchange-info-label">{label}</div>
      <div className="ClaimSettleModal-info-label-usd">
        <TooltipWithPortal
          position="top-end"
          portalClassName="ClaimModal-row-tooltip"
          handle={usd}
          renderContent={renderContent}
        />
      </div>
    </div>
  );
});
