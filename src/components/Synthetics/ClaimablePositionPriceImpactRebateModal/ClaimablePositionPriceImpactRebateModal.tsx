import { Trans, t } from "@lingui/macro";
import Button from "components/Button/Button";
import Modal from "components/Modal/Modal";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { PositionPriceImpactRebateInfo } from "domain/synthetics/claimHistory";
import { createClaimCollateralTxn } from "domain/synthetics/claimHistory/claimPriceImpactRebate";
import { MarketsInfoData, getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { getTokenData, useTokensData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { expandDecimals, formatDeltaUsd, formatTokenAmount } from "lib/numbers";
import { getByKey } from "lib/objects";
import useWallet from "lib/wallets/useWallet";
import { memo, useCallback, useMemo, useState } from "react";
import { calcTotalRebateUsd } from "../Claims/utils";

export function ClaimablePositionPriceImpactRebateModal({
  isVisible,
  onClose,
  claimablePositionPriceImpactFees,
  marketsInfoData,
}: {
  isVisible: boolean;
  onClose: () => void;
  claimablePositionPriceImpactFees: PositionPriceImpactRebateInfo[];
  marketsInfoData: MarketsInfoData | undefined;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { chainId } = useChainId();
  const { tokensData } = useTokensData(chainId);
  const totalUsd = useMemo(
    () => formatDeltaUsd(calcTotalRebateUsd(claimablePositionPriceImpactFees, tokensData, false)),
    [claimablePositionPriceImpactFees, tokensData]
  );
  const { signer, account } = useWallet();

  const reducedByMarketItemGroups = useMemo(() => {
    const groupedMarkets: Record<string, number> = {};
    return claimablePositionPriceImpactFees.reduce((acc, rebateItem) => {
      const key = rebateItem.marketAddress;

      if (typeof groupedMarkets[key] === "number") {
        const index = groupedMarkets[key];
        acc[index].push(rebateItem);
      } else {
        groupedMarkets[key] = acc.length;
        acc.push([rebateItem]);
      }

      return acc;
    }, [] as PositionPriceImpactRebateInfo[][]);
  }, [claimablePositionPriceImpactFees]);

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
      label={t`Price Impact Rebate`}
      className="Confirmation-box ClaimableModal"
      onClose={onClose}
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
          {marketsInfoData
            ? reducedByMarketItemGroups.map((rebateItems) => (
                <Row key={rebateItems[0].marketAddress} rebateItems={rebateItems} marketsInfoData={marketsInfoData} />
              ))
            : null}
        </div>
      </div>
      <Button className="w-full" variant="primary-action" disabled={buttonDisabled} onClick={handleSubmit}>
        {buttonText}
      </Button>
    </Modal>
  );
}

const Row = memo(
  ({
    rebateItems,
    marketsInfoData,
  }: {
    rebateItems: PositionPriceImpactRebateInfo[];
    marketsInfoData: MarketsInfoData;
  }) => {
    const { chainId } = useChainId();
    const market = getByKey(marketsInfoData, rebateItems[0].marketAddress);
    const label = useMemo(() => {
      if (!market) return "";
      const indexName = getMarketIndexName(market);
      const poolName = getMarketPoolName(market);
      return (
        <div className="items-center">
          <span className="text-white">{indexName}</span>
          <span className="subtext">[{poolName}]</span>
        </div>
      );
    }, [market]);

    const { tokensData } = useTokensData(chainId);

    const reducedByTokenItems = useMemo(() => {
      const groupedMarkets: Record<string, number> = {};
      const reduced = rebateItems.reduce((acc, rebateItem) => {
        const key = rebateItem.marketAddress + rebateItem.tokenAddress;
        if (typeof groupedMarkets[key] === "number") {
          const index = groupedMarkets[key];
          acc[index].value = acc[index].value.add(rebateItem.value);
        } else {
          groupedMarkets[key] = acc.length;
          acc.push({ ...rebateItem });
        }

        return acc;
      }, [] as PositionPriceImpactRebateInfo[]);
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
      let total = BigNumber.from(0);

      rebateItems.forEach((rebateItem) => {
        const tokenData = getTokenData(tokensData, rebateItem.tokenAddress);
        const price = tokenData?.prices.minPrice;
        const decimals = tokenData?.decimals;
        const usd = price && decimals ? rebateItem.valueByFactor.mul(price).div(expandDecimals(1, decimals)) : null;
        if (!usd) return;
        total = total.add(usd);
      });

      return formatDeltaUsd(total);
    }, [rebateItems, tokensData]);

    const renderContent = useCallback(
      () =>
        reducedByTokenItems.map((rebateItem) => {
          const tokenData = getTokenData(tokensData, rebateItem.tokenAddress);
          if (!tokenData) return null;
          return (
            <div key={rebateItem.id}>{formatTokenAmount(rebateItem.value, tokenData?.decimals, tokenData?.symbol)}</div>
          );
        }),
      [reducedByTokenItems, tokensData]
    );

    return (
      <div className="ClaimSettleModal-info-row">
        <div className="Exchange-info-label">{label}</div>
        <div className="ClaimSettleModal-info-label-usd">
          <TooltipWithPortal
            position="right-top"
            portalClassName="ClaimModal-row-tooltip"
            handle={usd}
            renderContent={renderContent}
          />
        </div>
      </div>
    );
  }
);
