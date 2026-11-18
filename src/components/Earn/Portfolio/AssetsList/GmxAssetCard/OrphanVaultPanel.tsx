import { Trans, t } from "@lingui/macro";
import { useState } from "react";

import { getContract } from "config/contracts";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { getRewardRouterContract } from "domain/stake/rewardRouter";
import { sendStakingActionMetric } from "domain/stake/sendStakingActionMetric";
import { getUnstakeDelayDays } from "domain/stake/unstakeRequests";
import type { UnstakeRequestsData } from "domain/stake/useUnstakeRequests";
import {
  getOrphanClaimableGmx,
  getOrphanDepositState,
  getOrphanWalletShortfallActions,
  RATIO_VESTER_PAIR_RATIO_DECIMALS,
  type OrphanDepositError,
  type OrphanVaultData,
} from "domain/vesting/vestingVaults";
import { useChainId } from "lib/chains";
import { callContract } from "lib/contracts";
import { formatDate, SECONDS_IN_DAY } from "lib/dates";
import { formatAmountFree, parseValue } from "lib/numbers";
import { getPageOutdatedError, useHasOutdatedUi } from "lib/useHasOutdatedUi";
import useWallet from "lib/wallets/useWallet";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { ColorfulButtonLink } from "components/ColorfulBanner/ColorfulBanner";
import { showStakingErrorToast } from "components/Errors/stakingToasts";
import { ProgressRow } from "components/ProgressRow/ProgressRow";
import { SwitchToSettlementChainButtons } from "components/SwitchToSettlementChain/SwitchToSettlementChainButtons";
import { SwitchToSettlementChainWarning } from "components/SwitchToSettlementChain/SwitchToSettlementChainWarning";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import StandardTooltip from "components/Tooltip/StandardTooltip";

import EsGmxIcon from "img/tokens/ic_esgmx.svg?react";

import { formatVaultAmount, formatVaultAmountRoundedUp, VaultAmountRatio } from "./VaultAmountRatio";

type OrphanVaultAction = "deposit" | "claim" | "withdraw" | "claimEsGmx";

type OrphanVaultActionTx = {
  method: string;
  params: unknown[];
  sentMsg: string;
  failMsg: string;
  successMsg: string;
  metric: Pick<Parameters<typeof sendStakingActionMetric>[0], "action" | "tokenSymbol" | "vault">;
};

export function OrphanVaultPanel({
  data,
  walletEsGmxBalance,
  stakedAmount,
  stakedEsGmxAmount,
  unclaimedEsGmxAmount,
  unstakeRequestsData,
  onTxSent,
  onTxMined,
  onStakeGmx,
  onUnstakeEsGmx,
}: {
  data: OrphanVaultData;
  walletEsGmxBalance: bigint | undefined;
  stakedAmount: bigint | undefined;
  stakedEsGmxAmount: bigint | undefined;
  unclaimedEsGmxAmount: bigint | undefined;
  unstakeRequestsData: UnstakeRequestsData | undefined;
  onTxSent: () => void;
  onTxMined: () => void;
  onStakeGmx: () => void;
  onUnstakeEsGmx: () => void;
}) {
  const { chainId } = useChainId();
  const { signer } = useWallet();
  const { setPendingTxns } = usePendingTxns();
  const hasOutdatedUi = useHasOutdatedUi();

  const [depositValue, setDepositValue] = useState("");
  const [pendingAction, setPendingAction] = useState<OrphanVaultAction>();

  const depositAmount = parseValue(depositValue, 18);
  const now = BigInt(Math.floor(Date.now() / 1000));
  const {
    maxDepositAmount,
    maxByPairAmount,
    additionalPairAmount,
    stakeShortfallAmount,
    walletShortfallAmount,
    error,
  } = getOrphanDepositState({
    data,
    walletEsGmxBalance: walletEsGmxBalance ?? 0n,
    depositAmount,
    now,
  });
  const shortfallActions = getOrphanWalletShortfallActions({
    data,
    walletEsGmxBalance: walletEsGmxBalance ?? 0n,
    maxByPairAmount,
    walletShortfallAmount,
    stakedEsGmxAmount: stakedEsGmxAmount ?? 0n,
    pendingUnstakeAmount: unstakeRequestsData?.pendingAmount ?? 0n,
  });

  const pairRatio = formatAmountFree(data.pairRatioFactor, RATIO_VESTER_PAIR_RATIO_DECIMALS);
  const vestingDays = Math.round(Number(data.vestingDuration) / SECONDS_IN_DAY);
  const unvestedAmount = data.depositedAmount - data.convertedAmount;
  const hasDepositPreview = depositAmount !== undefined && depositAmount > 0n;
  const vestingEndTime = hasDepositPreview ? now + data.vestingDuration : data.vestingEndTime;

  const isActionDisabled = hasOutdatedUi || !signer || pendingAction !== undefined;
  const canDeposit = error === undefined;
  const canClaim = getOrphanClaimableGmx(data) > 0n;
  const canWithdraw = data.depositedAmount > 0n || data.reservedAmount > 0n;
  const hasWalletShortfallHint = walletShortfallAmount > 0n && error !== "closed" && error !== "frozen";
  const hasUnstakeAction = unstakeRequestsData !== undefined && shortfallActions.unstakeAmount > 0n;
  const hasUnstakeTradeOffNote =
    !hasUnstakeAction &&
    stakedEsGmxAmount !== undefined &&
    stakedEsGmxAmount > 0n &&
    (!shortfallActions.isWalletLimited || unstakeRequestsData !== undefined);
  const hasClaimEsGmxAction =
    shortfallActions.isWalletLimited && unclaimedEsGmxAmount !== undefined && unclaimedEsGmxAmount > 0n;
  const unstakeDelayDays = unstakeRequestsData ? getUnstakeDelayDays(unstakeRequestsData.unstakeDelay) : undefined;
  const walletShortfall = formatVaultAmount(walletShortfallAmount);
  const suggestedUnstake = formatVaultAmount(shortfallActions.unstakeAmount);
  const unclaimedEsGmx = formatVaultAmount(unclaimedEsGmxAmount);

  const handleAction = (action: OrphanVaultAction) => {
    if (!signer) {
      return;
    }

    const actionTx = getActionTx({
      action,
      orphanVesterAddress: getContract(chainId, "OrphanRatioVester"),
      depositAmount,
    });
    const metric = { ...actionTx.metric, chainId };

    setPendingAction(action);
    callContract(chainId, getRewardRouterContract(chainId, signer), actionTx.method, actionTx.params, {
      sentMsg: actionTx.sentMsg,
      failMsg: actionTx.failMsg,
      successMsg: actionTx.successMsg,
      setPendingTxns,
      hideErrorMsg: true,
    })
      .then((tx) => {
        sendStakingActionMetric(metric);
        onTxSent();
        tx?.wait().then(onTxMined, onTxMined);
      })
      .catch((txError) => {
        sendStakingActionMetric({ ...metric, error: txError });
        showStakingErrorToast({
          chainId,
          error: txError,
          failMsg: actionTx.failMsg,
          action: action === "claimEsGmx" ? "default" : "legacyVault",
        });
      })
      .finally(() => {
        setPendingAction(undefined);
      });
  };

  const claimButtonText =
    pendingAction === "claim"
      ? t`Claiming...`
      : data.isClaimPaused
        ? t`Claims paused`
        : data.isFrozen
          ? t`Account restricted`
          : t`Claim GMX`;

  const depositButtonText = hasOutdatedUi
    ? getPageOutdatedError()
    : pendingAction === "deposit"
      ? t`Depositing...`
      : error
        ? getDepositErrorText(error)
        : t`Deposit`;

  return (
    <div className="flex flex-col gap-20 px-20 pb-20" data-qa="vesting-orphan-vault">
      <p className="text-body-small leading-[1.4] text-typography-secondary">
        <Trans>
          Vest the esGMX you held at the snapshot. Each esGMX reserves {pairRatio} staked GMX or esGMX and vests over{" "}
          {vestingDays} days.
        </Trans>
      </p>

      <div className="flex flex-col gap-12">
        <BuyInputSection
          topLeftLabel={t`Deposit`}
          topRightLabel={t`Max`}
          topRightValue={formatVaultAmount(maxDepositAmount)}
          onClickMax={
            data.isOpen && maxDepositAmount > 0n
              ? () => setDepositValue(formatAmountFree(maxDepositAmount, 18, 18))
              : undefined
          }
          isMaxSelected={depositAmount === maxDepositAmount}
          inputValue={depositValue}
          onInputValueChange={(e) => setDepositValue(e.target.value)}
          isDisabled={!data.isOpen}
          maxDecimals={18}
        >
          <div className="flex items-center gap-4">
            <EsGmxIcon />
            {t`esGMX`}
          </div>
        </BuyInputSection>

        {hasWalletShortfallHint && (
          <AlertInfoCard type="info" hideClose>
            <div className="flex flex-col gap-8">
              <Trans>{walletShortfall} esGMX of your eligible amount left isn't in your wallet.</Trans>
              {hasUnstakeAction ? (
                <div>
                  <Trans>
                    Unstake up to {suggestedUnstake} esGMX to vest it. Unstaking more would lower the staked tokens that
                    back vesting.
                  </Trans>{" "}
                  {unstakeDelayDays !== undefined && <Trans>Unstaking takes {unstakeDelayDays} days.</Trans>}
                  <ColorfulButtonLink onClick={onUnstakeEsGmx}>
                    <Trans>Request unstake</Trans>
                  </ColorfulButtonLink>
                </div>
              ) : (
                hasUnstakeTradeOffNote && (
                  <div>
                    <Trans>
                      Unstaking esGMX would also lower the staked tokens that back vesting, so it won't raise how much
                      you can vest. Stake more GMX instead.
                    </Trans>
                    <ColorfulButtonLink onClick={onStakeGmx}>
                      <Trans>Stake GMX</Trans>
                    </ColorfulButtonLink>
                  </div>
                )
              )}
              {hasClaimEsGmxAction && (
                <div>
                  <Trans>{unclaimedEsGmx} esGMX is unclaimed. Claim it without staking to vest it.</Trans>
                  <ColorfulButtonLink
                    onClick={isActionDisabled ? undefined : () => handleAction("claimEsGmx")}
                    disabled={isActionDisabled}
                  >
                    {pendingAction === "claimEsGmx" ? <Trans>Claiming...</Trans> : <Trans>Claim esGMX</Trans>}
                  </ColorfulButtonLink>
                </div>
              )}
            </div>
          </AlertInfoCard>
        )}

        {error === "insufficientStaked" && (
          <AlertInfoCard type="warning" hideClose>
            <div>
              <Trans>
                Not enough staked tokens. Stake {formatVaultAmountRoundedUp(stakeShortfallAmount)} more GMX to deposit
                this amount, or deposit less.
              </Trans>
              <ColorfulButtonLink color="yellow" onClick={onStakeGmx}>
                <Trans>Stake GMX</Trans>
              </ColorfulButtonLink>
            </div>
          </AlertInfoCard>
        )}

        <SwitchToSettlementChainWarning topic="vesting" />
        <SwitchToSettlementChainButtons>
          <Button
            variant="primary-action"
            className="w-full"
            onClick={() => handleAction("deposit")}
            disabled={isActionDisabled || !canDeposit}
          >
            {depositButtonText}
          </Button>
        </SwitchToSettlementChainButtons>
      </div>

      <div className="flex flex-col gap-12">
        <SyntheticsInfoRow
          label={
            <StandardTooltip
              handle={<Trans>Eligible amount</Trans>}
              content={t`esGMX in your wallet, staked and unclaimed at the snapshot. esGMX already in the GMX, GLP and Affiliate vaults doesn't count.`}
            />
          }
          value={<span className="numbers">{formatVaultAmount(data.eligibleAmount)} esGMX</span>}
        />
        <SyntheticsInfoRow
          label={<Trans>Vault capacity</Trans>}
          value={<VaultAmountRatio current={data.usedAmount} total={data.eligibleAmount} />}
        />
        <div className="border-t-1/2 border-slate-600" />
        <SyntheticsInfoRow
          label={<Trans>Staked tokens reserved for vesting</Trans>}
          value={
            <VaultAmountRatio
              current={hasDepositPreview ? data.reservedAmount + additionalPairAmount : data.reservedAmount}
              total={stakedAmount}
            />
          }
        />
      </div>

      <div className="flex flex-col gap-16 rounded-8 border-1/2 border-slate-600 bg-slate-950/50 p-16">
        <ProgressRow
          label={<Trans>Vesting status</Trans>}
          value={<VaultAmountRatio current={data.convertedAmount} total={data.depositedAmount} />}
          currentValue={data.convertedAmount}
          totalValue={data.depositedAmount}
        />
        {vestingEndTime !== undefined && (
          <SyntheticsInfoRow label={<Trans>Fully vested on</Trans>} value={formatDate(Number(vestingEndTime))} />
        )}
        <SyntheticsInfoRow
          label={<Trans>Claimable</Trans>}
          value={<span className="numbers">{formatVaultAmount(data.claimableAmount)} GMX</span>}
        />

        {canWithdraw && (
          <p className="text-body-small leading-[1.4] text-typography-secondary">
            <Trans>
              Stopping vesting returns{" "}
              <span className="font-medium text-typography-primary numbers">
                {formatVaultAmount(unvestedAmount)} esGMX
              </span>{" "}
              and{" "}
              <span className="font-medium text-typography-primary numbers">
                {formatVaultAmount(data.reservedAmount)}
              </span>{" "}
              reserved staked tokens to your wallet. Vested GMX stays claimable. Depositing again restarts the{" "}
              {vestingDays}-day vesting.
            </Trans>
          </p>
        )}

        <div className="grid grid-cols-2 gap-12 max-smallMobile:grid-cols-1">
          <Button
            variant="primary"
            size="medium"
            className="w-full"
            onClick={() => handleAction("claim")}
            disabled={isActionDisabled || !canClaim}
          >
            {claimButtonText}
          </Button>
          <Button
            variant="secondary"
            size="medium"
            className="w-full"
            onClick={() => handleAction("withdraw")}
            disabled={isActionDisabled || !canWithdraw}
          >
            {pendingAction === "withdraw" ? <Trans>Confirming...</Trans> : <Trans>Stop vesting</Trans>}
          </Button>
        </div>
      </div>
    </div>
  );
}

function getActionTx({
  action,
  orphanVesterAddress,
  depositAmount,
}: {
  action: OrphanVaultAction;
  orphanVesterAddress: string;
  depositAmount: bigint | undefined;
}): OrphanVaultActionTx {
  switch (action) {
    case "deposit":
      return {
        method: "vesterDeposit",
        params: [orphanVesterAddress, depositAmount],
        sentMsg: t`Deposit submitted`,
        failMsg: t`Deposit failed`,
        successMsg: t`Deposited`,
        metric: { action: "vestDeposit", tokenSymbol: "esGMX", vault: "orphan" },
      };
    case "claim":
      return {
        method: "vesterClaim",
        params: [orphanVesterAddress],
        sentMsg: t`Claim submitted`,
        failMsg: t`Claim failed`,
        successMsg: t`Claimed`,
        metric: { action: "vestClaim", tokenSymbol: "GMX", vault: "orphan" },
      };
    case "withdraw":
      return {
        method: "vesterWithdraw",
        params: [orphanVesterAddress],
        sentMsg: t`Stop vesting submitted`,
        failMsg: t`Stop vesting failed`,
        successMsg: t`Vesting stopped`,
        metric: { action: "vestWithdraw", tokenSymbol: "esGMX", vault: "orphan" },
      };
    case "claimEsGmx": {
      // shouldStakeEsGmx defaults to true in the Claim modal, which would leave nothing to vest
      const shouldClaimGmx = false;
      const shouldStakeGmx = false;
      const shouldClaimEsGmx = true;
      const shouldStakeEsGmx = false;
      const shouldStakeMultiplierPoints = true;
      const shouldClaimWeth = false;
      const shouldConvertWethToEth = false;

      return {
        method: "handleRewards",
        params: [
          shouldClaimGmx,
          shouldStakeGmx,
          shouldClaimEsGmx,
          shouldStakeEsGmx,
          shouldStakeMultiplierPoints,
          shouldClaimWeth,
          shouldConvertWethToEth,
        ],
        sentMsg: t`Claim submitted`,
        failMsg: t`Claim failed`,
        successMsg: t`Claimed`,
        metric: { action: "claim", tokenSymbol: "esGMX", vault: undefined },
      };
    }
  }
}

function getDepositErrorText(error: OrphanDepositError) {
  switch (error) {
    case "notOpen":
      return t`Opening soon`;
    case "closed":
      return t`Vault closed`;
    case "paused":
      return t`Deposits paused`;
    case "frozen":
      return t`Account restricted`;
    case "enterAmount":
      return t`Enter an amount`;
    case "maxExceeded":
      return t`Max amount exceeded`;
    case "insufficientStaked":
      return t`Insufficient staked tokens`;
  }
}
