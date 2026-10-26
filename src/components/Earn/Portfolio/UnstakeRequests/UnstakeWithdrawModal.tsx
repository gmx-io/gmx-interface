import { Trans, t } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";

import { type ChainIcons, getIcons } from "config/icons";
import type { SetPendingTransactions } from "context/PendingTxnsContext/PendingTxnsContext";
import { getIsRewardRouterChanged, getRewardRouterContract, RewardRouter } from "domain/stake/rewardRouter";
import { sendStakingActionMetric } from "domain/stake/sendStakingActionMetric";
import { getWithdrawableUnstakeAmount } from "domain/stake/unstakeRequests";
import { callContract } from "lib/contracts";
import { formatAmount, formatAmountFree, parseValue } from "lib/numbers";
import type { UncheckedJsonRpcSigner } from "lib/rpc/UncheckedJsonRpcSigner";
import { getPageOutdatedError, useHasOutdatedUi } from "lib/useHasOutdatedUi";
import type { ContractsChainId } from "sdk/configs/chains";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { showRewardRouterChangedToast, showStakingErrorToast } from "components/Errors/stakingToasts";
import Modal from "components/Modal/Modal";
import { SwitchToSettlementChainButtons } from "components/SwitchToSettlementChain/SwitchToSettlementChainButtons";
import { SwitchToSettlementChainWarning } from "components/SwitchToSettlementChain/SwitchToSettlementChainWarning";
import Tabs from "components/Tabs/Tabs";

type WithdrawTokenSymbol = "GMX" | "esGMX";

const TOKEN_TABS = [
  { label: "GMX", value: "GMX" as const },
  { label: "esGMX", value: "esGMX" as const },
];

const METHOD_NAME_BY_TOKEN: Record<WithdrawTokenSymbol, string> = {
  GMX: "unstakeGmx",
  esGMX: "unstakeEsGmx",
};

export function UnstakeWithdrawModal({
  isVisible,
  setIsVisible,
  chainId,
  signer,
  rewardRouter,
  mutateRewardRouter,
  executableAmount,
  gmxInStakedGmx,
  esGmxInStakedGmx,
  sbfGmxBalance,
  reservedAmount,
  setPendingTxns,
}: {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  chainId: ContractsChainId;
  signer: UncheckedJsonRpcSigner | undefined;
  rewardRouter: RewardRouter;
  mutateRewardRouter: () => void;
  executableAmount: bigint;
  gmxInStakedGmx: bigint;
  esGmxInStakedGmx: bigint;
  sbfGmxBalance: bigint | undefined;
  reservedAmount: bigint;
  setPendingTxns: SetPendingTransactions;
}) {
  const [tokenSymbol, setTokenSymbol] = useState<WithdrawTokenSymbol>("GMX");
  const [value, setValue] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const hasOutdatedUi = useHasOutdatedUi();
  const icons = getIcons(chainId);

  useEffect(() => {
    setValue("");
    setTokenSymbol("GMX");
  }, [isVisible]);

  const amount = useMemo(() => parseValue(value, 18), [value]);

  const maxAmount = useMemo(() => {
    const stakedTokenAmount = tokenSymbol === "GMX" ? gmxInStakedGmx : esGmxInStakedGmx;

    return getWithdrawableUnstakeAmount({
      executableAmount,
      stakedTokenAmount,
      unreservedAmount: sbfGmxBalance ?? stakedTokenAmount,
    });
  }, [esGmxInStakedGmx, executableAmount, gmxInStakedGmx, sbfGmxBalance, tokenSymbol]);

  const error = useMemo(() => {
    if (amount === undefined || amount === 0n) {
      return <Trans>Enter an amount</Trans>;
    }

    if (amount > maxAmount) {
      return <Trans>Max amount exceeded</Trans>;
    }

    return undefined;
  }, [amount, maxAmount]);

  const handleWithdraw = useCallback(async () => {
    setIsWithdrawing(true);

    try {
      if (await getIsRewardRouterChanged(chainId, rewardRouter)) {
        mutateRewardRouter();
        showRewardRouterChangedToast();
        return;
      }

      await callContract(
        chainId,
        getRewardRouterContract(rewardRouter, signer),
        METHOD_NAME_BY_TOKEN[tokenSymbol],
        [amount],
        {
          sentMsg: t`Withdraw submitted`,
          failMsg: t`Withdraw failed`,
          successMsg: t`Withdrawn`,
          setPendingTxns,
          hideErrorMsg: true,
        }
      );
      sendStakingActionMetric({ action: "unstakeWithdraw", tokenSymbol, chainId });
      setIsVisible(false);
    } catch (error) {
      showStakingErrorToast({ chainId, error, failMsg: t`Withdraw failed` });
      sendStakingActionMetric({ action: "unstakeWithdraw", tokenSymbol, chainId, error });
    } finally {
      setIsWithdrawing(false);
    }
  }, [amount, chainId, mutateRewardRouter, rewardRouter, setIsVisible, setPendingTxns, signer, tokenSymbol]);

  const primaryText = useMemo(() => {
    if (hasOutdatedUi) {
      return getPageOutdatedError();
    }

    if (error) {
      return error;
    }

    return isWithdrawing ? <Trans>Withdrawing...</Trans> : <Trans>Withdraw</Trans>;
  }, [error, hasOutdatedUi, isWithdrawing]);

  return (
    <Modal
      isVisible={isVisible}
      setIsVisible={setIsVisible}
      label={t`Withdraw`}
      withMobileBottomPosition={true}
      contentClassName="w-[420px]"
    >
      <Tabs<WithdrawTokenSymbol>
        className="mb-12"
        type="inline"
        options={TOKEN_TABS}
        selectedValue={tokenSymbol}
        onChange={(newTokenSymbol) => {
          setTokenSymbol(newTokenSymbol);
          setValue("");
        }}
      />
      <div className="flex flex-col gap-12">
        <BuyInputSection
          topLeftLabel={t`Withdraw`}
          topRightLabel={t`Available`}
          topRightValue={formatAmount(maxAmount, 18, 2, true)}
          onClickMax={maxAmount > 0n ? () => setValue(formatAmountFree(maxAmount, 18, 18)) : undefined}
          isMaxSelected={amount === maxAmount}
          inputValue={value}
          onInputValueChange={(e) => setValue(e.target.value)}
          maxDecimals={18}
        >
          <div className="flex items-center gap-4 py-8">
            <img
              className="icon h-24"
              height="24"
              src={icons?.[tokenSymbol.toLowerCase() as keyof ChainIcons]}
              alt={tokenSymbol}
            />
            {tokenSymbol}
          </div>
        </BuyInputSection>

        {reservedAmount > 0n && (
          <AlertInfoCard type="info">
            <Trans>{formatAmount(reservedAmount, 18, 2, true)} tokens reserved for vesting</Trans>
          </AlertInfoCard>
        )}

        <SwitchToSettlementChainWarning topic="staking" />
        <SwitchToSettlementChainButtons>
          <Button
            variant="primary-action"
            className="w-full"
            onClick={handleWithdraw}
            disabled={Boolean(error) || isWithdrawing || hasOutdatedUi}
          >
            {primaryText}
          </Button>
        </SwitchToSettlementChainButtons>
      </div>
    </Modal>
  );
}
