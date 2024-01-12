import { Trans, t } from "@lingui/macro";
import Modal from "components/Modal/Modal";
import Tooltip from "components/Tooltip/Tooltip";
import { PositionPriceImpactRebateInfo } from "domain/synthetics/claimHistory";
import { getMarketIndexName, getMarketPoolName, useMarketsInfo } from "domain/synthetics/markets";
import { getTokenData, useTokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { expandDecimals, formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { memo, useCallback, useMemo } from "react";
import { calcTotalRebateUsd } from "../Claims/utils";

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
  const reducedByMarketAndToken = useMemo(() => {
    const groupedMarkets: Record<string, number> = {};
    return accruedPositionPriceImpactFees.reduce((acc, rebateItem) => {
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
          {reducedByMarketAndToken.map((rebateItem) => (
            <Row key={rebateItem.id} rebateItem={rebateItem} />
          ))}
        </div>
      </div>
    </Modal>
  );
}

const Row = memo(({ rebateItem }: { rebateItem: PositionPriceImpactRebateInfo }) => {
  const { chainId } = useChainId();
  const { marketsInfoData } = useMarketsInfo(chainId);
  const label = useMemo(() => {
    const market = getByKey(marketsInfoData, rebateItem.marketAddress);
    if (!market) return "";
    const indexName = getMarketIndexName(market);
    const poolName = getMarketPoolName(market);
    return (
      <div className="items-center">
        <span className="text-white">{indexName}</span>
        <span className="subtext">[{poolName}]</span>
      </div>
    );
  }, [marketsInfoData, rebateItem.marketAddress]);
  const { tokensData } = useTokensData(chainId);
  const tokenData = useMemo(
    () => getTokenData(tokensData, rebateItem.tokenAddress),
    [rebateItem.tokenAddress, tokensData]
  );
  const usd = useMemo(() => {
    const price = tokenData?.prices.minPrice;
    const decimals = tokenData?.decimals;

    return price && decimals ? formatUsd(rebateItem.value.mul(price).div(expandDecimals(1, decimals))) : t`NA`;
  }, [tokenData?.prices.minPrice, tokenData?.decimals, rebateItem.value]);

  return (
    <div className="ClaimSettleModal-info-row">
      <div className="Exchange-info-label">{label}</div>
      <div className="ClaimSettleModal-info-label-usd">
        <Tooltip
          position="right-top"
          className="ClaimModal-row-tooltip"
          handle={usd}
          renderContent={useCallback(
            () => formatTokenAmount(rebateItem.value, tokenData?.decimals, tokenData?.symbol),
            [rebateItem.value, tokenData?.decimals, tokenData?.symbol]
          )}
        />
      </div>
    </div>
  );
});
