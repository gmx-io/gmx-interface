import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import Button from "components/Button/Button";
import SpinningLoader from "components/Common/SpinningLoader";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Modal from "components/Modal/Modal";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { getContract } from "config/contracts";
import { getNativeToken, getWrappedToken } from "config/tokens";
import {
  useIsSubaccountActive,
  useSubaccountGenerateSubaccount,
  useSubaccountModalOpen,
  useSubaccountSelector,
  useSubaccountState,
  useSubaccountActionCounts,
  useSubaccountAddress,
  useSubaccountInsufficientFunds,
} from "context/SubaccountContext/SubaccountContext";
import { useBigNumberInput } from "domain/synthetics/common/useBigNumberInput";
import { useGasPrice } from "domain/synthetics/fees";
import { initSubaccount } from "domain/synthetics/subaccount/initSubaccount";
import { removeSubaccount } from "domain/synthetics/subaccount/removeSubaccount";
import { withdrawFromSubaccount } from "domain/synthetics/subaccount/withdrawFromSubaccount";
import { getNeedTokenApprove, useTokenBalances, useTokensAllowanceData, useTokensData } from "domain/synthetics/tokens";
import copyIcon from "img/ic_copy_20.svg";
import infoIcon from "img/ic_info.svg";
import externalLinkIcon from "img/ic_new_link_20.svg";
import warnIcon from "img/ic_warn.svg";
import { useChainId } from "lib/chains";
import { getAccountUrl } from "lib/legacy";
import { formatTokenAmount } from "lib/numbers";
import { getByKey } from "lib/objects";
import { shortenAddressOrEns } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";
import { ReactNode, memo, useCallback, useEffect, useMemo, useState } from "react";
import { useCopyToClipboard, usePrevious } from "react-use";
import "./SubaccountModal.scss";
import { getApproxSubaccountActionsCountByBalance, getDefaultValues, getButtonState } from "./utils";
import { useTransactionPending } from "domain/synthetics/common/useTransactionReceipt";
import { helperToast } from "lib/helperToast";

type FormState = "empty" | "inactive" | "activated";

export function SubaccountModal({ setPendingTxns }: { setPendingTxns: (txns: any[]) => void }) {
  const [isVisible, setIsVisible] = useSubaccountModalOpen();
  const subaccountAddress = useSubaccountSelector((s) => s.subaccount?.address);
  const content = subaccountAddress ? <MainView setPendingTxns={setPendingTxns} /> : <OffStateView />;

  return (
    <Modal label="One-Click Trading" isVisible={isVisible} setIsVisible={setIsVisible}>
      <div className="Subaccount-modal-content">{content}</div>
    </Modal>
  );
}

const OffStateView = memo(() => {
  const generateSubaccount = useSubaccountGenerateSubaccount();

  return (
    <>
      <div className="Subaccount-alert">
        <img src={infoIcon} alt="Info Icon" />
        <span>
          Enable <ExternalLink href="#">One-Click Trading</ExternalLink> to reduce signing popups.
        </span>
      </div>
      <Button variant="primary-action" onClick={generateSubaccount} className="w-full">
        Generate Subaccount
      </Button>
    </>
  );
});

const MainView = memo(({ setPendingTxns }: { setPendingTxns: (txns: any) => void }) => {
  const oneClickTradingState = useSubaccountState();
  const { chainId } = useChainId();
  const { signer } = useWallet();
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [disablingLoading, setDisablingLoading] = useState(false);
  const [accountUpdateLoading, setAccountUpdateLoading] = useState(false);
  const { account } = useWallet();

  const { tokensData } = useTokensData(chainId);
  const subaccountAddress = useSubaccountAddress();
  const mainBalances = useTokenBalances(chainId, account);
  const subBalances = useTokenBalances(chainId, subaccountAddress ?? undefined);
  const wrappedToken = useMemo(() => getWrappedToken(chainId), [chainId]);
  const nativeToken = useMemo(() => getNativeToken(chainId), [chainId]);
  const mainAccNativeTokenBalance = getByKey(mainBalances.balancesData, nativeToken.address);
  const mainAccWrappedTokenBalance = getByKey(mainBalances.balancesData, wrappedToken.address);
  const subAccNativeTokenBalance = getByKey(subBalances.balancesData, nativeToken.address);
  const subaccountExplorerUrl = useMemo(() => getAccountUrl(chainId, subaccountAddress), [chainId, subaccountAddress]);
  const insufficientFunds = useSubaccountInsufficientFunds(oneClickTradingState.baseExecutionFee?.feeTokenAmount);

  const defaults = useMemo(() => {
    if (!tokensData) return null;
    const data = tokensData[nativeToken.address];
    if (!data) return null;

    return getDefaultValues(data);
  }, [nativeToken.address, tokensData]);

  const renderSubaccountBalanceTooltipContent = useCallback(() => {
    const executionFee = oneClickTradingState.baseExecutionFee?.feeTokenAmount;
    const currentAutoTopUpAmount = oneClickTradingState.contractData?.currentAutoTopUpAmount;
    const approxNumber =
      subAccNativeTokenBalance && executionFee && currentAutoTopUpAmount
        ? getApproxSubaccountActionsCountByBalance(subAccNativeTokenBalance, executionFee, currentAutoTopUpAmount)
        : null;
    let value: ReactNode = "";
    if (approxNumber === "infinity") {
      value = <span className="Subaccount-infinity">∞</span>;
    } else {
      value = approxNumber?.toString() ?? t`Unknown`;
    }
    return (
      <div>
        <StatsTooltipRow label={t`Expected Available Actions`} showDollar={false} value={value} />
        <br />
        <Trans>Expected Actions are based on the current Network Fee.</Trans>
      </div>
    );
  }, [
    oneClickTradingState.baseExecutionFee?.feeTokenAmount,
    oneClickTradingState.contractData?.currentAutoTopUpAmount,
    subAccNativeTokenBalance,
  ]);

  const renderMainAccountBalanceTooltipContent = useCallback(() => {
    return (
      <div>
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

  const [activeTx, setActiveTx] = useState<string | null>(null);
  const isTxPending = useTransactionPending(activeTx);
  const prevIsTxPending = usePrevious(isTxPending);

  const { current: actionsCount, remaining: remainingActionsCount } = useSubaccountActionCounts();

  useEffect(() => {
    if (nextFormState === formState) return;

    if (!isSubaccountActive && defaults && nextFormState === "inactive") {
      setTopUp(defaults.topUp);
      setMaxAutoTopUpAmount(defaults.maxAutoTopUpAmount ?? null);
      setWntForAutoTopUps(defaults.wntForAutoTopUps);
      setMaxAllowedActions(defaults.maxAllowedActions);
      setFormState("inactive");
    } else if (isSubaccountActive && nextFormState === "activated") {
      setTopUp(null);
      setMaxAutoTopUpAmount(oneClickTradingState.contractData?.currentAutoTopUpAmount ?? null);
      setWntForAutoTopUps(null);
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

  const handleDisableClick = useCallback(async () => {
    if (!subaccountAddress) throw new Error("Subaccount address is not set");
    if (!signer) throw new Error("Signer is not set");

    if (isSubaccountActive) {
      setDisablingLoading(true);

      try {
        await removeSubaccount(chainId, signer, subaccountAddress);
      } finally {
        setDisablingLoading(false);
      }
    }

    oneClickTradingState.clearSubaccount();
    setNextFormState("empty");
  }, [chainId, isSubaccountActive, oneClickTradingState, signer, subaccountAddress]);

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
  }, [isTxPending, prevIsTxPending, setNextFormState]);

  const handleActiveClick = useCallback(async () => {
    if (!account) throw new Error("Account is not defined");
    if (!subaccountAddress) throw new Error("Subaccount address is not defined");
    if (!signer) throw new Error("Signer is not defined");
    if (!actionsCount) throw new Error("Action counts are not defined");

    setAccountUpdateLoading(true);

    try {
      const tx = await initSubaccount(
        chainId,
        signer,
        subaccountAddress,
        account,
        isSubaccountActive ?? false,
        actionsCount,
        setPendingTxns,
        {
          topUp: topUp,
          maxAutoTopUpAmount,
          wntForAutoTopUps,
          maxAllowedActions,
        }
      );
      setActiveTx(tx.hash);
    } finally {
      setAccountUpdateLoading(false);
    }
  }, [
    account,
    subaccountAddress,
    signer,
    actionsCount,
    chainId,
    isSubaccountActive,
    setPendingTxns,
    topUp,
    maxAutoTopUpAmount,
    wntForAutoTopUps,
    maxAllowedActions,
  ]);

  const { tokensAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: getContract(chainId, "SyntheticsRouter"),
    tokenAddresses: [wrappedToken.address],
    skip: !isVisible,
  });

  const payAmount = oneClickTradingState.baseExecutionFee?.feeTokenAmount;

  const needPayTokenApproval = useMemo(
    () =>
      tokensAllowanceData && payAmount
        ? getNeedTokenApprove(tokensAllowanceData, wrappedToken.address, payAmount)
        : false,
    [payAmount, tokensAllowanceData, wrappedToken.address]
  );

  const {
    text: buttonText,
    disabled,
    spinner,
  } = useMemo(
    () =>
      getButtonState({
        mainAccEthBalance: mainAccNativeTokenBalance,

        topUp,
        maxAutoTopUpAmount,
        wntForAutoTopUps,
        maxAllowedActions,

        needPayTokenApproval,

        isSubaccountActive,
        accountUpdateLoading,

        nativeTokenSymbol: nativeToken.symbol,
        wrappedTokenSymbol: wrappedToken.symbol,
      }),
    [
      mainAccNativeTokenBalance,
      topUp,
      maxAutoTopUpAmount,
      wntForAutoTopUps,
      maxAllowedActions,
      needPayTokenApproval,
      isSubaccountActive,
      accountUpdateLoading,
      nativeToken.symbol,
      wrappedToken.symbol,
    ]
  );

  const { gasPrice } = useGasPrice(chainId);

  const handleWithdrawClick = useCallback(async () => {
    const privateKey = oneClickTradingState.subaccount?.privateKey;

    if (!privateKey) throw new Error("privateKey is not defined");
    if (!account) throw new Error("account is not defined");
    if (!signer) throw new Error("signer is not defined");
    if (!subAccNativeTokenBalance) throw new Error("subEthBalance is not defined");
    if (!gasPrice) throw new Error("gasPrice is not defined");

    setWithdrawalLoading(true);

    try {
      await withdrawFromSubaccount({
        chainId,
        mainAccountAddress: account,
        privateKey,
      });
    } finally {
      setWithdrawalLoading(false);
    }
  }, [account, chainId, gasPrice, oneClickTradingState.subaccount?.privateKey, signer, subAccNativeTokenBalance]);

  const shouldShowAllowedActionsWarning = isSubaccountActive && remainingActionsCount?.eq(0);
  const shouldShowInsufficientFundsButton = isSubaccountActive && insufficientFunds;

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

  return (
    <div className="SubaccountModal-content">
      {shouldShowAllowedActionsWarning && (
        <Warning>
          <Trans>
            The previously authorized maximum number of Actions have been reached for One&#8209;Click&nbsp;Trading. Set
            Max allowed Actions and re-authorize.
          </Trans>
        </Warning>
      )}
      {shouldShowInsufficientFundsButton && (
        <Warning>
          <Trans>
            There are insufficient funds in your Subaccount for One-Click Trading. Please top-up your Balance.
          </Trans>
        </Warning>
      )}
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
        <button onClick={handleWithdrawClick} className="SubaccountModal-mini-button">
          {withdrawalLoading ? <SpinningLoader /> : <Trans>Withdraw</Trans>}
        </button>
        <button onClick={handleDisableClick} className="SubaccountModal-mini-button warning">
          {disablingLoading ? <SpinningLoader /> : <Trans>Disable</Trans>}
        </button>
      </div>
      <div className="SubaccountModal-stats">
        <div className="SubaccountModal-section">
          <StatsTooltipRow
            label={t`SubaccountModal Balance`}
            showColon={false}
            value={
              <TooltipWithPortal
                handle={formatTokenAmount(subAccNativeTokenBalance, nativeToken.decimals, nativeToken.symbol, {
                  displayDecimals: 4,
                })}
                renderContent={renderSubaccountBalanceTooltipContent}
                position="right-bottom"
              />
            }
            showDollar={false}
          />
          <StatsTooltipRow
            label={t`Main Account Balance`}
            showColon={false}
            value={
              <TooltipWithPortal
                handle={formatTokenAmount(mainAccWrappedTokenBalance, wrappedToken.decimals, wrappedToken.symbol, {
                  displayDecimals: 4,
                })}
                renderContent={renderMainAccountBalanceTooltipContent}
                position="right-bottom"
              />
            }
            showDollar={false}
          />
        </div>
        <div className="SubaccountModal-section">
          <InputRow
            value={topUpString}
            setValue={setTopUpString}
            label={isSubaccountActive ? t`Top up` : t`Initial top up`}
            symbol={nativeToken.symbol}
            placeholder="0.0000"
            tooltipContent={t`This amount of ${nativeToken.symbol} will be sent to your subaccount to pay for transaction fees.`}
            negativeSign
          />
          <InputRow
            value={wntForAutoTopUpsString}
            setValue={setWntForAutoTopUpsString}
            label={t`${wrappedToken.symbol} for auto top ups`}
            symbol={wrappedToken.symbol}
            placeholder="0.0000"
            tooltipContent={t`${nativeToken.symbol} cannot be automatically transferred to your Subaccount, so only ${wrappedToken.symbol} can be used for auto top ups. Convert this amount of ${nativeToken.symbol} to${wrappedToken.symbol} in your Main Account to allow for auto top-ups.`}
            negativeSign
          />
          <InputRow
            value={maxAutoTopUpAmountString}
            setValue={setMaxAutoTopUpAmountString}
            label={t`Max auto top up amount`}
            symbol={nativeToken.symbol}
            placeholder="0.0000"
            tooltipContent={t`This maximum top-up amount will be sent to your subaccount after each transaction. The actual amount sent will depend on the final transaction fee.`}
          />
          <InputRow
            value={maxAllowedActionsString}
            setValue={setMaxAllowedActionsString}
            label={t`Max allowed actions`}
            symbol="Actions"
            placeholder="0"
            tooltipContent={
              <div>
                <Trans>
                  For additional safety, subaccounts are only allowed to perform a specified number of actions before
                  re-authorization from your main account is required.
                </Trans>
                {remainingActionsCount && (
                  <>
                    <br />
                    <br />
                    <StatsTooltipRow
                      label={t`Current actions count`}
                      value={`${remainingActionsCount.toString()} remaining`}
                      showDollar={false}
                    />
                  </>
                )}
              </div>
            }
          />
        </div>
        {tokenApproval}
        <Button
          onClick={handleActiveClick}
          disabled={disabled || spinner || isTxPending}
          variant="primary-action"
          className="w-full"
        >
          {isTxPending || spinner ? <SpinningLoader /> : buttonText}
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
    tooltipContent,
    placeholder,
    negativeSign = false,
  }: {
    value: string;
    setValue: (value: string) => void;
    label: string;
    symbol?: string;
    tooltipContent: ReactNode;
    placeholder: string;
    negativeSign?: boolean;
  }) => {
    const renderTooltipContent = useCallback(() => {
      return tooltipContent;
    }, [tooltipContent]);

    return (
      <StatsTooltipRow
        showColon={false}
        label={<TooltipWithPortal handle={label} renderContent={renderTooltipContent} position="left-bottom" />}
        value={
          <Input
            negativeSign={negativeSign}
            placeholder={placeholder}
            value={value}
            setValue={setValue}
            symbol={symbol}
          />
        }
        showDollar={false}
      />
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
      (e: React.ChangeEvent<HTMLInputElement>) => {
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

const Warning = ({ children }: { children: ReactNode }) => {
  return (
    <div className="SubaccountModal-warning">
      <div className="SubaccountModal-warning-icon">
        <img src={warnIcon} alt="Warning" />
      </div>
      <div className="SubaccountModal-warning-text text-gray">{children}</div>
    </div>
  );
};
