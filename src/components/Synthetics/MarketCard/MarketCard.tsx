import { Trans, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { SLIPPAGE_BPS_KEY } from "config/localStorage";
import {
  getAvailableUsdLiquidityForPosition,
  getMarketName,
  getMaxReservedUsd,
  getReservedUsd,
  useMarketsInfo,
} from "domain/synthetics/markets";
import { getTokenData, useAvailableTokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { DEFAULT_SLIPPAGE_AMOUNT } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatUsd } from "lib/numbers";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import "./MarketCard.scss";
import { getByKey } from "lib/objects";
import { useMemo } from "react";

export type Props = {
  marketAddress?: string;
  isLong: boolean;
};

export function MarketCard(p: Props) {
  const { chainId } = useChainId();

  const [savedSlippageAmount] = useLocalStorageSerializeKey([chainId, SLIPPAGE_BPS_KEY], DEFAULT_SLIPPAGE_AMOUNT);

  const { marketsInfoData } = useMarketsInfo(chainId);
  const { tokensData } = useAvailableTokensData(chainId);

  const market = getByKey(marketsInfoData, p.marketAddress);
  const marketName = market ? getMarketName(market) : "...";

  const indexToken = getTokenData(tokensData, market?.indexTokenAddress, "native");

  const entryPrice = p.isLong ? indexToken?.prices?.maxPrice : indexToken?.prices?.minPrice;
  const exitPrice = p.isLong ? indexToken?.prices?.minPrice : indexToken?.prices?.maxPrice;

  const longShortText = p.isLong ? t`Long` : t`Short`;

  const { liquidity, maxReservedUsd, reservedUsd } = useMemo(() => {
    if (!market) return {};

    return {
      liquidity: getAvailableUsdLiquidityForPosition(market, p.isLong),
      maxReservedUsd: getMaxReservedUsd(market, p.isLong),
      reservedUsd: getReservedUsd(market, p.isLong),
    };
  }, [market, p.isLong]);

  return (
    <div className="Exchange-swap-market-box App-box App-box-border">
      <div className="App-card-title">
        {longShortText}&nbsp;{indexToken?.symbol}
      </div>
      <div className="App-card-divider" />
      <div>
        <ExchangeInfoRow label={t`Market`} value={marketName || "..."} />
        <ExchangeInfoRow
          label={t`Entry Price`}
          value={
            <Tooltip
              handle={formatUsd(entryPrice) || "..."}
              position="right-bottom"
              renderContent={() => (
                <Trans>
                  The position will be opened at {formatUsd(entryPrice)} with a max slippage of{" "}
                  {(savedSlippageAmount! / 100.0).toFixed(2)}%.
                  <br />
                  <br />
                  The slippage amount can be configured under Settings, found by clicking on your address at the top
                  right of the page after connecting your wallet.
                  <br />
                  <br />
                  <ExternalLink href="https://gmxio.gitbook.io/gmx/trading#opening-a-position">More Info</ExternalLink>
                </Trans>
              )}
            />
          }
        />

        <ExchangeInfoRow
          label={t`Exit Price`}
          value={
            <Tooltip
              handle={formatUsd(exitPrice) || "..."}
              position="right-bottom"
              renderContent={() => (
                <Trans>
                  If you have an existing position, the position will be closed at {formatUsd(entryPrice)}.
                  <br />
                  <br />
                  This exit price will change with the price of the asset.
                  <br />
                  <br />
                  <ExternalLink href="https://gmxio.gitbook.io/gmx/trading#opening-a-position">More Info</ExternalLink>
                </Trans>
              )}
            />
          }
        />

        <ExchangeInfoRow
          label={t`Available liquidity`}
          value={
            <Tooltip
              handle={formatUsd(liquidity) || "..."}
              position="right-bottom"
              renderContent={() => (
                <div>
                  <StatsTooltipRow
                    label={t`Max ${indexToken?.symbol} ${longShortText.toLocaleLowerCase()} capacity`}
                    value={formatUsd(maxReservedUsd) || "..."}
                    showDollar={false}
                  />

                  <StatsTooltipRow
                    label={t`Current ${indexToken?.symbol} ${longShortText.toLocaleLowerCase()}`}
                    value={formatUsd(reservedUsd) || "..."}
                    showDollar={false}
                  />
                </div>
              )}
            />
          }
        />
      </div>
    </div>
  );
}
