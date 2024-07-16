import { Trans } from "@lingui/macro";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCopyToClipboard } from "react-use";
import type { Address } from "viem";

import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI } from "config/chains";
import { MarketInfo } from "domain/synthetics/markets";
import { bigMath } from "lib/bigmath";
import { useChainId } from "lib/chains";
import { formatDateTime } from "lib/dates";
import { expandDecimals, formatAmount, formatTokenAmountWithUsd } from "lib/numbers";
import { shortenAddressOrEns } from "lib/wallets";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/AccountDashboard";
import { RebateGroup, usePriceImpactRebateGroups } from "./hooks/usePriceImpactRebatesStats";

import Checkbox from "components/Checkbox/Checkbox";
import SpinningLoader from "components/Common/SpinningLoader";
import Footer from "components/Footer/Footer";

import "./PriceImpactRebatesStats.scss";

export const PriceImpactRebatesStatsPage = memo(() => {
  const [pageIndex, setPageIndex] = useState(0);
  const [reviewed, setReviewed] = useState(false);
  const [hasMore, loadedPageIndex, rebateGroups] = usePriceImpactRebateGroups(pageIndex, reviewed);
  const loading = pageIndex !== loadedPageIndex;

  useEffect(() => {
    setPageIndex(0);
  }, [reviewed]);

  return (
    <div className="default-container page-layout">
      <div className="flex">
        <Checkbox isChecked={reviewed} setIsChecked={setReviewed}>
          Incl. reviewed
        </Checkbox>
        <div className="PriceImpactRebatesStats-loading">{loading && <SpinningLoader />}</div>
      </div>
      <RebateStatsTable rebateGroups={rebateGroups} />
      <div>
        {pageIndex > 0 && (
          <button
            disabled={loading}
            className="App-button-option App-card-option"
            onClick={() => setPageIndex((page) => Math.max(0, page - 1))}
          >
            <Trans>Prev</Trans>
          </button>
        )}
        {hasMore && (
          <button
            disabled={loading}
            className="App-button-option App-card-option"
            onClick={() => setPageIndex((page) => page + 1)}
          >
            <Trans>Next</Trans>
          </button>
        )}
      </div>
      <Footer />
    </div>
  );
});

const RebateStatsTable = memo(({ rebateGroups }: { rebateGroups: RebateGroup[] }) => {
  return (
    <div className="PriceImpactRebatesStatsPage-table">
      <div className="PriceImpactRebatesStatsPage-row">
        <div className="PriceImpactRebatesStatsPage-cell-timekey">Timekey</div>
        <div className="PriceImpactRebatesStatsPage-cell-time">Time</div>
        <div className="PriceImpactRebatesStatsPage-cell-market">Market</div>
        <div className="PriceImpactRebatesStatsPage-cell-token">Token</div>
        <div className="PriceImpactRebatesStatsPage-cell-approved">Factor</div>
        <div className="PriceImpactRebatesStatsPage-cell-usd">$</div>
        <div className="PriceImpactRebatesStatsPage-cell-actions"></div>
      </div>
      {rebateGroups.map((group) => (
        <RebateGroupRow key={group.id} rebateGroup={group} />
      ))}
    </div>
  );
});

const RebateGroupRow = memo(({ rebateGroup }: { rebateGroup: RebateGroup }) => {
  const [, copyToClipboard] = useCopyToClipboard();
  const { chainId } = useChainId();
  const handleCopyCommandClick = useCallback(
    (e) => {
      e.stopPropagation();
      const networkStr = {
        [ARBITRUM]: "arbitrum",
        [AVALANCHE]: "avalanche",
        [AVALANCHE_FUJI]: "avalancheFuji",
      }[chainId];
      copyToClipboard(
        `MARKET=${rebateGroup.marketInfo?.marketTokenAddress} TOKEN=${rebateGroup.tokenData?.address} TIME_KEY=${
          rebateGroup.timeKey
        } FACTOR=${rebateGroup.factor.toString()} npx hardhat --network ${networkStr} run scripts/updateClaimableCollateralFactor.ts`
      );
    },
    [
      chainId,
      copyToClipboard,
      rebateGroup.factor,
      rebateGroup.marketInfo?.marketTokenAddress,
      rebateGroup.timeKey,
      rebateGroup.tokenData?.address,
    ]
  );
  const handleCopyAccountsClick = useCallback(
    (e) => {
      e.stopPropagation();

      copyToClipboard(rebateGroup.userRebates.map((rebateItem) => rebateItem.account).join(","));
    },
    [copyToClipboard, rebateGroup.userRebates]
  );
  const [accountsShown, setAccountsShown] = useState(false);
  const handleExpandClick = useCallback(() => setAccountsShown((shown) => !shown), []);
  const total = useMemo(() => {
    return rebateGroup.userRebates.reduce((sum, rebateItem) => sum + rebateItem.value, 0n);
  }, [rebateGroup.userRebates]);
  const usd = useMemo(() => {
    return rebateGroup.userRebates.reduce((sum, rebateItem) => {
      const price = rebateItem.tokenData?.prices.maxPrice;
      const decimals = rebateItem.tokenData?.decimals;
      return price !== undefined && decimals
        ? sum + bigMath.mulDiv(rebateItem.value, price, expandDecimals(1, decimals))
        : sum;
    }, 0n);
  }, [rebateGroup.userRebates]);

  return (
    <>
      <div
        className={accountsShown ? "PriceImpactRebatesStatsPage-subrow" : "PriceImpactRebatesStatsPage-row"}
        onClick={handleExpandClick}
      >
        <div className="PriceImpactRebatesStatsPage-cell-timekey">{rebateGroup.timeKey}</div>
        <div className="PriceImpactRebatesStatsPage-cell-time">{formatTime(rebateGroup.timeKey)}</div>
        <div className="PriceImpactRebatesStatsPage-cell-market">{formatMarket(rebateGroup.marketInfo)}</div>
        <div className="PriceImpactRebatesStatsPage-cell-token">{rebateGroup.tokenData?.symbol}</div>
        <div className="PriceImpactRebatesStatsPage-cell-approved">
          {rebateGroup.factor > 0 ? `${formatAmount(rebateGroup.factor, 28, 2)}%` : "-"}{" "}
        </div>
        <div className="PriceImpactRebatesStatsPage-cell-usd">
          {formatTokenAmountWithUsd(total, usd, rebateGroup.tokenData?.symbol, rebateGroup.tokenData?.decimals)}
        </div>
        <div className="PriceImpactRebatesStatsPage-cell-actions">
          <button className="SubaccountModal-mini-button" onClick={handleCopyCommandClick}>
            Copy Cmd
          </button>
          <button className="SubaccountModal-mini-button" onClick={handleCopyAccountsClick}>
            Copy Users
          </button>
        </div>
      </div>
      {accountsShown ? <RebateAccountsRow rebateGroup={rebateGroup} /> : null}
    </>
  );
});

const RebateAccountsRow = memo(({ rebateGroup }: { rebateGroup: RebateGroup }) => {
  return (
    <div className="PriceImpactRebatesStatsPage-account">
      <div className="PriceImpactRebatesStatsPage-row">
        <div className="PriceImpactRebatesStatsPage-cell-timekey"></div>
        <div className="PriceImpactRebatesStatsPage-cell-time"></div>
        <div className="PriceImpactRebatesStatsPage-cell-market">Address</div>
        <div className="PriceImpactRebatesStatsPage-cell-token"></div>
        <div className="PriceImpactRebatesStatsPage-cell-approved">Factor</div>
        <div className="PriceImpactRebatesStatsPage-cell-usd">USD</div>
        <div className="PriceImpactRebatesStatsPage-cell-actions"></div>
      </div>
      {rebateGroup.userRebates.map((rebateItem) => {
        const price = rebateItem.tokenData?.prices.maxPrice;
        const decimals = rebateItem.tokenData?.decimals;
        const usd =
          price !== undefined && decimals
            ? bigMath.mulDiv(rebateItem.value, price, expandDecimals(1, decimals))
            : undefined;
        return (
          <div key={rebateItem.id} className="PriceImpactRebatesStatsPage-row">
            <div className="PriceImpactRebatesStatsPage-cell-timekey"></div>
            <div className="PriceImpactRebatesStatsPage-cell-time"></div>
            <div className="PriceImpactRebatesStatsPage-cell-market">
              <Link to={buildAccountDashboardUrl(rebateItem.account as Address, undefined, 2)}>
                {shortenAddressOrEns(rebateItem.account, 15)}
              </Link>
            </div>
            <div className="PriceImpactRebatesStatsPage-cell-token"></div>
            <div className="PriceImpactRebatesStatsPage-cell-approved">
              {rebateItem.factor > 0 ? `${formatAmount(rebateItem.factor, 28, 2)}%` : "-"}{" "}
            </div>
            <div className="PriceImpactRebatesStatsPage-cell-usd">
              {formatTokenAmountWithUsd(
                rebateItem.value,
                usd,
                rebateItem.tokenData?.symbol,
                rebateItem.tokenData?.decimals
              )}
            </div>
            <div className="PriceImpactRebatesStatsPage-cell-actions"></div>
          </div>
        );
      })}
    </div>
  );
});

function formatTime(timeKey: string) {
  return formatDateTime(Number(timeKey) * 60 * 60);
}

function formatMarket(marketInfo: MarketInfo | undefined) {
  if (!marketInfo) return "";

  return marketInfo.name;
}
