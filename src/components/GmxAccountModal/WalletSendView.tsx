import { Trans, t } from "@lingui/macro";
import { ReactNode, useCallback, useMemo, useState } from "react";
import { Address, encodeFunctionData, isAddress } from "viem";

import { AnyChainId, getChainName, isTestnetChain, SettlementChainId, SourceChainId } from "config/chains";
import { CHAIN_ID_TO_NETWORK_ICON } from "config/icons";
import { getMappedTokenId, getMultichainTokenId, MULTICHAIN_FUNDING_SLIPPAGE_BPS } from "config/multichain";
import { useGmxAccountModalOpen, useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { showWalletCrossChainSendStatusToast } from "domain/multichain/progress/walletCrossChainSendToast";
import { sendCrossChainDepositTxn } from "domain/multichain/sendCrossChainDepositTxn";
import { SendParam } from "domain/multichain/types";
import { useMultichainQuoteFeeUsd } from "domain/multichain/useMultichainQuoteFeeUsd";
import { useQuoteOft } from "domain/multichain/useQuoteOft";
import { useQuoteOftLimits } from "domain/multichain/useQuoteOftLimits";
import { useQuoteSendNativeFeeWithGasLimit } from "domain/multichain/useQuoteSend";
import { getBalanceByBalanceType, useTokensDataRequest } from "domain/synthetics/tokens";
import { convertToUsd, TokenBalanceType, TokenData } from "domain/tokens";
import { useMaxAvailableAmount } from "domain/tokens/useMaxAvailableAmount";
import { useTokenApproval } from "domain/tokens/useTokenApproval";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { formatUsd, parseValue } from "lib/numbers";
import { getByKey } from "lib/objects";
import { sendWalletTransaction } from "lib/transactions/sendWalletTransaction";
import useWallet from "lib/wallets/useWallet";
import { abis } from "sdk/abis";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import { getMidPrice } from "sdk/utils/tokens";
import { applySlippageToMinOut } from "sdk/utils/trade";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { Amount } from "components/Amount/Amount";
import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import Button from "components/Button/Button";
import { DropdownSelector } from "components/DropdownSelector/DropdownSelector";
import NumberInput from "components/NumberInput/NumberInput";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import { useGmxAccountWithdrawNetworks } from "./hooks";
import { wrapChainAction } from "./wrapChainAction";

function getWalletBalanceUsd(token: TokenData): bigint {
  if (!token.prices || token.walletBalance === undefined) {
    return 0n;
  }
  return convertToUsd(token.walletBalance, token.decimals, getMidPrice(token.prices)) ?? 0n;
}

function getWalletTokenOptions(tokensData: Record<string, TokenData> | undefined): TokenData[] {
  if (!tokensData) {
    return [];
  }

  const options = Object.values(tokensData).filter((token): token is TokenData => {
    if (token.isPlatformToken || token.isSynthetic) {
      return false;
    }

    const hasWalletBalance = token.walletBalance !== undefined && token.walletBalance > 0n;
    const isPrimaryToken = Boolean(token.isNative || token.isWrapped || token.isStable);

    return hasWalletBalance || isPrimaryToken;
  });

  return options.sort((a, b) => {
    const aUsd = getWalletBalanceUsd(a);
    const bUsd = getWalletBalanceUsd(b);
    return bUsd > aUsd ? 1 : bUsd < aUsd ? -1 : 0;
  });
}

type SendNetworkOption = { id: number; name: string; disabled?: boolean };

function getSendNetworkOptions({
  networks,
  selectedToken,
  chainId,
}: {
  networks: { id: number; name: string }[];
  selectedToken: TokenData | undefined;
  chainId: number;
}): SendNetworkOption[] {
  if (!selectedToken) {
    return networks;
  }

  return networks
    .map((network): SendNetworkOption => {
      if (network.id === chainId) {
        return network;
      }

      const mappedTokenId = getMappedTokenId(
        chainId as SettlementChainId,
        selectedToken.address,
        network.id as SourceChainId
      );

      return {
        ...network,
        disabled: mappedTokenId === undefined,
      };
    })
    .sort((a, b) => (a.disabled ? 1 : b.disabled ? -1 : 0));
}

export function WalletSendView() {
  const { chainId } = useChainId();
  const { account } = useWallet();
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  const [, setSettlementChainId] = useGmxAccountSettlementChainId();

  const { tokensData } = useTokensDataRequest(chainId);

  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string | undefined>(undefined);
  const [selectedNetwork, setSelectedNetwork] = useState<number | undefined>(undefined);
  const [recipient, setRecipient] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tokenOptions = useMemo(() => getWalletTokenOptions(tokensData), [tokensData]);

  const selectedToken = getByKey(tokensData, selectedTokenAddress);
  const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS);
  const walletBalance = getBalanceByBalanceType(selectedToken, TokenBalanceType.Wallet);

  const networks = useGmxAccountWithdrawNetworks();
  const networkOptions = useMemo(
    () => getSendNetworkOptions({ networks, selectedToken, chainId }),
    [networks, selectedToken, chainId]
  );

  const destinationChainId = (selectedNetwork ?? chainId) as AnyChainId;
  const isSameChain = destinationChainId === chainId;

  const selectedTokenMultichainId =
    selectedToken !== undefined ? getMultichainTokenId(chainId, selectedToken.address) : undefined;
  const stargateAddress = selectedTokenMultichainId?.stargate;

  const destinationNetworkOption = useMemo(
    () => networkOptions.find((option) => option.id === destinationChainId),
    [networkOptions, destinationChainId]
  );
  const isDestinationUnsupported = !isSameChain && Boolean(destinationNetworkOption?.disabled);

  const amount =
    selectedToken && inputValue !== "" ? parseValue(inputValue, selectedToken.decimals) ?? undefined : undefined;
  const amountUsd = selectedToken
    ? convertToUsd(amount, selectedToken.decimals, selectedToken.prices?.maxPrice)
    : undefined;

  const walletBalanceUsd =
    selectedToken && walletBalance !== undefined
      ? convertToUsd(walletBalance, selectedToken.decimals, selectedToken.prices?.maxPrice)
      : undefined;
  const nextWalletBalanceUsd =
    walletBalanceUsd !== undefined && amountUsd !== undefined ? walletBalanceUsd - amountUsd : undefined;

  const isRecipientValid = isAddress(recipient);
  const isInputEmpty = amount === undefined || amount <= 0n;
  const isInsufficientBalance = walletBalance !== undefined && amount !== undefined && amount > walletBalance;

  const sendParamsWithoutSlippage: SendParam | undefined = useMemo(() => {
    if (
      isSameChain ||
      isDestinationUnsupported ||
      !isRecipientValid ||
      amount === undefined ||
      amount <= 0n ||
      stargateAddress === undefined
    ) {
      return undefined;
    }

    return getMultichainTransferSendParams({
      dstChainId: destinationChainId,
      account: recipient,
      amountLD: amount,
      isToGmx: false,
    });
  }, [isSameChain, isDestinationUnsupported, isRecipientValid, amount, stargateAddress, destinationChainId, recipient]);

  const { data: quoteOft } = useQuoteOft({
    sendParams: sendParamsWithoutSlippage,
    fromStargateAddress: stargateAddress,
    fromChainId: chainId,
    toChainId: destinationChainId,
  });

  const { isBelowLimit, lowerLimitFormatted, isAboveLimit, upperLimitFormatted } = useQuoteOftLimits({
    quoteOft,
    amountLD: amount,
    isStable: selectedToken?.isStable,
    decimals: selectedToken?.decimals,
    enabled: !isSameChain,
  });

  const sendParamsWithSlippage: SendParam | undefined = useMemo(() => {
    if (!quoteOft || !sendParamsWithoutSlippage) {
      return undefined;
    }

    return {
      ...sendParamsWithoutSlippage,
      minAmountLD: applySlippageToMinOut(MULTICHAIN_FUNDING_SLIPPAGE_BPS, quoteOft.receipt.amountReceivedLD as bigint),
    };
  }, [quoteOft, sendParamsWithoutSlippage]);

  const { data: quoteSendData } = useQuoteSendNativeFeeWithGasLimit({
    sendParams: sendParamsWithSlippage,
    fromStargateAddress: stargateAddress,
    fromChainId: chainId,
    toChainId: destinationChainId,
    fromTokenAddress: selectedToken?.address,
  });

  const quoteSendNativeFee = quoteSendData?.nativeFee;

  const { networkFee, networkFeeUsd } = useMultichainQuoteFeeUsd({
    quoteSendNativeFee,
    quoteOft,
    unwrappedTokenAddress: selectedToken?.address,
    sourceChainId: chainId,
    targetChainId: destinationChainId,
    initialTxGasLimit: quoteSendData?.gasLimit,
    waitForTxGasLimit: true,
  });

  const approvalTokens = useMemo(
    () =>
      !isSameChain && selectedToken && !selectedToken.isNative && amount !== undefined
        ? [{ tokenAddress: selectedToken.address, amount }]
        : [],
    [isSameChain, selectedToken, amount]
  );

  const { needsApproval, isApproving, isAllowanceLoaded, handleApprove } = useTokenApproval({
    chainId,
    spenderAddress: stargateAddress,
    tokens: approvalTokens,
    approveAmount: amount,
    skip: isSameChain || isDestinationUnsupported || selectedToken?.isNative || stargateAddress === undefined,
  });

  const { formattedMaxAvailableAmount, showClickMax } = useMaxAvailableAmount({
    fromToken: selectedToken,
    fromTokenBalance: walletBalance,
    fromTokenAmount: amount,
    fromTokenInputValue: inputValue,
    gasPaymentToken: nativeToken,
    gasPaymentTokenBalance: nativeToken?.walletBalance,
    gasPaymentTokenAmount: !isSameChain && selectedToken?.isNative ? quoteSendNativeFee : undefined,
  });

  const handleMaxClick = useCallback(() => {
    setInputValue(formattedMaxAvailableAmount);
  }, [formattedMaxAvailableAmount]);

  const handleSameChainSend = useCallback(async () => {
    if (
      selectedToken === undefined ||
      account === undefined ||
      amount === undefined ||
      amount <= 0n ||
      !isAddress(recipient)
    ) {
      return;
    }

    setIsSubmitting(true);

    try {
      await wrapChainAction(chainId, setSettlementChainId, async (signer) => {
        const to = selectedToken.isNative ? recipient : selectedToken.address;
        const value = selectedToken.isNative ? amount : 0n;
        const callData = selectedToken.isNative
          ? "0x"
          : encodeFunctionData({
              abi: abis.ERC20,
              functionName: "transfer",
              args: [recipient as Address, amount],
            });

        await sendWalletTransaction({ chainId, signer, to, callData, value });
      });

      helperToast.success(t`Sent`);
      setIsVisibleOrView("main");
    } catch (error) {
      helperToast.error(t`Send failed`);
    } finally {
      setIsSubmitting(false);
    }
  }, [account, amount, chainId, recipient, selectedToken, setIsVisibleOrView, setSettlementChainId]);

  const handleCrossChainSend = useCallback(async () => {
    if (
      selectedToken === undefined ||
      account === undefined ||
      amount === undefined ||
      amount <= 0n ||
      !isAddress(recipient) ||
      stargateAddress === undefined ||
      sendParamsWithSlippage === undefined ||
      quoteSendNativeFee === undefined
    ) {
      return;
    }

    setIsSubmitting(true);

    try {
      let sourceTxHash: string | undefined;

      await wrapChainAction(chainId, setSettlementChainId, async (signer) => {
        const result = await sendCrossChainDepositTxn({
          chainId: chainId as SourceChainId,
          signer,
          tokenAddress: selectedToken.address,
          stargateAddress,
          amount,
          quoteSendNativeFee,
          sendParams: sendParamsWithSlippage,
          account,
        });

        sourceTxHash = result.transactionHash;
      });

      if (sourceTxHash !== undefined) {
        showWalletCrossChainSendStatusToast({
          sourceChainId: chainId,
          destinationChainId,
          token: selectedToken,
          amount,
          txHash: sourceTxHash,
        });
      } else {
        helperToast.success(t`Sent`);
      }

      setIsVisibleOrView("main");
    } catch (error) {
      helperToast.error(t`Send failed`);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    account,
    amount,
    chainId,
    destinationChainId,
    quoteSendNativeFee,
    recipient,
    selectedToken,
    sendParamsWithSlippage,
    setIsVisibleOrView,
    setSettlementChainId,
    stargateAddress,
  ]);

  const handleSend = useCallback(() => {
    if (isSameChain) {
      void handleSameChainSend();
    } else {
      void handleCrossChainSend();
    }
  }, [isSameChain, handleSameChainSend, handleCrossChainSend]);

  const networkItemDisabledMessage = useCallback(
    (option: SendNetworkOption) => t`Sending ${selectedToken?.symbol} to ${option.name} is not supported`,
    [selectedToken?.symbol]
  );

  const isTestnet = isTestnetChain(chainId);

  const estimatedTimeValue = useMemo(() => {
    if (isSameChain) {
      return <Trans>Instant</Trans>;
    }

    if (amount === undefined || amount === 0n) {
      return "...";
    }

    return isTestnet ? <Trans>1m 40s</Trans> : <Trans>20s</Trans>;
  }, [isSameChain, amount, isTestnet]);

  const networkFeeValue = useMemo(() => {
    if (networkFee === undefined || networkFeeUsd === undefined || nativeToken === undefined) {
      return "...";
    }

    return (
      <AmountWithUsdBalance
        className="leading-1"
        amount={networkFee}
        decimals={nativeToken.decimals}
        usd={networkFeeUsd}
        symbol={nativeToken.symbol}
      />
    );
  }, [networkFee, networkFeeUsd, nativeToken]);

  let buttonState: { text: ReactNode; disabled?: boolean; onClick?: () => void } = {
    text: t`Send`,
    onClick: handleSend,
  };

  if (isSubmitting) {
    buttonState = { text: t`Sending...`, disabled: true };
  } else if (selectedToken === undefined) {
    buttonState = { text: t`Select token`, disabled: true };
  } else if (isDestinationUnsupported) {
    buttonState = {
      text: t`Sending ${selectedToken.symbol} to ${getChainName(destinationChainId)} is not supported`,
      disabled: true,
    };
  } else if (recipient === "") {
    buttonState = { text: t`Enter recipient address`, disabled: true };
  } else if (!isRecipientValid) {
    buttonState = { text: t`Invalid recipient address`, disabled: true };
  } else if (isInputEmpty) {
    buttonState = { text: t`Enter amount`, disabled: true };
  } else if (isInsufficientBalance) {
    buttonState = { text: t`Insufficient balance`, disabled: true };
  } else if (!isSameChain) {
    if (isAboveLimit || isBelowLimit) {
      buttonState = { text: t`Send`, disabled: true };
    } else if (isApproving) {
      buttonState = { text: t`Approving...`, disabled: true };
    } else if (needsApproval) {
      buttonState = { text: t`Approve ${selectedToken.symbol}`, onClick: handleApprove };
    } else if (!isAllowanceLoaded || sendParamsWithSlippage === undefined || quoteSendNativeFee === undefined) {
      buttonState = { text: t`Send`, disabled: true };
    }
  }

  return (
    <div className="flex grow flex-col overflow-y-auto p-adaptive">
      <div className="flex flex-col gap-[--padding-adaptive]">
        <div className="flex flex-col gap-6">
          <div className="text-body-medium text-typography-secondary">
            <Trans>Asset</Trans>
          </div>
          <DropdownSelector
            value={selectedTokenAddress}
            onChange={setSelectedTokenAddress}
            placeholder={t`Select token`}
            button={
              selectedTokenAddress && selectedToken ? (
                <div className="flex items-center gap-8">
                  <TokenIcon symbol={selectedToken.symbol} displaySize={20} />
                  <span>{selectedToken.symbol}</span>
                </div>
              ) : undefined
            }
            options={tokenOptions}
            item={SendAssetItem}
            itemKey={sendAssetItemKey}
          />
        </div>

        <div className="flex flex-col gap-6">
          <div className="text-body-medium text-typography-secondary">
            <Trans>Network</Trans>
          </div>
          <DropdownSelector
            value={destinationChainId}
            onChange={(value) => setSelectedNetwork(Number(value))}
            placeholder={t`Select network`}
            button={
              <div className="flex items-center gap-8">
                <img
                  src={CHAIN_ID_TO_NETWORK_ICON[destinationChainId]}
                  alt={getChainName(destinationChainId)}
                  className="size-20"
                />
                <span className="text-16 leading-base">{getChainName(destinationChainId)}</span>
              </div>
            }
            options={networkOptions}
            item={NetworkItem}
            itemKey={networkItemKey}
            itemDisabled={networkItemDisabled}
            itemDisabledMessage={networkItemDisabledMessage}
          />
        </div>

        <div className="flex flex-col gap-6">
          <div className="text-body-medium text-typography-secondary">
            <Trans>Recipient address</Trans>
          </div>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value.trim())}
            spellCheck={false}
            autoComplete="off"
            placeholder="0x..."
            className="w-full rounded-8 border border-slate-800 bg-slate-800 px-14 py-13 text-16 leading-base
                       outline-none placeholder:text-typography-secondary focus-within:border-blue-300 hover:bg-fill-surfaceElevatedHover"
          />
        </div>

        <div className="flex flex-col gap-6">
          <div className="text-body-medium flex items-center justify-between text-typography-secondary">
            <Trans>Amount</Trans>
            {selectedToken !== undefined && walletBalance !== undefined && (
              <div>
                <Trans>Available:</Trans>{" "}
                <Amount
                  className="text-typography-primary"
                  amount={walletBalance}
                  decimals={selectedToken.decimals}
                  isStable={selectedToken.isStable}
                  symbol={selectedToken.symbol}
                />
              </div>
            )}
          </div>
          <div className="relative text-16 leading-base">
            <NumberInput
              value={inputValue}
              onValueChange={(e) => setInputValue(e.target.value)}
              className="w-full rounded-8 border border-slate-800 bg-slate-800 py-13 pl-14 pr-96 text-16 leading-base
                         focus-within:border-blue-300 hover:bg-fill-surfaceElevatedHover"
              placeholder="0.00"
              maxDecimals={selectedToken?.decimals}
            />
            <div className="pointer-events-none absolute right-14 top-1/2 flex -translate-y-1/2 items-center gap-8">
              <span className="text-typography-secondary">{selectedToken?.symbol}</span>
              {showClickMax && (
                <button
                  className="text-body-small pointer-events-auto rounded-full bg-slate-600 px-8 py-2 font-medium
                           hover:bg-slate-500 focus-visible:bg-slate-500 active:bg-slate-500/70"
                  onClick={handleMaxClick}
                >
                  <Trans>Max</Trans>
                </button>
              )}
            </div>
          </div>
          <div className="text-body-medium text-typography-secondary numbers">{formatUsd(amountUsd ?? 0n)}</div>
        </div>
      </div>

      {!isSameChain && !isInsufficientBalance && (
        <>
          {isAboveLimit && (
            <AlertInfoCard type="warning" className="my-4" hideClose>
              <div>
                <Trans>
                  Amount exceeds the transfer limit. Try an amount smaller than{" "}
                  <span className="numbers">{upperLimitFormatted}</span>.
                </Trans>
              </div>
            </AlertInfoCard>
          )}
          {isBelowLimit && (
            <AlertInfoCard type="warning" className="my-4" hideClose>
              <div>
                <Trans>
                  Amount is below the transfer limit. Try an amount larger than{" "}
                  <span className="numbers">{lowerLimitFormatted}</span>.
                </Trans>
              </div>
            </AlertInfoCard>
          )}
        </>
      )}

      <div className="h-32 shrink-0 grow" />

      {selectedTokenAddress && (
        <div className="mb-16 flex flex-col gap-10">
          <SyntheticsInfoRow
            label={<Trans>Estimated time</Trans>}
            valueClassName="numbers"
            value={estimatedTimeValue}
          />
          {!isSameChain && <SyntheticsInfoRow label={<Trans>Network fee</Trans>} value={networkFeeValue} />}
          <SyntheticsInfoRow
            label={<Trans>Wallet balance</Trans>}
            value={<ValueTransition from={formatUsd(walletBalanceUsd)} to={formatUsd(nextWalletBalanceUsd)} />}
          />
        </div>
      )}

      <Button
        variant="primary-action"
        className="w-full shrink-0"
        onClick={buttonState.onClick}
        disabled={buttonState.disabled}
      >
        {buttonState.text}
      </Button>
    </div>
  );
}

function SendAssetItem({ option }: { option: TokenData }) {
  return (
    <div className="flex items-center justify-between gap-8">
      <div className="flex gap-8">
        <TokenIcon symbol={option.symbol} displaySize={20} />
        <span>
          {option.symbol} <span className="text-body-small text-typography-secondary">{option.name}</span>
        </span>
      </div>
      <Amount
        className="text-typography-primary"
        amount={option.walletBalance !== undefined && option.walletBalance > 0n ? option.walletBalance : undefined}
        decimals={option.decimals}
        isStable={option.isStable}
        emptyValue="-"
      />
    </div>
  );
}

function sendAssetItemKey(option: TokenData) {
  return option.address;
}

function networkItemKey(option: SendNetworkOption) {
  return option.id;
}

function networkItemDisabled(option: SendNetworkOption): boolean {
  return !!option.disabled;
}

function NetworkItem({ option }: { option: SendNetworkOption }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-8">
        <img src={CHAIN_ID_TO_NETWORK_ICON[option.id as AnyChainId]} alt={option.name} className="size-20" />
        <span className="text-body-large">{option.name}</span>
      </div>
    </div>
  );
}
