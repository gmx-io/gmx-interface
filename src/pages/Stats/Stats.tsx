import { useWeb3React } from "@web3-react/core";
import { getContract } from "config/contracts";
import { getWhitelistedTokens } from "config/tokens";
import { TokenInfo, useInfoTokens } from "domain/tokens";
import { useChainId } from "lib/chains";
import { contractFetcher } from "lib/contracts";
import { BASIS_POINTS_DIVISOR } from "lib/legacy";
import useSWR from "swr";
import { getServerUrl } from "config/backend";
import { formatDistance } from "date-fns";

import Reader from "abis/Reader.json";
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

export default function Stats() {
  const { active, library } = useWeb3React();
  const { chainId } = useChainId();

  const readerAddress = getContract(chainId, "Reader");
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");

  const whitelistedTokens = getWhitelistedTokens(chainId);
  const tokenList = whitelistedTokens.filter((t) => !t.isWrapped);
  const whitelistedTokenAddresses = whitelistedTokens.map((token) => token.address);

  const vaultAddress = getContract(chainId, "Vault");

  const { data: totalTokenWeights } = useSWR<BigNumber>(
    [`GlpSwap:totalTokenWeights:${active}`, chainId, vaultAddress, "totalTokenWeights"],
    {
      fetcher: contractFetcher(library, VaultV2),
    }
  );

  const { data: fundingRateInfo } = useSWR([active, chainId, readerAddress, "getFundingRates"], {
    fetcher: contractFetcher(library, Reader, [vaultAddress, nativeTokenAddress, whitelistedTokenAddresses]),
  });
  const { infoTokens } = useInfoTokens(library, chainId, active, undefined, fundingRateInfo as any);

  let adjustedUsdgSupply = bigNumberify(0);

  for (let i = 0; i < tokenList.length; i++) {
    const token = tokenList[i];
    const tokenInfo = infoTokens[token.address];
    if (tokenInfo && tokenInfo.usdgAmount) {
      adjustedUsdgSupply = adjustedUsdgSupply!.add(tokenInfo.usdgAmount);
    }
  }

  const { data: capsSettingsByToken } = useSWR(getServerUrl(chainId, "/caps"), {
    fetcher: (url) =>
      fetch(url)
        .then((res) => res.json())
        .then((res) =>
          res.reduce((acc, cur) => {
            acc[cur.id] = cur.data;
            return acc;
          }, {})
        ),
  });

  function renderOiCell(tokenInfo: TokenInfo, isLong: boolean) {
    if (tokenInfo.isStable) {
      return "n/a";
    }

    let className = "";
    if (
      isLong &&
      tokenInfo.maxGlobalLongSize &&
      tokenInfo.guaranteedUsd?.mul(11).div(10).gt(tokenInfo.maxGlobalLongSize)
    ) {
      className = "warn";
    }
    if (
      !isLong &&
      tokenInfo.maxGlobalShortSize &&
      tokenInfo.guaranteedUsd?.mul(11).div(10).gt(tokenInfo.maxGlobalShortSize)
    ) {
      className = "warn";
    }

    const caps = capsSettingsByToken?.[tokenInfo.address];
    const oi = isLong ? tokenInfo.guaranteedUsd : tokenInfo.globalShortSize;
    const maxGlobalSize = isLong ? tokenInfo.maxGlobalLongSize : tokenInfo.maxGlobalShortSize;
    const openInterestIncrement = isLong ? caps?.openInterestIncrementLong : caps?.openInterestIncrementShort;
    const globalSizeLastIncreasedAt = isLong
      ? caps?.globalSizeLastIncreasedAtLong
      : caps?.globalSizeLastIncreasedAtShort;
    const maxOpenInterest = isLong ? caps?.maxOpenInterestLong : caps?.maxOpenInterestShort;

    return (
      <>
        <Tooltip
          handle={
            <div className={className}>
              ${formatAmountHuman(oi, 30)} / ${formatAmountHuman(maxGlobalSize, 30)}
            </div>
          }
          renderContent={() => {
            return (
              <div>
                <>
                  Increase rate: ${formatAmountHuman(openInterestIncrement, 0)} / 30 minutes
                  <br />
                  Last increased at:{" "}
                  {caps?.globalSizeLastIncreasedAtLong
                    ? formatDistance(new Date(globalSizeLastIncreasedAt * 1000), new Date(), {
                        addSuffix: true,
                      })
                    : null}
                  <br />
                  Max possible cap: ${formatAmountHuman(maxOpenInterest, 0)}
                </>
              </div>
            );
          }}
        />
        <div className={className}>{shareBar(oi, maxGlobalSize)}</div>
      </>
    );
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
          <th>Borrow rate</th>
        </tr>
      </thead>
      <tbody>
        {Object.values(infoTokens)
          .filter((t: TokenInfo) => !t.isNative)
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

            return (
              <tr>
                <td>{tokenInfo.symbol}</td>
                <td>
                  <>${formatAmountHuman(tokenInfo.managedUsd, 30)}</>
                </td>
                <td className={maxPoolClassName}>
                  ${formatAmountHuman(tokenInfo.usdgAmount, 18)} / ${formatAmountHuman(tokenInfo.maxUsdgAmount, 18)}
                  {shareBar(tokenInfo.usdgAmount, tokenInfo.maxUsdgAmount)}
                </td>
                <td>{renderOiCell(tokenInfo, true)}</td>
                <td>{renderOiCell(tokenInfo, false)}</td>
                <td className={weightClassName}>
                  {formatAmountHuman(currentWeightBps, 2)} / {formatAmountHuman(targetWeightBps, 2)}%
                  {shareBar(weightDiffBps, targetWeightBps)}
                </td>
                <td>
                  ${formatAmountHuman(tokenInfo.usdgAmount, 18)} / ${formatAmountHuman(targetUsdg, 18)}
                </td>
                <td>{formatAmount(tokenInfo.fundingRate?.mul(24 * 365), 4, 2) + "%"}</td>
              </tr>
            );
          })}
      </tbody>
    </table>
  );
}
