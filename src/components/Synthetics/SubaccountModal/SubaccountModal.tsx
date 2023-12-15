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
  useOneClickTradingGenerateSubaccount,
  useOneClickTradingModalOpen,
  useOneClickTradingState,
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
import { BigNumber } from "ethers";
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

type FormState = "empty" | "inactive" | "activated";

export function OneClickTradingModal({ setPendingTxns }: { setPendingTxns: (txns: any[]) => void }) {
  const [isVisible, setIsVisible] = useOneClickTradingModalOpen();
  const oneClickTradingState = useOneClickTradingState();
  const content = oneClickTradingState.subaccount ? <MainView setPendingTxns={setPendingTxns} /> : <OffStateView />;

  return (
    <Modal label="One-Click Trading" isVisible={isVisible} setIsVisible={setIsVisible}>
      <div className="OneClickTrading-modal-content">{content}</div>
    </Modal>
  );
}

const OffStateView = memo(() => {
  const generateSubaccount = useOneClickTradingGenerateSubaccount();
  const onGenerateSubaccountClick = useCallback(() => {
    generateSubaccount();
  }, [generateSubaccount]);

  return (
    <>
      <div className="OneClickTrading-alert">
        <img src={infoIcon} alt="Info Icon" />
        <span>
          Enable <ExternalLink href="#">One-Click Trading</ExternalLink> to reduce signing popups.
        </span>
      </div>
      <Button variant="primary-action" onClick={onGenerateSubaccountClick} className="w-full">
        Generate Subaccount
      </Button>
    </>
  );
});

const MainView = memo(({ setPendingTxns }: { setPendingTxns: (txns: any) => void }) => {
  const oneClickTradingState = useOneClickTradingState();
  const { chainId } = useChainId();
  const { signer } = useWallet();
  const [state, copyToClipboard] = useCopyToClipboard();
  const [copyStatus, setCopyStatus] = useState<null | string>(null);
  const [copyCounter, setCopyCounter] = useState(0);
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

  const handleCopyClick = useCallback(() => {
    if (!subaccountAddress) return;
    setCopyCounter((x) => x + 1);
    copyToClipboard(subaccountAddress);
  }, [copyToClipboard, subaccountAddress]);

  useEffect(() => {
    if (state.error) {
      setCopyStatus("Failed to copy");
    } else if (state.value) {
      setCopyStatus("Copied to clipboard");
    }

    const timeoutId = setTimeout(() => {
      setCopyStatus(null);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [state.error, state.value, copyCounter]);

  const renderSubaccountBalanceTooltipContent = useCallback(() => {
    const executionFee = oneClickTradingState.baseExecutionFee?.feeTokenAmount;
    const currentAutoTopUpAmount = oneClickTradingState.contractData?.currentAutoTopUpAmount;
    const approxNumber =
      subAccNativeTokenBalance && executionFee && currentAutoTopUpAmount
        ? getApproxSubaccountActionsCountByBalance(subAccNativeTokenBalance, executionFee, currentAutoTopUpAmount)
        : null;
    let value: ReactNode = "";
    if (approxNumber === "infinity") {
      value = <span className="OneClickTrading-infinity">∞</span>;
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

  const [isVisible] = useOneClickTradingModalOpen();

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

        isSubaccountActive,
        accountUpdateLoading,
      }),
    [
      mainAccNativeTokenBalance,
      topUp,
      maxAutoTopUpAmount,
      wntForAutoTopUps,
      maxAllowedActions,
      isSubaccountActive,
      accountUpdateLoading,
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

  if (!oneClickTradingState.subaccount) {
    return null;
  }

  const { subaccount } = oneClickTradingState;
  const shouldShowAllowedActionsWarning = isSubaccountActive && remainingActionsCount?.eq(0);
  const shouldShowInsufficientFundsButton = isSubaccountActive && insufficientFunds;

  return (
    <div className="OneClickTrading-controls">
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
      <div className="OneClickTrading-subaccount">
        <div className="OneClickTrading-subaccount-details">
          <span className="OneClickTrading-subaccount-label">
            <Trans>Subaccount:</Trans>
          </span>
          <span>{copyStatus ?? shortenAddressOrEns(subaccount.address, 13)}</span>
        </div>
        <div className="relative">
          <ButtonIcon onClick={handleCopyClick} icon={copyIcon} title="Copy" />
          <ExternalLink href={subaccountExplorerUrl}>
            <ButtonIcon icon={externalLinkIcon} title="Open in Explorer" />
          </ExternalLink>
        </div>
      </div>
      <div className="OneClickTrading-buttons">
        <button onClick={handleWithdrawClick} className="OneClickTrading-mini-button">
          {withdrawalLoading ? <SpinningLoader /> : <Trans>Withdraw</Trans>}
        </button>
        <button onClick={handleDisableClick} className="OneClickTrading-mini-button warning">
          {disablingLoading ? <SpinningLoader /> : <Trans>Disable</Trans>}
        </button>
      </div>
      <div className="OneClickTrading-stats">
        <div className="OneClickTrading-section">
          <StatsTooltipRow
            label={t`Subaccount Balance`}
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
        <div className="OneClickTrading-section">
          <InputRow
            value={topUpString}
            setValue={setTopUpString}
            label={isSubaccountActive ? t`Top up` : t`Initial top up`}
            symbol={nativeToken.symbol}
            placeholder="0.0000"
            tooltipContent={t`This amount of ${nativeToken.symbol} will be sent to your subaccount to pay for transaction fees.`}
          />
          <InputRow
            value={maxAutoTopUpAmountString}
            setValue={setMaxAutoTopUpAmountString}
            label={t`Max auto top up amount`}
            symbol={nativeToken.symbol}
            placeholder="0.0000"
            tooltipContent={t`This is the maximum top up amount that will be sent to your subaccount after each transaction, the actual amount sent will depend on the actual transaction fee.`}
          />
          <InputRow
            value={wntForAutoTopUpsString}
            setValue={setWntForAutoTopUpsString}
            label={t`${wrappedToken.symbol} for auto top ups`}
            symbol={wrappedToken.symbol}
            placeholder="0.0000"
            tooltipContent={t`${nativeToken.symbol} cannot be automatically transferred to your Subaccount, so only ${wrappedToken.symbol} can be used for auto top ups. Keep an amount of ${nativeToken.symbol} as ${wrappedToken.symbol} in your Main Account to allow for auto top ups.`}
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
        <TokenApproval />
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
    <span title={title} className="OneClickTrading-button-icon" onClick={onClick}>
      <img src={icon} alt={title} />
    </span>
  );
});

const TokenApproval = memo(() => {
  const { chainId } = useChainId();
  const wrappedToken = useMemo(() => getWrappedToken(chainId), [chainId]);
  const [modalOpen] = useOneClickTradingModalOpen();

  const { account } = useWallet();

  const { tokensAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: getContract(chainId, "SyntheticsRouter"),
    tokenAddresses: [wrappedToken.address],
    skip: !modalOpen,
  });

  const payAmount = BigNumber.from(1);

  const needPayTokenApproval = useMemo(
    () => (tokensAllowanceData ? getNeedTokenApprove(tokensAllowanceData, wrappedToken.address, payAmount) : false),
    [payAmount, tokensAllowanceData, wrappedToken.address]
  );

  if (!needPayTokenApproval || !account) return null;

  return (
    <div className="OneClickTrading-approve-token-btn">
      <ApproveTokenButton
        spenderAddress={account}
        tokenAddress={wrappedToken.address}
        tokenSymbol={wrappedToken.symbol}
      />
    </div>
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
  }: {
    value: string;
    setValue: (value: string) => void;
    label: string;
    symbol?: string;
    tooltipContent: ReactNode;
    placeholder: string;
  }) => {
    const renderTooltipContent = useCallback(() => {
      return tooltipContent;
    }, [tooltipContent]);

    return (
      <StatsTooltipRow
        showColon={false}
        label={<TooltipWithPortal handle={label} renderContent={renderTooltipContent} position="left-bottom" />}
        value={<Input placeholder={placeholder} value={value} setValue={setValue} symbol={symbol} />}
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
  }: {
    value: string;
    setValue: (value: string) => void;
    symbol: string;
    placeholder: string;
  }) => {
    const onChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
      },
      [setValue]
    );
    const id = useMemo(() => `input-${Math.random()}`, []);

    return (
      <div className="OneClickTrading-input-wrapper">
        <div className={cx("OneClickTrading-input")}>
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
    <div className="OneClickTrading-warning">
      <div className="OneClickTrading-warning-icon">
        <img src={warnIcon} alt="Warning" />
      </div>
      <div className="OneClickTrading-warning-text text-gray">{children}</div>
    </div>
  );
};
