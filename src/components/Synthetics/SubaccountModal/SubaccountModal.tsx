import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Modal from "components/Modal/Modal";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { getContract } from "config/contracts";
import { getNativeToken, getWrappedToken } from "config/tokens";
import {
  useIsSubaccountActive,
  useSubaccount,
  useSubaccountActionCounts,
  useSubaccountAddress,
  useSubaccountDefaultExecutionFee,
  useSubaccountGenerateSubaccount,
  useSubaccountModalOpen,
  useSubaccountNotificationState,
  useSubaccountPendingTx,
  useSubaccountState,
} from "context/SubaccountContext/SubaccountContext";
import { useBigNumberInput } from "domain/synthetics/common/useBigNumberInput";
import { useTransactionPending } from "domain/synthetics/common/useTransactionReceipt";
import { useGasPrice } from "domain/synthetics/fees";
import { getCurrentMaxActionsCount } from "domain/synthetics/subaccount/getCurrentActionsCount";
import { initSubaccount } from "domain/synthetics/subaccount/initSubaccount";
import { removeSubaccount } from "domain/synthetics/subaccount/removeSubaccount";
import { withdrawFromSubaccount } from "domain/synthetics/subaccount/withdrawFromSubaccount";
import {
  getNeedTokenApprove,
  useTokenBalances,
  useTokensAllowanceData,
  useTokensDataRequest,
} from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import copyIcon from "img/ic_copy_20.svg";
import externalLinkIcon from "img/ic_new_link_20.svg";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { getAccountUrl } from "lib/legacy";
import { formatTokenAmount } from "lib/numbers";
import { getByKey } from "lib/objects";
import { shortenAddressOrEns } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";
import { ChangeEvent, ReactNode, memo, useCallback, useEffect, useMemo, useState } from "react";
import { useCopyToClipboard, usePrevious } from "react-use";
import { SubaccountNotification } from "../StatusNotification/SubaccountNotification";
import "./SubaccountModal.scss";
import { SubaccountStatus } from "./SubaccountStatus";
import { getApproxSubaccountActionsCountByBalance, getButtonState, getDefaultValues } from "./utils";

export type FormState = "empty" | "inactive" | "activated";

export function SubaccountModal({ setPendingTxns }: { setPendingTxns: (txns: any[]) => void }) {
  const [isVisible, setIsVisible] = useSubaccountModalOpen();

  return (
    <Modal label={t`One-Click Trading`} isVisible={isVisible} setIsVisible={setIsVisible}>
      <div className="SubaccountModal-content">
        <MainView setPendingTxns={setPendingTxns} />
      </div>
    </Modal>
  );
}

const MainView = memo(({ setPendingTxns }: { setPendingTxns: (txns: any) => void }) => {
  const oneClickTradingState = useSubaccountState();
  const { chainId } = useChainId();
  const { signer, account } = useWallet();
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [isSubaccountUpdating, setIsSubaccountUpdating] = useState(false);
  const { tokensData } = useTokensDataRequest(chainId);
  const subaccountAddress = useSubaccountAddress();
  const mainBalances = useTokenBalances(chainId, account);
  const subBalances = useTokenBalances(chainId, subaccountAddress ?? undefined);
  const wrappedToken = getWrappedToken(chainId);
  const nativeToken = getNativeToken(chainId);
  const mainAccNativeTokenBalance = getByKey(mainBalances.balancesData, nativeToken.address);
  const mainAccWrappedTokenBalance = getByKey(mainBalances.balancesData, wrappedToken.address);
  const subAccNativeTokenBalance = getByKey(subBalances.balancesData, nativeToken.address);
  const subaccountExplorerUrl = useMemo(() => getAccountUrl(chainId, subaccountAddress), [chainId, subaccountAddress]);

  const defaults = useMemo(() => {
    if (!tokensData) return null;
    const data = tokensData[nativeToken.address];
    if (!data) return null;

    return getDefaultValues(data);
  }, [nativeToken.address, tokensData]);

  const baseFeePerAction = useSubaccountDefaultExecutionFee();

  const approxNumberOfOperationsByBalance = useMemo(() => {
    const currentAutoTopUpAmount = oneClickTradingState.contractData?.currentAutoTopUpAmount;
    return subAccNativeTokenBalance &&
      baseFeePerAction &&
      currentAutoTopUpAmount &&
      mainAccWrappedTokenBalance &&
      mainAccNativeTokenBalance
      ? getApproxSubaccountActionsCountByBalance(
          mainAccWrappedTokenBalance,
          subAccNativeTokenBalance,
          baseFeePerAction,
          currentAutoTopUpAmount
        )
      : null;
  }, [
    baseFeePerAction,
    mainAccNativeTokenBalance,
    mainAccWrappedTokenBalance,
    oneClickTradingState.contractData?.currentAutoTopUpAmount,
    subAccNativeTokenBalance,
  ]);

  const renderSubaccountBalanceTooltipContent = useCallback(() => {
    let value: ReactNode = "";

    value = approxNumberOfOperationsByBalance?.toString() ?? t`Unknown`;
    return (
      <div>
        <Trans>
          Subaccount {nativeToken.symbol} Balance is used to pay for the Network Fees. Use the "Top-up" field if you
          need to transfer {nativeToken.symbol} to your Subaccount.
        </Trans>
        <br />
        <br />
        <StatsTooltipRow label={t`Expected Available Actions`} showDollar={false} value={value} />
        <br />
        <Trans>Expected Actions are based on the current Network Fee.</Trans>
      </div>
    );
  }, [approxNumberOfOperationsByBalance, nativeToken.symbol]);

  const renderMainAccountBalanceTooltipContent = useCallback(() => {
    return (
      <div>
        <Trans>
          Main Account {wrappedToken.symbol} Balance is used to top up Subaccount Balance on each Action up to the set
          Max auto top-up amount. Use the "Сonvert {nativeToken.symbol} to {wrappedToken.symbol}" field if the Main
          Account {wrappedToken.symbol} Balance is low.
        </Trans>
        <br />
        <br />
        <StatsTooltipRow
          label={wrappedToken.symbol}
          value={formatTokenAmount(mainAccWrappedTokenBalance, wrappedToken.decimals, wrappedToken.symbol, {
            displayDecimals: 4,
          })}
          showDollar={false}
        />
        <StatsTooltipRow
          label={nativeToken.symbol}
          value={formatTokenAmount(mainAccNativeTokenBalance, nativeToken.decimals, nativeToken.symbol, {
            displayDecimals: 4,
          })}
          showDollar={false}
        />
      </div>
    );
  }, [
    mainAccNativeTokenBalance,
    mainAccWrappedTokenBalance,
    nativeToken.decimals,
    nativeToken.symbol,
    wrappedToken.decimals,
    wrappedToken.symbol,
  ]);

  const [, copyToClipboard] = useCopyToClipboard();
  const [formState, setFormState] = useState<FormState>("empty");
  const [nextFormState, setNextFormState] = useState<FormState>("empty");
  const {
    displayValue: topUpString,
    setDisplayValue: setTopUpString,
    setValue: setTopUp,
    value: topUp,
  } = useBigNumberInput(null, nativeToken.decimals, 4);
  const {
    displayValue: maxAutoTopUpAmountString,
    setDisplayValue: setMaxAutoTopUpAmountString,
    setValue: setMaxAutoTopUpAmount,
    value: maxAutoTopUpAmount,
  } = useBigNumberInput(null, nativeToken.decimals, 4);
  const {
    displayValue: wntForAutoTopUpsString,
    setDisplayValue: setWntForAutoTopUpsString,
    setValue: setWntForAutoTopUps,
    value: wntForAutoTopUps,
  } = useBigNumberInput(null, wrappedToken.decimals, 4);
  const {
    displayValue: maxAllowedActionsString,
    setDisplayValue: setMaxAllowedActionsString,
    setValue: setMaxAllowedActions,
    value: maxAllowedActions,
  } = useBigNumberInput(null, 0, 0);

  const isSubaccountActive = useIsSubaccountActive();

  const [isVisible] = useSubaccountModalOpen();

  const [activeTx, setActiveTx] = useSubaccountPendingTx();
  const isTxPending = useTransactionPending(activeTx);
  const prevIsTxPending = usePrevious(isTxPending);

  const { current: actionsCount, remaining: remainingActionsCount } = useSubaccountActionCounts();

  useEffect(() => {
    if (nextFormState === formState) return;
    if (isSubaccountUpdating) return;

    if (!isSubaccountActive && defaults && nextFormState === "inactive") {
      setTopUp(defaults.topUp);
      setMaxAutoTopUpAmount(defaults.maxAutoTopUpAmount);
      setWntForAutoTopUps(defaults.wntForAutoTopUps);
      setMaxAllowedActions(defaults.maxAllowedActions);
      setFormState("inactive");
    } else if (isSubaccountActive && nextFormState === "activated") {
      setTopUp(null);
      setWntForAutoTopUps(null);
      setMaxAutoTopUpAmount(oneClickTradingState.contractData?.currentAutoTopUpAmount ?? null);
      setMaxAllowedActions(remainingActionsCount);
      setFormState("activated");
    } else if (nextFormState === "empty") {
      setTopUp(null);
      setMaxAutoTopUpAmount(null);
      setWntForAutoTopUps(null);
      setMaxAllowedActions(null);
      setFormState("empty");
    }
  }, [
    isSubaccountUpdating,
    defaults,
    formState,
    isSubaccountActive,
    nextFormState,
    oneClickTradingState.contractData?.currentAutoTopUpAmount,
    remainingActionsCount,
    setMaxAllowedActions,
    setMaxAutoTopUpAmount,
    setTopUp,
    setWntForAutoTopUps,
  ]);

  useEffect(() => {
    if (!isTxPending) {
      setIsSubaccountUpdating(false);
    }
  }, [isTxPending]);

  const [notificationState, setNotificationState] = useSubaccountNotificationState();

  const isSubaccountGenerated = !subaccountAddress || !actionsCount;

  const showToast = useCallback(() => {
    const toastId = Date.now();

    helperToast.success(
      <SubaccountNotification
        toastId={toastId}
        subaccountWasAlreadyGenerated={!isSubaccountGenerated}
        subaccountWasAlreadyActivated={isSubaccountActive}
      />,
      {
        autoClose: false,
        toastId,
      }
    );
  }, [isSubaccountActive, isSubaccountGenerated]);

  const handleDeactivateClick = useCallback(async () => {
    if (!subaccountAddress) throw new Error("Subaccount address is not set");
    if (!signer) throw new Error("Signer is not set");

    showToast();

    setNotificationState("deactivating");
    setIsSubaccountUpdating(true);
    if (isSubaccountActive) {
      try {
        const res = await removeSubaccount(chainId, signer, subaccountAddress);

        setActiveTx(res.hash);
      } catch (err) {
        setNotificationState("deactivationFailed");
        setIsSubaccountUpdating(false);
        throw err;
      }
    } else {
      setNotificationState("deactivated");
    }

    oneClickTradingState.clearSubaccount();
    setIsSubaccountUpdating(false);
    setNextFormState("inactive");
  }, [
    chainId,
    isSubaccountActive,
    oneClickTradingState,
    setActiveTx,
    setNotificationState,
    showToast,
    signer,
    subaccountAddress,
  ]);

  useEffect(() => {
    if (isVisible) {
      setNextFormState(isSubaccountActive ? "activated" : "inactive");
    }
  }, [isVisible, isSubaccountActive, setNextFormState]);

  useEffect(() => {
    if (isTxPending === false && prevIsTxPending === true) {
      setActiveTx(null);
      setNextFormState("activated");
    }
  }, [isTxPending, prevIsTxPending, setActiveTx, setNextFormState]);

  useEffect(() => {
    if (isTxPending === false && prevIsTxPending === true && notificationState === "activating") {
      setNotificationState("activated");
    }

    if (isTxPending === false && prevIsTxPending === true && notificationState === "deactivating") {
      setNotificationState("deactivated");
    }
  }, [isTxPending, notificationState, prevIsTxPending, setNotificationState]);

  const generateSubaccount = useSubaccountGenerateSubaccount();

  const handleButtonClick = useCallback(async () => {
    async function activateOrUpdate() {
      if (!account) throw new Error("Account is not defined");
      if (!signer) throw new Error("Signer is not defined");

      let address = subaccountAddress;
      let count = actionsCount;

      setNotificationState(isSubaccountGenerated ? "generating" : "activating");
      showToast();

      if (isSubaccountGenerated) {
        try {
          address = await generateSubaccount();

          // user rejects
          if (!address) {
            setNotificationState("generationFailed");
            return;
          }
        } catch (error) {
          setNotificationState("generationFailed");
          throw error;
        }

        count =
          (await getCurrentMaxActionsCount({
            accountAddress: account!,
            chainId,
            signer,
            subaccountAddress: address,
          })) ?? BigNumber.from(0);
      }

      if (!address) {
        setNotificationState("activationFailed");
        throw new Error("address is not defined");
      }

      if (!count) {
        setNotificationState("activationFailed");
        throw new Error("Action counts are not defined");
      }

      setNotificationState("activating");

      try {
        const tx = await initSubaccount(
          chainId,
          signer,
          address,
          account,
          isSubaccountActive ?? false,
          count,
          setPendingTxns,
          {
            topUp: topUp,
            maxAutoTopUpAmount,
            wntForAutoTopUps,
            maxAllowedActions,
          }
        );
        setActiveTx(tx.hash);
      } catch (err) {
        setNotificationState("activationFailed");
        throw err;
      }
    }

    setIsSubaccountUpdating(true);
    try {
      await activateOrUpdate();
    } catch (error) {
      // if success - setIsSubaccountUpdating will be set to false in useEffect
      setIsSubaccountUpdating(false);
      throw error;
    }
  }, [
    account,
    signer,
    subaccountAddress,
    actionsCount,
    setNotificationState,
    isSubaccountGenerated,
    showToast,
    chainId,
    generateSubaccount,
    isSubaccountActive,
    setPendingTxns,
    topUp,
    maxAutoTopUpAmount,
    wntForAutoTopUps,
    maxAllowedActions,
    setActiveTx,
  ]);

  const { tokensAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: getContract(chainId, "SyntheticsRouter"),
    tokenAddresses: [wrappedToken.address],
    skip: !isVisible,
  });

  const needPayTokenApproval = useMemo(
    () =>
      tokensAllowanceData && baseFeePerAction
        ? getNeedTokenApprove(tokensAllowanceData, wrappedToken.address, baseFeePerAction)
        : false,
    [baseFeePerAction, tokensAllowanceData, wrappedToken.address]
  );

  const { text: buttonText, disabled } = useMemo(
    () =>
      getButtonState({
        mainAccEthBalance: mainAccNativeTokenBalance,
        subaccountAddress,
        topUp,
        maxAutoTopUpAmount,
        wntForAutoTopUps,
        maxAllowedActions,
        withdrawalLoading,
        formState,
        notificationState,

        needPayTokenApproval,
        isTxPending,

        isSubaccountActive,
        accountUpdateLoading: isSubaccountUpdating,

        nativeTokenSymbol: nativeToken.symbol,
        wrappedTokenSymbol: wrappedToken.symbol,
      }),
    [
      mainAccNativeTokenBalance,
      subaccountAddress,
      topUp,
      maxAutoTopUpAmount,
      wntForAutoTopUps,
      formState,
      maxAllowedActions,
      withdrawalLoading,
      notificationState,
      needPayTokenApproval,
      isTxPending,
      isSubaccountActive,
      isSubaccountUpdating,
      nativeToken.symbol,
      wrappedToken.symbol,
    ]
  );

  const { gasPrice } = useGasPrice(chainId);

  const subaccount = useSubaccount(null, 1);

  const handleWithdrawClick = useCallback(async () => {
    if (!subaccount) throw new Error("privateKey is not defined");
    if (!account) throw new Error("account is not defined");
    if (!signer) throw new Error("signer is not defined");
    if (!subAccNativeTokenBalance) throw new Error("subEthBalance is not defined");
    if (!gasPrice) throw new Error("gasPrice is not defined");

    setWithdrawalLoading(true);

    try {
      await withdrawFromSubaccount({
        mainAccountAddress: account,
        subaccount,
      });
    } finally {
      setWithdrawalLoading(false);
    }
  }, [account, gasPrice, signer, subAccNativeTokenBalance, subaccount]);

  useEffect(() => {
    setNotificationState("none");
  }, [chainId, setNotificationState]);

  let tokenApproval: ReactNode = null;

  if (needPayTokenApproval && account) {
    tokenApproval = (
      <div className="SubaccountModal-approve-token-btn">
        <ApproveTokenButton
          spenderAddress={getContract(chainId, "SyntheticsRouter")}
          tokenAddress={wrappedToken.address}
          tokenSymbol={wrappedToken.symbol}
        />
      </div>
    );
  }

  const handleCopyClick = useCallback(() => {
    if (!subaccountAddress) return;

    copyToClipboard(subaccountAddress);
    helperToast.success(t`Address copied to your clipboard`);
  }, [copyToClipboard, subaccountAddress]);

  const subAccNativeTokenBalanceFormatted = useMemo(
    () =>
      formatTokenAmount(subAccNativeTokenBalance, nativeToken.decimals, nativeToken.symbol, {
        displayDecimals: 4,
      }),
    [nativeToken.decimals, nativeToken.symbol, subAccNativeTokenBalance]
  );

  return (
    <div className="SubaccountModal-content">
      {<SubaccountStatus hasBorder={Boolean(subaccountAddress)} />}
      {subaccountAddress && (
        <>
          <div className="SubaccountModal-subaccount">
            <div className="SubaccountModal-subaccount-details">
              <span className="SubaccountModal-subaccount-label">
                <Trans>Subaccount:</Trans>
              </span>
              <span>{shortenAddressOrEns(subaccountAddress ?? "", 13)}</span>
            </div>
            <div className="relative">
              <ButtonIcon onClick={handleCopyClick} icon={copyIcon} title="Copy" />
              <ExternalLink href={subaccountExplorerUrl}>
                <ButtonIcon icon={externalLinkIcon} title="Open in Explorer" />
              </ExternalLink>
            </div>
          </div>
          <div className="SubaccountModal-buttons">
            <button disabled={disabled} onClick={handleWithdrawClick} className="SubaccountModal-mini-button">
              {withdrawalLoading ? <Trans>Withdrawing...</Trans> : <Trans>Withdraw</Trans>}
            </button>
            <button disabled={disabled} onClick={handleDeactivateClick} className="SubaccountModal-mini-button warning">
              {notificationState === "deactivating" ? <Trans>Deactivating...</Trans> : <Trans>Deactivate</Trans>}
            </button>
          </div>
        </>
      )}
      <div className="SubaccountModal-stats">
        <div className="SubaccountModal-section">
          {subaccountAddress ? (
            <StatsTooltipRow
              label={t`Subaccount Balance`}
              showColon={false}
              value={
                isSubaccountActive ? (
                  <TooltipWithPortal
                    handle={subAccNativeTokenBalanceFormatted}
                    renderContent={renderSubaccountBalanceTooltipContent}
                    position="right-top"
                  />
                ) : (
                  subAccNativeTokenBalanceFormatted
                )
              }
              showDollar={false}
            />
          ) : (
            <div className="SubaccountModal-section" />
          )}
          <StatsTooltipRow
            label={t`Main Account Balance`}
            showColon={false}
            value={
              <TooltipWithPortal
                handle={formatTokenAmount(mainAccWrappedTokenBalance, wrappedToken.decimals, wrappedToken.symbol, {
                  displayDecimals: 4,
                })}
                renderContent={renderMainAccountBalanceTooltipContent}
                position="right-top"
              />
            }
            showDollar={false}
          />
        </div>
        <div className="SubaccountModal-section">
          <InputRow
            value={maxAllowedActionsString}
            setValue={setMaxAllowedActionsString}
            label={t`Max allowed actions`}
            symbol="Actions"
            placeholder="0"
            description={
              <div>
                <Trans>
                  For additional safety, subaccounts are only allowed to perform a specified number of actions before
                  re-authorization from your main account is required.
                </Trans>
              </div>
            }
          />
          <InputRow
            value={topUpString}
            setValue={setTopUpString}
            label={isSubaccountActive ? t`Top-up` : t`Initial top-up`}
            symbol={nativeToken.symbol}
            placeholder="0.0000"
            description={t`This amount of ${nativeToken.symbol} will be sent from your Main Account to your Subaccount to pay for transaction fees.`}
          />
          <InputRow
            value={wntForAutoTopUpsString}
            setValue={setWntForAutoTopUpsString}
            label={t`Сonvert ${nativeToken.symbol} to ${wrappedToken.symbol}`}
            symbol={wrappedToken.symbol}
            placeholder="0.0000"
            description={t`Convert this amount of ${nativeToken.symbol} to ${wrappedToken.symbol} in your Main Account to allow for auto top-ups, as only ${wrappedToken.symbol} can be automatically transferred to your Subaccount. The ${wrappedToken.symbol} balance of your main account is shown above.`}
          />
          <InputRow
            value={maxAutoTopUpAmountString}
            setValue={setMaxAutoTopUpAmountString}
            label={t`Max auto top-up amount`}
            symbol={nativeToken.symbol}
            placeholder="0.0000"
            description={t`This is the maximum top-up amount that will be sent from your Main account to your Subaccount after each transaction. The actual amount sent will depend on the final transaction fee.`}
          />
        </div>
        {tokenApproval}
        <Button onClick={handleButtonClick} disabled={disabled} variant="primary-action" className="w-full">
          {buttonText}
        </Button>
      </div>
    </div>
  );
});

const ButtonIcon = memo(({ icon, title, onClick }: { icon: string; title: string; onClick?: () => void }) => {
  return (
    <span title={title} className="SubaccountModal-button-icon" onClick={onClick}>
      <img src={icon} alt={title} />
    </span>
  );
});

const InputRow = memo(
  ({
    value,
    setValue,
    label,
    symbol = "",
    description,
    placeholder,
    negativeSign = false,
  }: {
    value: string;
    setValue: (value: string) => void;
    label: string;
    symbol?: string;
    description: ReactNode;
    placeholder: string;
    negativeSign?: boolean;
  }) => {
    const renderTooltipContent = useCallback(() => description, [description]);
    return (
      <div>
        <div className="SubaccountModal-input-row flex text-gray">
          <div className="SubaccountModal-input-row-label">
            <TooltipWithPortal position="left-top" handle={label} renderContent={renderTooltipContent} />
          </div>
          <Input
            negativeSign={negativeSign}
            placeholder={placeholder}
            value={value}
            setValue={setValue}
            symbol={symbol}
          />
        </div>
      </div>
    );
  }
);

const Input = memo(
  ({
    value,
    setValue,
    symbol,
    placeholder,
    negativeSign,
  }: {
    value: string;
    setValue: (value: string) => void;
    symbol: string;
    placeholder: string;
    negativeSign: boolean;
  }) => {
    const onChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
      },
      [setValue]
    );
    const id = useMemo(() => `input-${Math.random()}`, []);

    return (
      <div className="SubaccountModal-input-wrapper">
        <div className={cx("SubaccountModal-input")}>
          {negativeSign && <span className="SubaccountModal-negative-sign">-</span>}
          <input placeholder={placeholder} onChange={onChange} id={id} value={value} />
          <label htmlFor={id}>
            <span>{symbol}</span>
          </label>
        </div>
      </div>
    );
  }
);
