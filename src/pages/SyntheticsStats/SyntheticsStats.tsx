import { useChainId } from "lib/chains";
import { PRECISION } from "lib/legacy";

import { BigNumber, BigNumberish } from "ethers";
import { formatAmount, formatUsd } from "lib/numbers";

import { ShareBar } from "components/ShareBar/ShareBar";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { getBorrowingFeeFactor, getFundingApr } from "domain/synthetics/fees";
import { useVirtualInventory } from "domain/synthetics/fees/useVirtualInventory";
import {
  MarketInfo,
  getMarketIndexName,
  getMarketPoolName,
  getMaxReservedUsd,
  getReservedUsd,
  useMarketsInfo,
} from "domain/synthetics/markets";
import { convertToUsd, getMidPrice } from "domain/synthetics/tokens";
import cx from "classnames";
import "./SyntheticsStats.scss";

function formatAmountHuman(amount: BigNumberish | undefined, tokenDecimals: number) {
  const n = Number(formatAmount(amount, tokenDecimals));

  if (n > 1000000) {
    return `${(n / 1000000).toFixed(1)}M`;
  }
  if (n > 1000) {
    return `${(n / 1000).toFixed(1)}K`;
  }
  return n.toFixed(1);
}

function formatFactor(factor: BigNumber) {
  if (factor.gt(PRECISION)) {
    return factor.div(PRECISION).toString();
  } else if (factor.gt(0)) {
    let factorDecimals = PRECISION.div(factor).toString().length;

    return (Number(factor) / 10 ** 30).toFixed(factorDecimals);
  }

  return factor.toString();
}

export function SyntheticsStats() {
  const { chainId } = useChainId();

  const { marketsInfoData } = useMarketsInfo(chainId);
  const { virtualInventoryForPositions, virtualInventoryForSwaps } = useVirtualInventory(chainId);
  // const { swapTokens, infoTokens } = useAvailableTokenOptions(chainId);

  // const [fromTokenAddress, setFromTokenAddress] = useState(NATIVE_TOKEN_ADDRESS);

  const markets = Object.values(marketsInfoData || {});

  return (
    <div className="SyntheticsStats">
      <table>
        <thead>
          <tr>
            <th>Market</th>
            <th>Pool Value</th>
            <th>PnL</th>
            <th>Borrowing Fees</th>
            <th>
              <Tooltip handle="Funding APR" renderContent={() => "Per 1h"} />
            </th>
            <th>Liquidity Long</th>
            <th>Liquidity Short</th>
            <th>OI Balance</th>
            <th>
              <Tooltip handle="VI Positions" renderContent={() => "Virtual inventory for positons"} />
            </th>
            <th>
              <Tooltip handle="VI Swaps" renderContent={() => "Virtual inventory for swaps (Long / Short)"} />
            </th>
            <th>Config</th>
          </tr>
        </thead>
        <tbody>
          {markets.map((market) => {
            const totalInterestUsd = market.longInterestUsd.add(market.shortInterestUsd);

            const midLongPrice = getMidPrice(market.longToken.prices);
            const midShortPrice = getMidPrice(market.shortToken.prices);

            const longPoolUsd = convertToUsd(market.longPoolAmount, market.longToken.decimals, midLongPrice);
            const shortPoolUsd = convertToUsd(market.shortPoolAmount, market.shortToken.decimals, midShortPrice);

            const swapImpactUsdLong = convertToUsd(
              market.swapImpactPoolAmountLong,
              market.longToken.decimals,
              midLongPrice
            );
            const swapImpactUsdShort = convertToUsd(
              market.swapImpactPoolAmountShort,
              market.shortToken.decimals,
              midShortPrice
            );
            const positionImpactUsd = convertToUsd(
              market.positionImpactPoolAmount,
              market.indexToken.decimals,
              market.indexToken.prices.minPrice
            );

            const virtualInventoryPositions = virtualInventoryForPositions?.[market.indexToken.address];
            const virtualInventorySwapsLong =
              virtualInventoryForSwaps?.[market.marketTokenAddress]?.[market.longTokenAddress];
            const virtualInventorySwapsShort =
              virtualInventoryForSwaps?.[market.marketTokenAddress]?.[market.shortTokenAddress];

            const reservedUsdLong = getReservedUsd(market, true);
            const maxReservedUsdLong = getMaxReservedUsd(market, true);

            const reservedUsdShort = getReservedUsd(market, false);
            const maxReservedUsdShort = getMaxReservedUsd(market, false);

            const borrowingRateLong = getBorrowingFeeFactor(market, true, 60 * 60);
            const borrowingRateShort = getBorrowingFeeFactor(market, false, 60 * 60);

            const fundingAprLong = getFundingApr(market, true, 60 * 60);
            const fundingAprShort = getFundingApr(market, false, 60 * 60);

            return (
              <tr key={market.marketTokenAddress}>
                <td>
                  <div className="cell">
                    <div>{getMarketIndexName(market)}</div>
                    <div className="muted">{getMarketPoolName(market)}</div>
                  </div>
                </td>
                <td>
                  <div className="cell">
                    <Tooltip
                      handle={`$${formatAmountHuman(market.poolValueMax, 30)}`}
                      renderContent={() => (
                        <>
                          <StatsTooltipRow label="Pool USD Long" value={formatAmountHuman(longPoolUsd, 30)} />
                          <StatsTooltipRow label="Pool USD Short" value={formatAmountHuman(shortPoolUsd, 30)} />
                          <StatsTooltipRow
                            label={`Swap Imapct Amount ${market.longToken.symbol}`}
                            value={formatAmountHuman(swapImpactUsdLong, 30)}
                          />
                          <StatsTooltipRow
                            label={`Swap Imapct Amount ${market.shortToken.symbol}`}
                            value={formatAmountHuman(swapImpactUsdShort, 30)}
                          />
                          <StatsTooltipRow
                            label={`Position Imapct Amount`}
                            value={formatAmountHuman(positionImpactUsd, 30)}
                          />
                        </>
                      )}
                    />
                  </div>
                </td>
                <td>
                  <div className="cell">
                    <Tooltip
                      handle={
                        <span className={cx({ positive: market.netPnlMax.gt(0), negative: market.netPnlMax.lt(0) })}>
                          {market.netPnlMax.gt(0) ? "+" : "-"}${formatAmountHuman(market.netPnlMax.abs(), 30)}
                        </span>
                      }
                      renderContent={() => (
                        <>
                          <StatsTooltipRow label="PnL Long" value={formatAmountHuman(market.pnlLongMax, 30)} />
                          <StatsTooltipRow label="PnL Short" value={formatAmountHuman(market.pnlShortMax, 30)} />
                        </>
                      )}
                    />
                  </div>
                </td>
                <td>
                  <div className="cell">
                    <Tooltip
                      handle={`$${formatAmountHuman(market.totalBorrowingFees, 30)}`}
                      renderContent={() => (
                        <>
                          <StatsTooltipRow
                            label="Rate Long"
                            value={`-${formatAmount(borrowingRateLong, 30, 4)}% / 1h`}
                            showDollar={false}
                          />
                          <StatsTooltipRow
                            label="Rate Short"
                            value={`-${formatAmount(borrowingRateShort, 30, 4)}% / 1h`}
                            showDollar={false}
                          />
                        </>
                      )}
                    />
                  </div>
                </td>
                <td>
                  <div className="cell">
                    <div>
                      <span>
                        {market.longsPayShorts ? "-" : "+"}
                        {formatAmount(fundingAprLong.abs(), 30, 4)}%
                      </span>{" "}
                      /{" "}
                      <span>
                        {market.longsPayShorts ? "+" : "-"}
                        {formatAmount(fundingAprShort.abs(), 30, 4)}%
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="cell">
                    <div style={{ marginBottom: "4px" }}>
                      ${formatAmountHuman(reservedUsdLong, 30)} / ${formatAmountHuman(maxReservedUsdLong, 30)}
                    </div>
                    <ShareBar share={reservedUsdLong} total={maxReservedUsdLong} />
                  </div>
                </td>
                <td>
                  <div className="cell">
                    <div style={{ marginBottom: "4px" }}>
                      ${formatAmountHuman(reservedUsdShort, 30)} / ${formatAmountHuman(maxReservedUsdShort, 30)}
                    </div>
                    <ShareBar share={reservedUsdShort} total={maxReservedUsdShort} />
                  </div>
                </td>
                <td>
                  <div className="cell">
                    <div style={{ marginBottom: "4px" }}>
                      ${formatAmountHuman(market.longInterestUsd, 30)} / $
                      {formatAmountHuman(market.shortInterestUsd, 30)}
                    </div>
                    <ShareBar
                      className="MarketCard-pool-balance-bar"
                      share={market.longInterestUsd}
                      total={totalInterestUsd}
                    />
                  </div>
                </td>
                <td>
                  <div className="cell">
                    <div>
                      {virtualInventoryPositions?.gt(0) ? "Short" : "Long"}{" "}
                      {formatUsd(virtualInventoryPositions?.abs()) || "$0.00"}
                    </div>
                  </div>
                </td>
                <td>
                  <div className="cell">
                    <div>
                      {formatUsd(convertToUsd(virtualInventorySwapsLong, market.longToken.decimals, midLongPrice)) ||
                        "$0.00"}{" "}
                      /{" "}
                      {formatUsd(convertToUsd(virtualInventorySwapsShort, market.shortToken.decimals, midShortPrice)) ||
                        "$0.00"}{" "}
                    </div>
                  </div>
                </td>
                <td>
                  <div className="cell">
                    <Tooltip
                      position="right-bottom"
                      handle="..."
                      renderContent={() => (
                        <>
                          <div>Position Impact</div>
                          <br />
                          <StatsTooltipRow
                            label="Exponent"
                            value={formatFactor(market.positionImpactExponentFactor)}
                            showDollar={false}
                          />
                          <StatsTooltipRow
                            label="Positive factor"
                            value={formatFactor(market.positionImpactFactorPositive)}
                            showDollar={false}
                          />
                          <StatsTooltipRow
                            label="Negative factor"
                            value={formatFactor(market.positionImpactFactorNegative)}
                            showDollar={false}
                          />
                          <br />
                          <div className="Tooltip-divider" />
                          <br />
                          <div>Swap Impact</div>
                          <br />
                          <StatsTooltipRow
                            label="Exponent"
                            value={formatFactor(market.swapImpactExponentFactor)}
                            showDollar={false}
                          />
                          <StatsTooltipRow
                            label="Positive factor"
                            value={formatFactor(market.swapImpactFactorPositive)}
                            showDollar={false}
                          />
                          <StatsTooltipRow
                            label="Negative factor"
                            value={formatFactor(market.swapImpactFactorNegative)}
                            showDollar={false}
                          />
                          <br />
                          <div className="Tooltip-divider" />
                          <br />
                          <div>Fees factors</div>
                          <br />
                          <StatsTooltipRow
                            label="Swap Fee factor"
                            value={formatFactor(market.swapFeeFactor)}
                            showDollar={false}
                          />
                          <StatsTooltipRow
                            label="Position Fee factor"
                            value={formatFactor(market.positionFeeFactor)}
                            showDollar={false}
                          />
                          <br />
                        </>
                      )}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* <div className="SyntheticsStats-swap-section">
        <div className="SyntheticsStats-token-selector-container">
          <div>Swap From</div>
          <TokenSelector
            label={`Swap From`}
            chainId={chainId}
            tokenAddress={fromTokenAddress}
            onSelectToken={(token) => setFromTokenAddress(token.address)}
            tokens={swapTokens}
            infoTokens={infoTokens}
            className="SyntheticsStats-token-selector"
            showSymbolImage={false}
            showTokenImgInDropdown={true}
          />
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>To Token</th>
            <th>Max Liquidity</th>
            <th>Most liquid Route</th>
          </tr>
        </thead>
        <tbody>
          {swapTokens
            .filter((token) => !getIsEquivalentTokens(getToken(chainId, fromTokenAddress), token) && !token.isNative)
            .map((token) => (
              <SwapStatsRow key={token.address} fromTokenAddress={fromTokenAddress} toTokenAddress={token.address} />
            ))}
        </tbody>
      </table> */}
    </div>
  );
}

// function SwapStatsRow({ fromTokenAddress, toTokenAddress }: { fromTokenAddress: string; toTokenAddress: string }) {
//   const { chainId } = useChainId();

//   const { marketsInfoData } = useMarketsInfo(chainId);

//   const { maxSwapLiquidity, maxLiquiditySwapPath } = useSwapRoutes({
//     fromTokenAddress,
//     toTokenAddress,
//   });

//   return (
//     <tr>
//       <td>{getToken(chainId, toTokenAddress).symbol}</td>
//       <td>${formatAmountHuman(maxSwapLiquidity, 30)}</td>
//       <td>
//         {maxLiquiditySwapPath?.map((marketAddress) => getByKey(marketsInfoData, marketAddress)?.name).join(" -> ")}
//       </td>
//     </tr>
//   );
// }
