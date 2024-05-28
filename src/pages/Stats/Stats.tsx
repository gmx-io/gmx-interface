import { getContract } from "config/contracts";
import { getWhitelistedV1Tokens } from "config/tokens";
import { TokenInfo, useInfoTokens } from "domain/tokens";
import { useChainId } from "lib/chains";
import { contractFetcher } from "lib/contracts";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import useSWR from "swr";
import { getServerUrl } from "config/backend";
import { formatDistance } from "date-fns";

import Reader from "abis/Reader.json";
import VaultV2 from "abis/VaultV2.json";
import { BigNumberish } from "ethers";
import { bigNumberify, expandDecimals, formatAmount } from "lib/numbers";

import "./Stats.css";
import Tooltip from "components/Tooltip/Tooltip";
import useWallet from "lib/wallets/useWallet";
import { bigMath } from "lib/bigmath";

function shareBar(share?: BigNumberish, total?: BigNumberish) {
  if (!share || !total) {
    return null;
  }

  let progress = Number(bigMath.mulDiv(bigNumberify(share)!, 100n, BigInt(total)));
  progress = Math.min(progress, 100);

  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
  const style = { width: `${progress}%` };

  return (
    <div className="Stats-share-bar">
      <div className="Stats-share-bar-fill" style={style} />
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
  const { active, signer } = useWallet();
  const { chainId } = useChainId();

  const readerAddress = getContract(chainId, "Reader");
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");

  const whitelistedTokens = getWhitelistedV1Tokens(chainId);
  const tokenList = whitelistedTokens.filter((t) => !t.isWrapped);
  const whitelistedTokenAddresses = whitelistedTokens.map((token) => token.address);

  const vaultAddress = getContract(chainId, "Vault");

  const { data: totalTokenWeights } = useSWR<bigint>(
    [`GlpSwap:totalTokenWeights:${active}`, chainId, vaultAddress, "totalTokenWeights"],
    {
      fetcher: contractFetcher(signer, VaultV2) as any,
    }
  );

  const { data: fundingRateInfo } = useSWR([active, chainId, readerAddress, "getFundingRates"], {
    fetcher: contractFetcher(signer, Reader, [vaultAddress, nativeTokenAddress, whitelistedTokenAddresses]),
  });
  const { infoTokens } = useInfoTokens(signer, chainId, active, undefined, fundingRateInfo as any);

  let adjustedUsdgSupply = 0n;

  for (let i = 0; i < tokenList.length; i++) {
    const token = tokenList[i];
    const tokenInfo = infoTokens[token.address];
    if (tokenInfo && tokenInfo.usdgAmount !== undefined) {
      adjustedUsdgSupply = adjustedUsdgSupply! + tokenInfo.usdgAmount;
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
      tokenInfo.maxGlobalLongSize !== undefined &&
      tokenInfo.guaranteedUsd !== undefined &&
      bigMath.mulDiv(tokenInfo.guaranteedUsd, 11n, 10n) > tokenInfo.maxGlobalLongSize
    ) {
      className = "warn";
    }
    if (
      !isLong &&
      tokenInfo.maxGlobalShortSize !== undefined &&
      tokenInfo.globalShortSize !== undefined &&
      bigMath.mulDiv(tokenInfo.globalShortSize, 11n, 10n) > tokenInfo.maxGlobalShortSize
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
            <Tooltip handle="Min buffer" renderContent={() => "Floor, in tokens"} />
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
            if (tokenInfo.maxUsdgAmount !== undefined && tokenInfo.maxUsdgAmount > 0) {
              maxPoolUsd = expandDecimals(tokenInfo.maxUsdgAmount, 12);
            }

            let maxPoolClassName = "";
            if (tokenInfo.managedUsd !== undefined && bigMath.mulDiv(tokenInfo.managedUsd, 11n, 10n) > maxPoolUsd) {
              maxPoolClassName = "warn";
            }

            let targetWeightBps: bigint | undefined = undefined;
            let currentWeightBps: bigint | undefined = undefined;
            let targetUsdg: bigint | undefined = undefined;
            let weightClassName = "";
            let weightDiffBps: bigint | undefined = undefined;
            if (
              tokenInfo.usdgAmount !== undefined &&
              tokenInfo.usdgAmount > 0 &&
              adjustedUsdgSupply !== undefined &&
              adjustedUsdgSupply > 0 &&
              tokenInfo.weight !== undefined &&
              tokenInfo.weight > 0
            ) {
              currentWeightBps = bigMath.mulDiv(tokenInfo.usdgAmount, BASIS_POINTS_DIVISOR_BIGINT, adjustedUsdgSupply);
              // use add(1).div(10).mul(10) to round numbers up
              targetWeightBps =
                ((bigMath.mulDiv(tokenInfo.weight, BASIS_POINTS_DIVISOR_BIGINT, totalTokenWeights!) + 1n) / 10n) * 10n;

              weightDiffBps = bigMath.abs(currentWeightBps - targetWeightBps);
              if (weightDiffBps > bigMath.mulDiv(targetWeightBps, 35n, 100n)) {
                weightClassName = "warn";
              } else if (weightDiffBps > bigMath.mulDiv(targetWeightBps, 25n, 100n)) {
                weightClassName = "warn";
              }

              targetUsdg = bigMath.mulDiv(adjustedUsdgSupply, targetWeightBps, BASIS_POINTS_DIVISOR_BIGINT);
            }

            return (
              <tr key={tokenInfo.address}>
                <td>{tokenInfo.symbol}</td>
                <td>
                  <>${formatAmountHuman(tokenInfo.managedUsd, 30)}</>
                </td>
                <td className={maxPoolClassName}>
                  ${formatAmountHuman(tokenInfo.usdgAmount, 18)} / ${formatAmountHuman(tokenInfo.maxUsdgAmount, 18)}
                  {shareBar(tokenInfo.usdgAmount, tokenInfo.maxUsdgAmount)}
                </td>
                <td>
                  {formatAmountHuman(tokenInfo.bufferAmount, tokenInfo.decimals)} /{" "}
                  {formatAmountHuman(tokenInfo.poolAmount, tokenInfo.decimals)}
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
                <td>
                  {formatAmount(
                    tokenInfo.fundingRate === undefined ? undefined : tokenInfo.fundingRate * (24n * 365n),
                    4,
                    2
                  ) + "%"}
                </td>
              </tr>
            );
          })}
      </tbody>
    </table>
  );
}
