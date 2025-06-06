import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useMemo } from "react";

import { ARBITRUM, AVALANCHE, getConstant } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { getIcons } from "config/icons";
import { useGmxPrice, useTotalGmxStaked, useTotalGmxSupply } from "domain/legacy";
import { useGovTokenAmount } from "domain/synthetics/governance/useGovTokenAmount";
import { useGovTokenDelegates } from "domain/synthetics/governance/useGovTokenDelegates";
import { useChainId } from "lib/chains";
import { ProcessedData, useENS } from "lib/legacy";
import { expandDecimals, formatAmount, formatBalanceAmount, formatKeyAmount } from "lib/numbers";
import { shortenAddressOrEns } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";

import { AlertInfo } from "components/AlertInfo/AlertInfo";
import { AmountWithUsdBalance, AmountWithUsdHuman } from "components/AmountWithUsd/AmountWithUsd";
import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import GMXAprTooltip from "components/Stake/GMXAprTooltip";
import ChainsStatsTooltipRow from "components/StatsTooltip/ChainsStatsTooltipRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";

import { GMX_DAO_LINKS, getGmxDAODelegateLink } from "./constants";

export function GmxAndVotingPowerCard({
  processedData,
  sbfGmxBalance,
  setIsUnstakeModalVisible,
  setUnstakeModalTitle,
  setUnstakeModalMaxAmount,
  setUnstakeValue,
  setUnstakingTokenSymbol,
  setUnstakeMethodName,
  showStakeGmxModal,
}: {
  processedData: ProcessedData | undefined;
  sbfGmxBalance: bigint;
  setIsUnstakeModalVisible: (visible: boolean) => void;
  setUnstakeModalTitle: (title: string) => void;
  setUnstakeModalMaxAmount: (amount: bigint) => void;
  setUnstakeValue: (value: string) => void;
  setUnstakingTokenSymbol: (symbol: string) => void;
  setUnstakeMethodName: (methodName: string) => void;
  showStakeGmxModal: () => void;
}) {
  const { chainId } = useChainId();
  const { active, signer, account } = useWallet();
  const icons = getIcons(chainId);

  const govTokenAmount = useGovTokenAmount(chainId);
  const govTokenDelegatesAddress = useGovTokenDelegates(chainId);
  const { ensName: govTokenDelegatesEns } = useENS(govTokenDelegatesAddress);
  const { gmxPrice, gmxPriceFromArbitrum, gmxPriceFromAvalanche } = useGmxPrice(
    chainId,
    { arbitrum: chainId === ARBITRUM ? signer : undefined },
    active
  );
  const isAnyFeeGmxTrackerRewards = (processedData?.feeGmxTrackerRewardsUsd ?? 0n) > 10n ** BigInt(USD_DECIMALS) / 100n;

  const stakedGMXInfo = useTotalGmxStaked();

  const { [AVALANCHE]: avaxGmxStaked, [ARBITRUM]: arbitrumGmxStaked, total: totalGmxStaked } = stakedGMXInfo;

  let { total: totalGmxSupply } = useTotalGmxSupply();

  let stakedGmxSupplyUsd;
  if (totalGmxStaked !== 0n && gmxPrice !== undefined) {
    stakedGmxSupplyUsd = bigMath.mulDiv(totalGmxStaked, gmxPrice, expandDecimals(1, 18));
  }

  let totalSupplyUsd;
  if (totalGmxSupply !== undefined && totalGmxSupply !== 0n && gmxPrice !== undefined) {
    totalSupplyUsd = bigMath.mulDiv(totalGmxSupply, gmxPrice, expandDecimals(1, 18));
  }

  const showUnstakeGmxModal = () => {
    setIsUnstakeModalVisible(true);
    setUnstakeModalTitle(t`Unstake GMX`);
    let maxAmount = processedData?.gmxInStakedGmx;

    if (maxAmount !== undefined) {
      maxAmount = bigMath.min(maxAmount, sbfGmxBalance);
    }

    setUnstakeModalMaxAmount(maxAmount!);
    setUnstakeValue("");
    setUnstakingTokenSymbol("GMX");
    setUnstakeMethodName("unstakeGmx");
  };

  const stakedEntries = useMemo(
    () => ({
      "Staked on Arbitrum": arbitrumGmxStaked,
      "Staked on Avalanche": avaxGmxStaked,
    }),
    [arbitrumGmxStaked, avaxGmxStaked]
  );

  const gmxAvgAprText = useMemo(() => {
    return `${formatAmount(processedData?.gmxAprTotal, 2, 2, true)}%`;
  }, [processedData?.gmxAprTotal]);

  const nativeTokenSymbol = getConstant(chainId, "nativeTokenSymbol");
  const wrappedTokenSymbol = getConstant(chainId, "wrappedTokenSymbol");

  return (
    <div className="App-card StakeV2-gmx-card">
      <div className="App-card-title">
        <div className="inline-flex items-center">
          <img className="mr-5 h-20" alt="GMX" src={icons?.gmx} height={20} />
          {t`GMX & Voting Power`}
        </div>
      </div>
      <div className="App-card-divider"></div>
      <div className="App-card-content">
        <div className="App-card-row">
          <div className="label">
            <Trans>Price</Trans>
          </div>
          <div>
            {gmxPrice === undefined ? (
              "..."
            ) : (
              <Tooltip
                position="bottom-end"
                className="whitespace-nowrap"
                handle={"$" + formatAmount(gmxPrice, USD_DECIMALS, 2, true)}
                renderContent={() => (
                  <>
                    <StatsTooltipRow
                      label={t`Price on Avalanche`}
                      value={formatAmount(gmxPriceFromAvalanche, USD_DECIMALS, 2, true)}
                    />
                    <StatsTooltipRow
                      label={t`Price on Arbitrum`}
                      value={formatAmount(gmxPriceFromArbitrum, USD_DECIMALS, 2, true)}
                    />
                  </>
                )}
              />
            )}
          </div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Wallet</Trans>
          </div>
          <div>
            <AmountWithUsdBalance
              amount={processedData?.gmxBalance}
              decimals={18}
              symbol="GMX"
              usd={processedData?.gmxBalanceUsd}
            />
          </div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Staked</Trans>
          </div>
          <div>
            <AmountWithUsdBalance
              amount={processedData?.gmxInStakedGmx}
              decimals={18}
              symbol="GMX"
              usd={processedData?.gmxInStakedGmxUsd}
            />
          </div>
        </div>
        {chainId === ARBITRUM && (
          <div className="App-card-row">
            <div className="label">
              <Trans>Voting Power</Trans>
            </div>
            <div>
              {govTokenAmount !== undefined ? (
                <Tooltip
                  position="bottom-end"
                  className="nowrap"
                  handle={formatBalanceAmount(govTokenAmount, 18, "GMX DAO", { showZero: true })}
                  content={
                    <>
                      {govTokenDelegatesAddress === NATIVE_TOKEN_ADDRESS && govTokenAmount > 0 ? (
                        <AlertInfo type="warning" className={cx("DelegateGMXAlertInfo")} textColor="text-yellow-500">
                          <Trans>
                            <ExternalLink href={GMX_DAO_LINKS.VOTING_POWER} className="display-inline">
                              Delegate your undelegated {formatAmount(govTokenAmount, 18, 2, true)} GMX DAO
                            </ExternalLink>{" "}
                            voting power.
                          </Trans>
                        </AlertInfo>
                      ) : null}
                      <StatsTooltipRow
                        label={t`Delegated to`}
                        value={
                          !govTokenDelegatesAddress || govTokenDelegatesAddress === NATIVE_TOKEN_ADDRESS ? (
                            <Trans>No delegate found</Trans>
                          ) : (
                            <ExternalLink href={getGmxDAODelegateLink(govTokenDelegatesAddress)}>
                              {govTokenDelegatesAddress === account
                                ? t`Myself`
                                : govTokenDelegatesEns
                                  ? shortenAddressOrEns(govTokenDelegatesEns, 25)
                                  : shortenAddressOrEns(govTokenDelegatesAddress, 13)}
                            </ExternalLink>
                          )
                        }
                        showDollar={false}
                      />
                      <br />
                      <ExternalLink href={GMX_DAO_LINKS.DELEGATES}>Explore the list of delegates</ExternalLink>.
                    </>
                  }
                />
              ) : (
                "..."
              )}
            </div>
          </div>
        )}
        <div className="App-card-divider"></div>
        <div className="App-card-row">
          <div className="label">
            <Trans>APR</Trans>
          </div>
          <div>
            <Tooltip
              handle={gmxAvgAprText}
              position="bottom-end"
              renderContent={() => (
                <GMXAprTooltip processedData={processedData} nativeTokenSymbol={nativeTokenSymbol} />
              )}
            />
          </div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Rewards</Trans>
          </div>
          <div>
            <Tooltip
              handle={`$${formatKeyAmount(processedData, "totalStakingRewardsUsd", USD_DECIMALS, 2, true)}`}
              position="bottom-end"
              content={
                <>
                  <StatsTooltipRow
                    label={t`GMX`}
                    value={
                      <AmountWithUsdBalance
                        amount={processedData?.extendedGmxTrackerRewards}
                        decimals={18}
                        usd={processedData?.extendedGmxTrackerRewardsUsd}
                      />
                    }
                    showDollar={false}
                  />
                  <StatsTooltipRow
                    label="Escrowed GMX"
                    value={
                      <AmountWithUsdBalance
                        amount={processedData?.stakedGmxTrackerRewards}
                        decimals={18}
                        usd={processedData?.stakedGmxTrackerRewardsUsd}
                      />
                    }
                    showDollar={false}
                  />
                  {isAnyFeeGmxTrackerRewards && (
                    <StatsTooltipRow
                      label={`${nativeTokenSymbol} (${wrappedTokenSymbol})`}
                      value={
                        <AmountWithUsdBalance
                          amount={processedData?.feeGmxTrackerRewards}
                          decimals={18}
                          usd={processedData?.feeGmxTrackerRewardsUsd}
                        />
                      }
                      showDollar={false}
                    />
                  )}
                </>
              }
            />
          </div>
        </div>
        <div className="App-card-divider"></div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Total Staked</Trans>
          </div>
          <div>
            <Tooltip
              position="bottom-end"
              className="whitespace-nowrap"
              handle={<AmountWithUsdHuman amount={totalGmxStaked} decimals={18} usd={stakedGmxSupplyUsd} />}
              content={<ChainsStatsTooltipRow showDollar={false} decimalsForConversion={18} entries={stakedEntries} />}
            />
          </div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Total Supply</Trans>
          </div>
          <AmountWithUsdHuman amount={totalGmxSupply} decimals={18} usd={totalSupplyUsd} />
        </div>
        <div className="App-card-divider" />
        <div className="App-card-buttons m-0">
          <Button variant="secondary" to="/buy_gmx">
            <Trans>Buy GMX</Trans>
          </Button>
          {active && (
            <Button variant="secondary" onClick={showStakeGmxModal}>
              <Trans>Stake</Trans>
            </Button>
          )}
          {active && (
            <Button variant="secondary" onClick={showUnstakeGmxModal}>
              <Trans>Unstake</Trans>
            </Button>
          )}
          {active && chainId === ARBITRUM && (
            <Button variant="secondary" to={GMX_DAO_LINKS.VOTING_POWER} newTab>
              <Trans>Delegate</Trans>
            </Button>
          )}
          {active && (
            <Button variant="secondary" to="/begin_account_transfer">
              <Trans>Transfer Account</Trans>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
