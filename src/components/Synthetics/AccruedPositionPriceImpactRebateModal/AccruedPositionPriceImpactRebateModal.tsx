import { Trans, t } from "@lingui/macro";
import Modal from "components/Modal/Modal";
import { PositionPriceImpactRebateInfo } from "domain/synthetics/claimHistory";
import { getMarketIndexName, getMarketPoolName, useMarketsInfo } from "domain/synthetics/markets";
import { getTokenData, useTokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { expandDecimals, formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { memo, useCallback, useMemo } from "react";
import { calcTotalRebateUsd } from "../Claims/utils";
import { BigNumber } from "ethers";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

export function AccruedPositionPriceImpactRebateModal({
  isVisible,
  onClose,
  accruedPositionPriceImpactFees,
}: {
  isVisible: boolean;
  onClose: () => void;
  accruedPositionPriceImpactFees: PositionPriceImpactRebateInfo[];
}) {
  const { chainId } = useChainId();
  const { tokensData } = useTokensData(chainId);
  const totalUsd = useMemo(
    () => formatUsd(calcTotalRebateUsd(accruedPositionPriceImpactFees, tokensData, true)),
    [accruedPositionPriceImpactFees, tokensData]
  );
  const reducedByMarketItemGroups = useMemo(() => {
    const groupedMarkets: Record<string, number> = {};
    return accruedPositionPriceImpactFees.reduce((acc, rebateItem) => {
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
  }, [accruedPositionPriceImpactFees]);

  return (
    <Modal
      label={t`Price Impact Rebate`}
      className="Confirmation-box ClaimableModal"
      onClose={onClose}
      setIsVisible={onClose}
      isVisible={isVisible}
    >
      <div className="ConfirmationBox-main">
        <div className="text-center">Total {totalUsd}</div>
      </div>
      <div className="">
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
          {reducedByMarketItemGroups.map((rebateItems) => (
            <Row key={rebateItems[0].marketAddress} rebateItems={rebateItems} />
          ))}
        </div>
      </div>
    </Modal>
  );
}

const Row = memo(({ rebateItems }: { rebateItems: PositionPriceImpactRebateInfo[] }) => {
  const { chainId } = useChainId();
  const { marketsInfoData } = useMarketsInfo(chainId);
  const label = useMemo(() => {
    const market = getByKey(marketsInfoData, rebateItems[0].marketAddress);
    if (!market) return "";
    const indexName = getMarketIndexName(market);
    const poolName = getMarketPoolName(market);
    return (
      <div className="items-center">
        <span className="text-white">{indexName}</span>
        <span className="subtext">[{poolName}]</span>
      </div>
    );
  }, [marketsInfoData, rebateItems]);
  const { tokensData } = useTokensData(chainId);

  const reducedByTokenItems = useMemo(() => {
    const groupedMarkets: Record<string, number> = {};
    return rebateItems.reduce((acc, rebateItem) => {
      const key = rebateItem.marketAddress + rebateItem.tokenAddress;
      if (typeof groupedMarkets[key] === "number") {
        const index = groupedMarkets[key];
        acc[index].value = acc[index].value.add(rebateItem.value);
      } else {
        groupedMarkets[key] = acc.length;
        acc.push(rebateItem);
      }

      return acc;
    }, [] as PositionPriceImpactRebateInfo[]);
  }, [rebateItems]);

  const usd = useMemo(() => {
    let total = BigNumber.from(0);

    rebateItems.forEach((rebateItem) => {
      const tokenData = getTokenData(tokensData, rebateItem.tokenAddress);
      const price = tokenData?.prices.minPrice;
      const decimals = tokenData?.decimals;
      const usd = price && decimals ? rebateItem.value.mul(price).div(expandDecimals(1, decimals)) : null;
      if (!usd) return;
      total = total.add(usd);
    });

    return formatUsd(total);
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
});
