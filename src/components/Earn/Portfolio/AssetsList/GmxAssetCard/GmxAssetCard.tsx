import { autoUpdate, flip, FloatingPortal, offset, shift, useFloating } from "@floating-ui/react";
import { Menu } from "@headlessui/react";
import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { Link } from "react-router-dom";
import useSWR from "swr";
import { zeroAddress } from "viem";

import { ARBITRUM } from "config/chains";
import { getContract } from "config/contracts";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { useGmxPrice } from "domain/legacy";
import { isLoyaltyTrackingActive, useStakingPowerData } from "domain/stake/useStakingPowerData";
import { useChainId } from "lib/chains";
import { contractFetcher } from "lib/contracts";
import { PLACEHOLDER_ACCOUNT, StakingProcessedData } from "lib/legacy";
import { expandDecimals, formatAmount, formatUsd } from "lib/numbers";
import { sendEarnPortfolioItemClickEvent } from "lib/userAnalytics/earnEvents";
import useWallet from "lib/wallets/useWallet";
import { BuyGmxModal } from "pages/BuyGMX/BuyGmxModal";
import { bigMath } from "sdk/utils/bigmath";
import type { StakingPowerResponse } from "sdk/utils/staking/types";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import Button from "components/Button/Button";
import { VestModal } from "components/Earn/Portfolio/AssetsList/GmxAssetCard/VestModal";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import Tooltip from "components/Tooltip/Tooltip";

import ArrowRightIcon from "img/ic_arrow_right.svg?react";
import DownloadIcon from "img/ic_download2.svg?react";
import IncreaseMarketIcon from "img/ic_increasemarket_16.svg?react";
import MenuDotsIcon from "img/ic_menu_dots.svg?react";
import PlusCircleIcon from "img/ic_plus_circle.svg?react";
import ShareIcon from "img/ic_share.svg?react";
import gmxIcon from "img/tokens/ic_gmx.svg";

import { GMX_DAO_LINKS } from "./constants";
import { StakeModal, StakeModalTabConfig } from "./StakeModal";

export function GmxAssetCard({ processedData, hasEsGmx }: { processedData: StakingProcessedData; hasEsGmx: boolean }) {
  const { chainId } = useChainId();
  const { active, signer, account } = useWallet();
  const { setPendingTxns } = usePendingTxns();
  const { gmxPrice } = useGmxPrice(chainId, { arbitrum: chainId === ARBITRUM ? signer : undefined }, active);
  const { stakingPowerData, isLoading: isStakingPowerLoading } = useStakingPowerData(chainId, { account });

  const [isGmxStakeModalVisible, setIsGmxStakeModalVisible] = useState(false);
  const [gmxStakeValue, setGmxStakeValue] = useState("");
  const [gmxUnstakeValue, setGmxUnstakeValue] = useState("");

  const [isEsGmxStakeModalVisible, setIsEsGmxStakeModalVisible] = useState(false);
  const [esGmxStakeValue, setEsGmxStakeValue] = useState("");
  const [esGmxUnstakeValue, setEsGmxUnstakeValue] = useState("");

  const [isVestModalVisible, setIsVestModalVisible] = useState(false);
  const [isBuyModalVisible, setIsBuyModalVisible] = useState(false);

  const rewardRouterAddress = getContract(chainId, "RewardRouter");
  const stakedGmxTrackerAddress = getContract(chainId, "StakedGmxTracker");
  const feeGmxTrackerAddress = getContract(chainId, "FeeGmxTracker");
  const gmxAddress = getContract(chainId, "GMX");
  const esGmxAddress = getContract(chainId, "ES_GMX");

  const shouldFetchSbfGmx = chainId !== undefined && feeGmxTrackerAddress !== zeroAddress;
  const { data: sbfGmxBalance } = useSWR<bigint>(
    shouldFetchSbfGmx
      ? [
          `EarnPortfolio:sbfGmxBalance:${account ?? PLACEHOLDER_ACCOUNT}`,
          chainId,
          feeGmxTrackerAddress,
          "balanceOf",
          account ?? PLACEHOLDER_ACCOUNT,
        ]
      : null,
    { fetcher: contractFetcher(undefined, "Token") as any }
  );

  const reservedAmount = useMemo(() => {
    if (sbfGmxBalance === undefined) return 0n;
    const stakedTotal = (processedData?.gmxInStakedGmx ?? 0n) + (processedData?.esGmxInStakedGmx ?? 0n);
    const reserved = stakedTotal - sbfGmxBalance;
    return reserved > 0n ? reserved : 0n;
  }, [processedData?.esGmxInStakedGmx, processedData?.gmxInStakedGmx, sbfGmxBalance]);

  const gmxMaxUnstakeAmount = useMemo(() => {
    const stakedAmount = processedData?.gmxInStakedGmx;
    if (stakedAmount === undefined) return undefined;
    if (sbfGmxBalance === undefined) return stakedAmount;
    return bigMath.min(stakedAmount, sbfGmxBalance);
  }, [sbfGmxBalance, processedData?.gmxInStakedGmx]);

  const esGmxMaxUnstakeAmount = useMemo(() => {
    const stakedAmount = processedData?.esGmxInStakedGmx;
    if (stakedAmount === undefined) return undefined;
    if (sbfGmxBalance === undefined) return stakedAmount;
    return bigMath.min(stakedAmount, sbfGmxBalance);
  }, [sbfGmxBalance, processedData?.esGmxInStakedGmx]);

  const priceRowValue = gmxPrice === undefined ? "..." : formatUsd(gmxPrice);

  const displayProjectedRewardGmx = useMemo((): bigint | undefined => {
    if (!stakingPowerData) {
      return undefined;
    }
    if (stakingPowerData.treasuryGmxBalance === null) {
      return undefined;
    }
    if (stakingPowerData.projectedRewardShare !== null) {
      return stakingPowerData.projectedRewardShare;
    }
    if (stakingPowerData.totalNetworkPower === 0n) {
      return 0n;
    }
    return undefined;
  }, [stakingPowerData]);

  const accumulatedGmxUsd = useMemo(() => {
    if (displayProjectedRewardGmx === undefined || gmxPrice === undefined) {
      return undefined;
    }
    return bigMath.mulDiv(displayProjectedRewardGmx, gmxPrice, expandDecimals(1, 18));
  }, [displayProjectedRewardGmx, gmxPrice]);

  const handleOpenGmxStakeModal = () => {
    sendEarnPortfolioItemClickEvent({ item: "GMX", type: "stake" });
    setIsGmxStakeModalVisible(true);
    setGmxStakeValue("");
  };

  const handleOpenEsGmxStakeModal = () => {
    sendEarnPortfolioItemClickEvent({ item: "esGMX", type: "stake" });
    setIsEsGmxStakeModalVisible(true);
    setEsGmxStakeValue("");
  };

  const handleOpenVestModal = () => {
    sendEarnPortfolioItemClickEvent({ item: "esGMX", type: "vest" });
    setIsVestModalVisible(true);
  };

  const handleOpenBuyModal = () => {
    sendEarnPortfolioItemClickEvent({ item: "GMX", type: "buy" });
    setIsBuyModalVisible(true);
  };

  const gmxStakeConfig: StakeModalTabConfig = useMemo(
    () => ({ maxAmount: processedData?.gmxBalance, value: gmxStakeValue, setValue: setGmxStakeValue }),
    [processedData?.gmxBalance, gmxStakeValue]
  );

  const gmxUnstakeConfig: StakeModalTabConfig = useMemo(
    () => ({ maxAmount: gmxMaxUnstakeAmount, value: gmxUnstakeValue, setValue: setGmxUnstakeValue }),
    [gmxMaxUnstakeAmount, gmxUnstakeValue]
  );

  const esGmxStakeConfig: StakeModalTabConfig = useMemo(
    () => ({ maxAmount: processedData?.esGmxBalance, value: esGmxStakeValue, setValue: setEsGmxStakeValue }),
    [processedData?.esGmxBalance, esGmxStakeValue]
  );

  const esGmxUnstakeConfig: StakeModalTabConfig = useMemo(
    () => ({ maxAmount: esGmxMaxUnstakeAmount, value: esGmxUnstakeValue, setValue: setEsGmxUnstakeValue }),
    [esGmxMaxUnstakeAmount, esGmxUnstakeValue]
  );

  return (
    <div>
      <div className="flex flex-col rounded-8 border-1/2 border-slate-600 bg-slate-950/50 p-16">
        <div className="flex items-start justify-between gap-12">
          <div className="flex items-center gap-12">
            <img src={gmxIcon} alt="GMX" className="size-40" />
            <span className="text-body-large font-medium text-typography-primary">GMX</span>
          </div>
          <GmxAssetCardOptionsDropdown />
        </div>

        <div className="mt-12">
          <span className="text-body-small text-typography-secondary">
            <Tooltip
              handle={<Trans>Accumulated rewards</Trans>}
              content={
                <>
                  <Trans>
                    27% of protocol fees are accumulating in the Treasury and will be distributed proportionally to
                    staking power when GMX reaches $90.
                  </Trans>
                  <br />
                  <br />
                  <span className="text-typography-tertiary">
                    <Trans>
                      All projected rewards and estimated distributions are best-effort estimations only. Actual
                      distribution is subject to DAO governance.
                    </Trans>
                  </span>
                </>
              }
            />
          </span>
          <div className="mt-2">
            {isStakingPowerLoading ? (
              <Skeleton
                baseColor="#B4BBFF1A"
                highlightColor="#B4BBFF1A"
                width={220}
                height={28}
                className="leading-base"
              />
            ) : !stakingPowerData ? (
              <span className="text-h3 font-bold text-typography-secondary">—</span>
            ) : stakingPowerData.treasuryGmxBalance === null ? (
              <span className="text-h3 font-bold text-typography-secondary">
                <Trans>Accumulating</Trans>
              </span>
            ) : displayProjectedRewardGmx !== undefined ? (
              <div className="flex items-baseline gap-8">
                <span className="text-h3 font-bold numbers">
                  {formatAmount(displayProjectedRewardGmx, 18, 0, true)} GMX
                  {accumulatedGmxUsd !== undefined ? (
                    <>
                      {" "}
                      <span className="text-body-medium font-normal text-typography-secondary">
                        ({formatUsd(accumulatedGmxUsd)})
                      </span>
                    </>
                  ) : null}
                </span>
              </div>
            ) : (
              <span className="text-h3 font-bold text-typography-secondary">—</span>
            )}
          </div>
        </div>

        <div className="mt-12 border-t-1/2 border-slate-600" />

        <div className="mt-12 flex flex-col gap-8">
          <SyntheticsInfoRow label={<Trans>Price</Trans>} value={priceRowValue} />
        </div>

        <StakingPowerAlerts stakingPowerData={stakingPowerData} />

        <div className="mt-12 border-t-1/2 border-slate-600" />

        <div className="mt-12 flex flex-col gap-8">
          <SyntheticsInfoRow
            label={<Trans>Staked GMX</Trans>}
            value={
              <AmountWithUsdBalance
                amount={processedData?.gmxInStakedGmx}
                decimals={18}
                usd={processedData?.gmxInStakedGmxUsd}
                symbol="GMX"
              />
            }
          />
          <SyntheticsInfoRow
            label={<Trans>Wallet GMX</Trans>}
            value={
              <AmountWithUsdBalance
                amount={processedData?.gmxBalance}
                decimals={18}
                usd={processedData?.gmxBalanceUsd}
                symbol="GMX"
              />
            }
          />
          <div className="mt-4 grid grid-cols-2 gap-8">
            <Button variant="secondary" onClick={handleOpenGmxStakeModal} className="whitespace-nowrap">
              <DownloadIcon className="size-16 shrink-0" />
              <Trans>Stake GMX</Trans>
            </Button>
            <Button variant="secondary" onClick={handleOpenBuyModal}>
              <PlusCircleIcon className="size-16 shrink-0" />
              <Trans>Buy</Trans>
            </Button>
          </div>
        </div>

        {hasEsGmx && (
          <>
            <div className="mt-12 border-t-1/2 border-slate-600" />
            <div className="mt-12 flex flex-col gap-8">
              <SyntheticsInfoRow
                label={<Trans>Staked esGMX</Trans>}
                value={
                  <AmountWithUsdBalance
                    amount={processedData?.esGmxInStakedGmx}
                    decimals={18}
                    usd={processedData?.esGmxInStakedGmxUsd}
                    symbol="esGMX"
                  />
                }
              />
              <SyntheticsInfoRow
                label={<Trans>Wallet esGMX</Trans>}
                value={
                  <AmountWithUsdBalance
                    amount={processedData?.esGmxBalance}
                    decimals={18}
                    usd={processedData?.esGmxBalanceUsd}
                    symbol="esGMX"
                  />
                }
              />
              <div className="mt-4 grid grid-cols-2 gap-8">
                <Button variant="secondary" onClick={handleOpenEsGmxStakeModal} className="whitespace-nowrap">
                  <DownloadIcon className="size-16 shrink-0" />
                  <Trans>Stake esGMX</Trans>
                </Button>
                <Button variant="secondary" onClick={handleOpenVestModal}>
                  <IncreaseMarketIcon className="size-16 shrink-0" />
                  <Trans>Vest</Trans>
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <StakeModal
        isVisible={isGmxStakeModalVisible}
        setIsVisible={setIsGmxStakeModalVisible}
        chainId={chainId}
        signer={signer}
        tokenSymbol="GMX"
        rewardRouterAddress={rewardRouterAddress}
        stakeTokenAddress={gmxAddress}
        stakeFarmAddress={stakedGmxTrackerAddress}
        reservedAmount={reservedAmount}
        stake={gmxStakeConfig}
        unstake={gmxUnstakeConfig}
        setPendingTxns={setPendingTxns}
        processedData={processedData}
        stakingPowerData={stakingPowerData}
        stakingPowerProjectedRewardsUsd={accumulatedGmxUsd}
      />

      {hasEsGmx && (
        <>
          <StakeModal
            isVisible={isEsGmxStakeModalVisible}
            setIsVisible={setIsEsGmxStakeModalVisible}
            chainId={chainId}
            signer={signer}
            tokenSymbol="esGMX"
            rewardRouterAddress={rewardRouterAddress}
            stakeTokenAddress={esGmxAddress}
            stakeFarmAddress={zeroAddress}
            reservedAmount={reservedAmount}
            stake={esGmxStakeConfig}
            unstake={esGmxUnstakeConfig}
            setPendingTxns={setPendingTxns}
            processedData={processedData}
            stakingPowerData={stakingPowerData}
            stakingPowerProjectedRewardsUsd={accumulatedGmxUsd}
          />
          <VestModal
            isVisible={isVestModalVisible}
            setIsVisible={setIsVestModalVisible}
            processedData={processedData}
            reservedAmount={reservedAmount}
          />
        </>
      )}

      <BuyGmxModal isVisible={isBuyModalVisible} setIsVisible={setIsBuyModalVisible} />
    </div>
  );
}

function StakingPowerAlerts({ stakingPowerData }: { stakingPowerData: StakingPowerResponse | undefined }) {
  if (!stakingPowerData) return null;

  const loyaltyActive = isLoyaltyTrackingActive(stakingPowerData.loyaltyTrackingStart);
  const hasBeenReset = stakingPowerData.powerResetCount > 0;

  if (!loyaltyActive && !hasBeenReset) return null;

  return (
    <div className="mt-12 flex flex-col gap-8">
      {loyaltyActive && stakingPowerData.loyaltyRatio !== null && (
        <SyntheticsInfoRow
          label={
            <Tooltip
              handle={<Trans>Loyalty</Trans>}
              content={
                <Trans>
                  Your current staked balance relative to your historical max. Dropping below 80% resets your
                  accumulated staking power to zero.
                </Trans>
              }
            />
          }
          value={
            <span className={cx("numbers", { "text-red-500": stakingPowerData.loyaltyRatio < 0.85 })}>
              {(stakingPowerData.loyaltyRatio * 100).toFixed(1)}%
            </span>
          }
        />
      )}
      {hasBeenReset && (
        <AlertInfoCard type="warning" hideClose>
          <Trans>
            Your staking power was reset{" "}
            {stakingPowerData.powerResetCount === 1 ? "once" : `${stakingPowerData.powerResetCount} times`} due to
            dropping below the 80% loyalty threshold. Power is now accruing again from your current balance.
          </Trans>
        </AlertInfoCard>
      )}
    </div>
  );
}

function GmxAssetCardOptionsDropdown() {
  const { refs, floatingStyles } = useFloating({
    middleware: [offset(8), flip(), shift()],
    placement: "bottom-end",
    whileElementsMounted: autoUpdate,
  });

  return (
    <Menu>
      <Menu.Button as="div" ref={refs.setReference}>
        <Button variant="secondary" className="w-32 !p-0">
          <MenuDotsIcon className="size-16" />
        </Button>
      </Menu.Button>
      <FloatingPortal>
        <Menu.Items
          as="div"
          ref={refs.setFloating}
          style={floatingStyles}
          className="menu-items max-w-[160px] rounded-8 border-1/2 border-slate-600 bg-slate-900 !pb-0"
        >
          <Menu.Item>
            {() => (
              <a href={GMX_DAO_LINKS.VOTING_POWER} target="_blank" rel="noopener noreferrer" className="menu-item">
                <ShareIcon className="size-16" />
                <p>
                  <Trans>Delegate</Trans>
                </p>
              </a>
            )}
          </Menu.Item>
          <Menu.Item>
            {() => (
              <Link to="/begin_account_transfer" className="menu-item">
                <ArrowRightIcon className="size-16" />
                <p>
                  <Trans>Transfer account</Trans>
                </p>
              </Link>
            )}
          </Menu.Item>
        </Menu.Items>
      </FloatingPortal>
    </Menu>
  );
}
