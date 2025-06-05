import { Trans } from "@lingui/macro";
import cx from "classnames";

import { USD_DECIMALS } from "config/factors";
import { getMarketIndexName } from "domain/synthetics/markets";
import { getMintableInfoGlv, getTotalSellableInfoGlv, isGlvInfo } from "domain/synthetics/markets/glv";
import { GlvAndGmMarketsInfoData, GlvOrMarketInfo } from "domain/synthetics/markets/types";
import { TokenData, TokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { formatDateTime } from "lib/dates";
import { bigintToNumber, formatAmountHuman } from "lib/numbers";
import { usePoolsIsMobilePage } from "pages/Pools/usePoolsIsMobilePage";

import { BridgingInfo } from "components/Synthetics/BridgingInfo/BridgingInfo";
import { useMarketMintableTokens } from "components/Synthetics/MarketStats/hooks/useMarketMintableTokens";
import { useMarketSellableToken } from "components/Synthetics/MarketStats/hooks/useMarketSellableToken";

import { PoolsDetailsMarketAmount } from "./PoolsDetailsMarketAmount";

export function PoolsDetailsAbout({
  glvOrMarketInfo,
  marketToken,
  marketsInfoData,
  marketTokensData,
}: {
  glvOrMarketInfo: GlvOrMarketInfo | undefined;
  marketToken: TokenData | undefined;
  marketsInfoData: GlvAndGmMarketsInfoData;
  marketTokensData: TokensData | undefined;
}) {
  const { chainId } = useChainId();
  const isGlv = isGlvInfo(glvOrMarketInfo);
  const sellableInfo = useMarketSellableToken(glvOrMarketInfo, marketToken);
  const mintableInfo = useMarketMintableTokens(glvOrMarketInfo, marketToken);
  const sellable = isGlv ? getTotalSellableInfoGlv(glvOrMarketInfo, marketsInfoData, marketTokensData) : sellableInfo;
  const mintable = isGlv ? getMintableInfoGlv(glvOrMarketInfo, marketTokensData) : mintableInfo;

  const isMobile = usePoolsIsMobilePage();

  const marketName = glvOrMarketInfo ? getMarketIndexName(glvOrMarketInfo) : "";

  const exposedToLabel = glvOrMarketInfo?.isSameCollaterals
    ? glvOrMarketInfo?.longToken?.symbol
    : `${glvOrMarketInfo?.longToken?.symbol} and ${glvOrMarketInfo?.shortToken?.symbol}`;

  return (
    <div className="flex flex-col gap-16">
      <div className="text-body-medium text-slate-100">
        {isGlv ? (
          <Trans>
            This token is a vault of automatically rebalanced GM tokens that accrue fees from leverage trading and swaps
            from the included markets. Backed by {glvOrMarketInfo?.longToken?.symbol} and{" "}
            {glvOrMarketInfo?.shortToken?.symbol}.
          </Trans>
        ) : (
          <Trans>
            This token automatically accrues fees from leverage trading and swaps for the {marketName} market. It is
            also exposed to {exposedToLabel} as per the composition displayed.
          </Trans>
        )}
      </div>

      <BridgingInfo chainId={chainId} tokenSymbol={glvOrMarketInfo?.longToken?.symbol} />
      {!glvOrMarketInfo?.isSameCollaterals && (
        <BridgingInfo chainId={chainId} tokenSymbol={glvOrMarketInfo?.shortToken?.symbol} />
      )}

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
              glvOrMarketInfo?.shiftLastExecutedAt
                ? glvOrMarketInfo?.shiftLastExecutedAt === 0n
                  ? "-"
                  : formatDateTime(bigintToNumber(glvOrMarketInfo.shiftLastExecutedAt, 0))
                : "..."
            }
          />
        )}
      </div>
    </div>
  );
}
