import { Trans, t } from "@lingui/macro";
import { useMemo } from "react";

import { BASIS_POINTS_DIVISOR_BIGINT, USD_DECIMALS } from "config/factors";
import { getIcons } from "config/icons";
import { TOKEN_COLOR_MAP, getWhitelistedV1Tokens } from "sdk/configs/tokens";
import { GLP_PRICE_DECIMALS } from "config/ui";
import { useInfoTokens } from "domain/tokens";
import { bigMath } from "sdk/utils/bigmath";
import { GLP_DECIMALS } from "lib/legacy";
import { formatAmount } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";

import InteractivePieChart from "components/InteractivePieChart/InteractivePieChart";
import AssetDropdown from "./AssetDropdown";

export function GlpCard({
  chainId,
  glpPrice,
  glpSupply,
  glpMarketCap,
  adjustedUsdgSupply,
}: {
  chainId: number;
  glpPrice: bigint;
  glpSupply: bigint | undefined;
  glpMarketCap: bigint | undefined;
  adjustedUsdgSupply: bigint;
}) {
  const currentIcons = getIcons(chainId)!;

  const { active, signer } = useWallet();

  const whitelistedTokens = getWhitelistedV1Tokens(chainId);
  const tokenList = whitelistedTokens.filter((t) => !t.isWrapped);

  const { infoTokens } = useInfoTokens(signer, chainId, active, undefined, undefined);

  const { glpPool, stableGlp, totalGlp } = useMemo(() => {
    let stableGlp = 0;
    let totalGlp = 0;
    const glpPool = tokenList
      .map((token) => {
        const tokenInfo = infoTokens[token.address];
        if (tokenInfo.usdgAmount !== undefined && adjustedUsdgSupply !== undefined && adjustedUsdgSupply > 0n) {
          const currentWeightBps = bigMath.mulDiv(
            tokenInfo.usdgAmount,
            BASIS_POINTS_DIVISOR_BIGINT,
            adjustedUsdgSupply
          );
          if (tokenInfo.isStable) {
            stableGlp += parseFloat(`${formatAmount(currentWeightBps, 2, 2, false)}`);
          }
          totalGlp += parseFloat(`${formatAmount(currentWeightBps, 2, 2, false)}`);
          return {
            fullname: token.name,
            name: token.symbol,
            color: TOKEN_COLOR_MAP[token.symbol ?? "default"] ?? TOKEN_COLOR_MAP.default,
            value: parseFloat(`${formatAmount(currentWeightBps, 2, 2, false)}`),
          };
        }
        return null;
      })
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
      .filter(<T extends unknown>(x: T): x is NonNullable<T> => Boolean(x));

    return { glpPool, stableGlp, totalGlp };
  }, [adjustedUsdgSupply, infoTokens, tokenList]);

  let stablePercentage = totalGlp > 0 ? ((stableGlp * 100) / totalGlp).toFixed(2) : "0.0";

  return (
    <div className="App-card">
      <div className="stats-block">
        <div className="App-card-title">
          <div className="App-card-title-mark">
            <div className="App-card-title-mark-icon">
              <img src={currentIcons.glp} width="40" alt="GLP Icon" />
            </div>
            <div className="App-card-title-mark-info">
              <div className="App-card-title-mark-title">GLP</div>
              <div className="App-card-title-mark-subtitle">GLP</div>
            </div>
            <div>
              <AssetDropdown assetSymbol="GLP" />
            </div>
          </div>
        </div>
        <div className="App-card-divider"></div>
        <div className="App-card-content">
          <div className="App-card-row">
            <div className="label">
              <Trans>Price</Trans>
            </div>
            <div>${formatAmount(glpPrice, USD_DECIMALS, GLP_PRICE_DECIMALS, true)}</div>
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>Supply</Trans>
            </div>
            <div>{formatAmount(glpSupply, GLP_DECIMALS, 0, true)} GLP</div>
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>Total Staked</Trans>
            </div>
            <div>${formatAmount(glpMarketCap, USD_DECIMALS, 0, true)}</div>
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>Market Cap</Trans>
            </div>
            <div>${formatAmount(glpMarketCap, USD_DECIMALS, 0, true)}</div>
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>Stablecoin Percentage</Trans>
            </div>
            <div>{stablePercentage}%</div>
          </div>
        </div>
      </div>
      <InteractivePieChart data={glpPool} label={t`GLP Pool`} />
    </div>
  );
}
