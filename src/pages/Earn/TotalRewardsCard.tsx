import { Trans, t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import useSWR from "swr";

import { ARBITRUM, getConstant } from "config/chains";
import { getContract } from "config/contracts";
import { USD_DECIMALS } from "config/factors";
import { MARKETS } from "config/markets";
import { useGmMarketsApy } from "domain/synthetics/markets/useGmMarketsApy";
import { useChainId } from "lib/chains";
import { contractFetcher } from "lib/contracts/contractFetcher";
import { PLACEHOLDER_ACCOUNT, ProcessedData } from "lib/legacy";
import { formatAmount, formatKeyAmount } from "lib/numbers";
import { usePendingTxns } from "lib/usePendingTxns";
import useWallet from "lib/wallets/useWallet";

import Button from "components/Button/Button";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { ClaimModal } from "./ClaimModal";

import ReaderV2 from "sdk/abis/ReaderV2.json";

export function TotalRewardsCard({
  processedData,
  showStakeGmxModal,
}: {
  processedData: ProcessedData | undefined;
  showStakeGmxModal: () => void;
}) {
  const { active, account, signer } = useWallet();
  const { chainId } = useChainId();
  const { openConnectModal } = useConnectModal();
  const [, setPendingTxns] = usePendingTxns();

  const [isCompoundModalVisible, setIsCompoundModalVisible] = useState(false);

  const nativeTokenSymbol = getConstant(chainId, "nativeTokenSymbol");
  const wrappedTokenSymbol = getConstant(chainId, "wrappedTokenSymbol");
  const rewardRouterAddress = getContract(chainId, "RewardRouter");
  const readerAddress = getContract(chainId, "Reader");
  const gmxAddress = getContract(chainId, "GMX");
  const esGmxAddress = getContract(chainId, "ES_GMX");
  const glpAddress = getContract(chainId, "GLP");

  const stakedGmxTrackerAddress = getContract(chainId, "StakedGmxTracker");

  const walletTokens = [gmxAddress, esGmxAddress, glpAddress, stakedGmxTrackerAddress];

  const isAnyNativeTokenRewards =
    (processedData?.totalNativeTokenRewardsUsd ?? 0n) > 10n ** BigInt(USD_DECIMALS) / 100n;

  const { mutate: refetchBalances } = useSWR(
    [
      `StakeV2:walletBalances:${active}`,
      chainId,
      readerAddress,
      "getTokenBalancesWithSupplies",
      account || PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: contractFetcher(signer, ReaderV2, [walletTokens]),
    }
  );

  const gmxAvgAprText = useMemo(() => {
    return `${formatAmount(processedData?.gmxAprTotal, 2, 2, true)}%`;
  }, [processedData?.gmxAprTotal]);

  const gmxMarketAddress = useMemo(() => {
    if (chainId === ARBITRUM) {
      return Object.values(MARKETS[ARBITRUM]).find((m) => m.indexTokenAddress === gmxAddress)?.marketTokenAddress;
    }
    return undefined;
  }, [chainId, gmxAddress]);

  const {
    marketsTokensApyData,
    marketsTokensIncentiveAprData,
    // glvTokensIncentiveAprData,
    // marketsTokensLidoAprData,
    // glvApyInfoData,
  } = useGmMarketsApy(chainId);

  const gmxMarketApyDataText = useMemo(() => {
    if (!gmxMarketAddress || chainId !== ARBITRUM) return;

    const gmxApy =
      (marketsTokensApyData?.[gmxMarketAddress] ?? 0n) + (marketsTokensIncentiveAprData?.[gmxMarketAddress] ?? 0n);

    return `${formatAmount(gmxApy, 28, 2, true)}%`;
  }, [marketsTokensApyData, marketsTokensIncentiveAprData, gmxMarketAddress, chainId]);

  const hideToasts = useCallback(() => toast.dismiss(), []);
  const handleStakeGmx = useCallback(async () => {
    hideToasts();
    showStakeGmxModal();
  }, [showStakeGmxModal, hideToasts]);

  return (
    <>
      <ClaimModal
        setPendingTxns={setPendingTxns}
        isVisible={isCompoundModalVisible}
        setIsVisible={setIsCompoundModalVisible}
        rewardRouterAddress={rewardRouterAddress}
        totalGmxRewards={processedData?.totalGmxRewards}
        wrappedTokenSymbol={wrappedTokenSymbol}
        nativeTokenSymbol={nativeTokenSymbol}
        signer={signer}
        chainId={chainId}
        isNativeTokenToClaim={isAnyNativeTokenRewards}
        onClaimSuccess={refetchBalances}
        gmxUsageOptionsMsg={
          <ul className="list-disc">
            <li className="!pb-0">
              <Trans>
                <Link className="link-underline" to="#" onClick={handleStakeGmx}>
                  Stake GMX
                </Link>{" "}
                and earn {gmxAvgAprText} APR
              </Trans>
            </li>
            {chainId === ARBITRUM && (
              <>
                <li className="!pb-0">
                  <Trans>
                    <Link
                      className="link-underline"
                      to={`/pools/?market=${gmxMarketAddress}&operation=buy&scroll=1`}
                      onClick={hideToasts}
                    >
                      Provide liquidity
                    </Link>{" "}
                    and earn {gmxMarketApyDataText} APY
                  </Trans>
                </li>
                <li className="!pb-0">
                  <Trans>
                    <Link
                      className="link-underline"
                      to={`/trade/long/?mode=market&from=gmx&market=gmx`}
                      onClick={hideToasts}
                    >
                      Trade GMX
                    </Link>
                  </Trans>
                </li>
              </>
            )}
          </ul>
        }
      />
      <div className="App-card primary StakeV2-total-rewards-card">
        <div className="App-card-title">
          <Trans>Total Rewards</Trans>
        </div>
        <div className="App-card-divider"></div>
        <div className="App-card-content">
          <div className="App-card-row">
            <div className="label">GMX</div>
            <Tooltip
              handle={
                <div>
                  {formatKeyAmount(processedData, "totalGmxRewards", 18, 4, true)} ($
                  {formatKeyAmount(processedData, "totalGmxRewardsUsd", USD_DECIMALS, 2, true)})
                </div>
              }
              position="bottom-end"
              content={
                <>
                  <StatsTooltipRow
                    label={
                      <>
                        {t`GMX Staked Rewards`}:
                        <div className="mx-4 inline" />
                      </>
                    }
                    showDollar={false}
                    value={
                      <>
                        {formatKeyAmount(processedData, "extendedGmxTrackerRewards", 18, 4, true)} ($
                        {formatKeyAmount(processedData, "extendedGmxTrackerRewardsUsd", USD_DECIMALS, 2, true)})
                      </>
                    }
                  />
                  <StatsTooltipRow
                    label={
                      <>
                        {t`Vested Claimable GMX`}:
                        <div className="mx-4 inline" />
                      </>
                    }
                    showDollar={false}
                    value={
                      <>
                        {formatKeyAmount(processedData, "totalVesterRewards", 18, 4, true)} ($
                        {formatKeyAmount(processedData, "totalVesterRewardsUsd", USD_DECIMALS, 2, true)})
                      </>
                    }
                  />
                </>
              }
            />
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>Escrowed GMX</Trans>
            </div>
            <div>
              {formatKeyAmount(processedData, "totalEsGmxRewards", 18, 4, true)} ($
              {formatKeyAmount(processedData, "totalEsGmxRewardsUsd", USD_DECIMALS, 2, true)})
            </div>
          </div>
          {isAnyNativeTokenRewards ? (
            <div className="App-card-row">
              <div className="label">
                {nativeTokenSymbol} ({wrappedTokenSymbol})
              </div>
              <div>
                {formatKeyAmount(processedData, "totalNativeTokenRewards", 18, 4, true)} ($
                {formatKeyAmount(processedData, "totalNativeTokenRewardsUsd", USD_DECIMALS, 2, true)})
              </div>
            </div>
          ) : null}
          <div className="App-card-row">
            <div className="label">
              <Trans>Total</Trans>
            </div>
            <div>${formatKeyAmount(processedData, "totalRewardsUsd", USD_DECIMALS, 2, true)}</div>
          </div>
          <div className="App-card-footer">
            <div className="App-card-divider"></div>
            <div className="App-card-buttons m-0">
              {active && (
                <Button variant="secondary" onClick={() => setIsCompoundModalVisible(true)}>
                  <Trans>Claim</Trans>
                </Button>
              )}
              {!active && (
                <Button variant="secondary" onClick={openConnectModal}>
                  <Trans>Connect Wallet</Trans>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
