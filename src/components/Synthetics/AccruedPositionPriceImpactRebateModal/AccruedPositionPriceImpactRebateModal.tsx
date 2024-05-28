import { Trans, t } from "@lingui/macro";
import Modal from "components/Modal/Modal";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { useMarketsInfoData, useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  selectClaimsPriceImpactAccruedTotal,
  selectClaimsGroupedPositionPriceImpactAccruedFees,
} from "context/SyntheticsStateContext/selectors/claimsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { RebateInfoItem } from "domain/synthetics/fees/useRebatesInfo";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { getTokenData } from "domain/synthetics/tokens";
import { bigMath } from "lib/bigmath";
import { expandDecimals, formatDeltaUsd, formatTokenAmount } from "lib/numbers";
import { getByKey } from "lib/objects";
import { memo, useCallback, useMemo } from "react";

export const AccruedPositionPriceImpactRebateModal = memo(
  ({ isVisible, onClose }: { isVisible: boolean; onClose: () => void }) => {
    const totalUsd = useSelector(selectClaimsPriceImpactAccruedTotal);
    const groups = useSelector(selectClaimsGroupedPositionPriceImpactAccruedFees);

    return (
      <Modal
        label={t`Accrued Price Impact Rebates`}
        className="Confirmation-box ClaimableModal"
        setIsVisible={onClose}
        isVisible={isVisible}
      >
        <div className="ConfirmationBox-main">
          <div className="text-center">Total {formatDeltaUsd(totalUsd)}</div>
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
            {groups.map((rebateItems) => (
              <Row key={rebateItems[0].marketAddress} rebateItems={rebateItems} />
            ))}
          </div>
        </div>
      </Modal>
    );
  }
);

const Row = memo(({ rebateItems }: { rebateItems: RebateInfoItem[] }) => {
  const marketsInfoData = useMarketsInfoData();
  const market = getByKey(marketsInfoData, rebateItems[0].marketAddress);
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
    const groupedMarkets: Record<string, number> = {};
    const reduced = rebateItems.reduce((acc, rebateItem) => {
      const key = rebateItem.marketAddress + rebateItem.tokenAddress;
      if (typeof groupedMarkets[key] === "number") {
        const index = groupedMarkets[key];
        acc[index].value = acc[index].value + rebateItem.value;
      } else {
        groupedMarkets[key] = acc.length;
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
        price !== undefined && decimals ? bigMath.mulDiv(rebateItem.value, price, expandDecimals(1, decimals)) : null;
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
          position="top-end"
          portalClassName="ClaimModal-row-tooltip"
          handle={usd}
          renderContent={renderContent}
        />
      </div>
    </div>
  );
});
