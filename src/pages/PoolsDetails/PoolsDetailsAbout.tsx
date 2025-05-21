import { Trans } from "@lingui/macro";
import cx from "classnames";

import { USD_DECIMALS } from "config/factors";
import { getMarketIndexName } from "domain/synthetics/markets";
import { getMintableInfoGlv, getTotalSellableInfoGlv, isGlvInfo } from "domain/synthetics/markets/glv";
import { GlvAndGmMarketsInfoData, GlvInfo } from "domain/synthetics/markets/types";
import { TokenData, TokensData } from "domain/synthetics/tokens";
import { formatDateTime } from "lib/dates";
import { bigintToNumber, formatAmountHuman } from "lib/numbers";
import { usePoolsIsMobilePage } from "pages/Pools/usePoolsIsMobilePage";
import { MarketInfo } from "sdk/types/markets";

import { useMarketMintableTokens } from "components/Synthetics/MarketStats/hooks/useMarketMintableTokens";
import { useMarketSellableToken } from "components/Synthetics/MarketStats/hooks/useMarketSellableToken";

import { PoolsDetailsMarketAmount } from "./PoolsDetailsMarketAmount";

export function PoolsDetailsAbout({
  marketInfo,
  marketToken,
  marketsInfoData,
  marketTokensData,
}: {
  marketInfo: MarketInfo | GlvInfo | undefined;
  marketToken: TokenData | undefined;
  marketsInfoData: GlvAndGmMarketsInfoData;
  marketTokensData: TokensData | undefined;
}) {
  const isGlv = isGlvInfo(marketInfo);
  const sellableInfo = useMarketSellableToken(marketInfo, marketToken);
  const mintableInfo = useMarketMintableTokens(marketInfo, marketToken);
  const sellable = isGlv ? getTotalSellableInfoGlv(marketInfo, marketsInfoData, marketTokensData) : sellableInfo;
  const mintable = isGlv ? getMintableInfoGlv(marketInfo, marketTokensData) : mintableInfo;

  const isMobile = usePoolsIsMobilePage();

  const marketName = marketInfo ? getMarketIndexName(marketInfo) : "";

  return (
    <div className="flex flex-col gap-16">
      <div className="text-body-medium text-slate-100">
        {isGlv ? (
          <Trans>
            This token is a vault of automatically rebalanced GM tokens that accrue fees from leverage trading and swaps
            from the included markets. Backed by {marketInfo?.longToken?.symbol} and {marketInfo?.shortToken?.symbol}.
          </Trans>
        ) : (
          <Trans>
            This token automatically accrues fees from leverage trading and swaps for the {marketName} market. It is
            also exposed to {marketInfo?.longToken?.symbol} and {marketInfo?.shortToken?.symbol} as per the composition
            displayed.
          </Trans>
        )}
      </div>
      <div className={cx("grid pt-8", { "grid-cols-1 gap-12": isMobile, "grid-cols-3": !isMobile })}>
        <PoolsDetailsMarketAmount
          label={<Trans>Buyable</Trans>}
          value={
            marketToken?.decimals
              ? `${formatAmountHuman(mintable?.mintableAmount, marketToken?.decimals, false, 2)} ${marketToken?.symbol}`
              : "..."
          }
          secondaryValue={formatAmountHuman(mintable?.mintableUsd, USD_DECIMALS, true, 2)}
        />
        <PoolsDetailsMarketAmount
          label={<Trans>Sellable</Trans>}
          value={
            marketToken?.decimals
              ? `${formatAmountHuman(sellable?.totalAmount, marketToken?.decimals, false, 2)} ${marketToken?.symbol}`
              : "..."
          }
          secondaryValue={formatAmountHuman(sellable?.totalUsd, USD_DECIMALS, true, 2)}
        />

        {isGlv && (
          <PoolsDetailsMarketAmount
            label={<Trans>Last Rebalance</Trans>}
            value={
              marketInfo?.shiftLastExecutedAt
                ? marketInfo?.shiftLastExecutedAt === 0n
                  ? "-"
                  : formatDateTime(bigintToNumber(marketInfo.shiftLastExecutedAt, 0))
                : "..."
            }
          />
        )}
      </div>
    </div>
  );
}
