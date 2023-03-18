import { useWeb3React } from "@web3-react/core";
import { getContract } from "config/contracts";
import { getWhitelistedTokens } from "config/tokens";
import { TokenInfo, useInfoTokens } from "domain/tokens";
import { useChainId } from "lib/chains";
import { contractFetcher } from "lib/contracts";
import { BASIS_POINTS_DIVISOR } from "lib/legacy";
import useSWR from "swr";

import VaultV2 from "abis/VaultV2.json";
import { BigNumber, BigNumberish } from "ethers";
import { bigNumberify, expandDecimals, formatAmount } from "lib/numbers";

import "./Stats.css";
import Tooltip from "components/Tooltip/Tooltip";

function shareBar(share?: BigNumberish, total?: BigNumberish) {
  if (!share || !total || bigNumberify(total)!.eq(0)) {
    return null;
  }

  let progress = bigNumberify(share)!.mul(100).div(total).toNumber();
  progress = Math.min(progress, 100);

  return (
    <div className="Stats-share-bar">
      <div className="Stats-share-bar-fill" style={{ width: `${progress}%` }} />
    </div>
  );
}

export default function Stats() {
  const { active, library } = useWeb3React();
  const { chainId } = useChainId();

  const whitelistedTokens = getWhitelistedTokens(chainId);
  const tokenList = whitelistedTokens.filter((t) => !t.isWrapped);

  const vaultAddress = getContract(chainId, "Vault");

  const { data: totalTokenWeights } = useSWR<BigNumber>(
    [`GlpSwap:totalTokenWeights:${active}`, chainId, vaultAddress, "totalTokenWeights"],
    {
      fetcher: contractFetcher(library, VaultV2),
    }
  );

  const { infoTokens } = useInfoTokens(library, chainId, active, undefined, undefined);

  let adjustedUsdgSupply = bigNumberify(0);

  for (let i = 0; i < tokenList.length; i++) {
    const token = tokenList[i];
    const tokenInfo = infoTokens[token.address];
    if (tokenInfo && tokenInfo.usdgAmount) {
      adjustedUsdgSupply = adjustedUsdgSupply!.add(tokenInfo.usdgAmount);
    }
  }

  return (
    <table className="Stats">
      <thead>
        <tr>
          <th>Token</th>
          <th>Pool</th>
          <th>
            <Tooltip
              handle="Max pool"
              renderContent={() => "uses internal USDG value of token. may deviate from pool amount"}
            />
          </th>
          <th>
            <Tooltip
              handle="Long OI"
              renderContent={() =>
                "Current OI is calculated as sum of all positions sizes minus all positions collateral. In reality it's higher"
              }
            />
          </th>
          <th>Short OI</th>
          <th>
            <Tooltip
              handle="Weight"
              renderContent={() => "Progress bar shows deviation from target. Bigger -> further from target"}
            />
          </th>
          <th>
            <Tooltip handle="Target" renderContent={() => "= token target weight * AUM"} />
          </th>
        </tr>
      </thead>
      <tbody>
        {Object.values(infoTokens)
          .filter((t: TokenInfo) => t.symbol !== "ETH")
          .map((tokenInfo: TokenInfo) => {
            let maxPoolUsd;
            if (tokenInfo.maxUsdgAmount && tokenInfo.maxUsdgAmount.gt(0)) {
              maxPoolUsd = expandDecimals(tokenInfo.maxUsdgAmount, 12);
            }

            let maxPoolClassName = "";
            if (tokenInfo.managedUsd?.mul(11).div(10).gt(maxPoolUsd)) {
              maxPoolClassName = "warn";
            }

            let targetWeightBps;
            let currentWeightBps;
            let targetUsdg;
            let weightClassName = "";
            let weightDiffBps;
            if (tokenInfo.usdgAmount?.gt(0) && adjustedUsdgSupply?.gt(0) && tokenInfo.weight?.gt(0)) {
              currentWeightBps = tokenInfo.usdgAmount.mul(BASIS_POINTS_DIVISOR).div(adjustedUsdgSupply);
              // use add(1).div(10).mul(10) to round numbers up
              targetWeightBps = tokenInfo.weight
                .mul(BASIS_POINTS_DIVISOR)
                .div(totalTokenWeights as BigNumberish)
                .add(1)
                .div(10)
                .mul(10);

              weightDiffBps = currentWeightBps.sub(targetWeightBps).abs();
              if (weightDiffBps.gt(targetWeightBps.mul(35).div(100))) {
                weightClassName = "warn";
              } else if (weightDiffBps.gt(targetWeightBps.mul(25).div(100))) {
                weightClassName = "warn";
              }

              targetUsdg = adjustedUsdgSupply.mul(targetWeightBps).div(BASIS_POINTS_DIVISOR);
            }

            let longOiClassName = "";
            if (
              tokenInfo.maxGlobalLongSize &&
              tokenInfo.guaranteedUsd?.mul(11).div(10).gt(tokenInfo.maxGlobalLongSize)
            ) {
              longOiClassName = "warn";
            }

            let shortOiClassName = "";
            if (
              tokenInfo.maxGlobalShortSize &&
              tokenInfo.guaranteedUsd?.mul(11).div(10).gt(tokenInfo.maxGlobalShortSize)
            ) {
              shortOiClassName = "warn";
            }

            return (
              <tr>
                <td>{tokenInfo.symbol}</td>
                <td>
                  <>${formatAmount(tokenInfo.managedUsd, 30, 0, true)}</>
                </td>
                <td className={maxPoolClassName}>
                  ${formatAmount(tokenInfo.usdgAmount, 18, 0, true)} / $
                  {formatAmount(tokenInfo.maxUsdgAmount, 18, 0, true)}
                  {shareBar(tokenInfo.usdgAmount, tokenInfo.maxUsdgAmount)}
                </td>
                <td className={longOiClassName}>
                  ${formatAmount(tokenInfo.guaranteedUsd, 30, 0, true)} / $
                  {formatAmount(tokenInfo.maxGlobalLongSize, 30, 0, true)}
                  {shareBar(tokenInfo.guaranteedUsd, tokenInfo.maxGlobalLongSize)}
                </td>
                <td className={shortOiClassName}>
                  ${formatAmount(tokenInfo.globalShortSize, 30, 0, true)} / $
                  {formatAmount(tokenInfo.maxGlobalShortSize, 30, 0, true)}
                  {shareBar(tokenInfo.globalShortSize, tokenInfo.maxGlobalShortSize)}
                </td>
                <td className={weightClassName}>
                  {formatAmount(currentWeightBps, 2, 2)} / {formatAmount(targetWeightBps, 2, 0)}%
                  {shareBar(weightDiffBps, targetWeightBps)}
                </td>
                <td>
                  ${formatAmount(tokenInfo.usdgAmount, 18, 0, true)} / ${formatAmount(targetUsdg, 18, 0, true)}
                </td>
              </tr>
            );
          })}
      </tbody>
    </table>
  );
}
