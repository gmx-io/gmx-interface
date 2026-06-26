import { Trans, t } from "@lingui/macro";
import { ReactNode, useCallback, useMemo, useState } from "react";
import { Address, encodeFunctionData, isAddress } from "viem";

import {
  useGmxAccountModalOpen,
  useGmxAccountSettlementChainId,
} from "context/GmxAccountContext/hooks";
import { getBalanceByBalanceType, useTokensDataRequest } from "domain/synthetics/tokens";
import { convertToUsd, TokenBalanceType, TokenData } from "domain/tokens";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { formatAmountFree, formatUsd, parseValue } from "lib/numbers";
import { getByKey } from "lib/objects";
import { TxnEventName } from "lib/transactions";
import { sendWalletTransaction } from "lib/transactions/sendWalletTransaction";
import useWallet from "lib/wallets/useWallet";
import { abis } from "sdk/abis";
import { getMidPrice } from "sdk/utils/tokens";

import { Amount } from "components/Amount/Amount";
import Button from "components/Button/Button";
import { DropdownSelector } from "components/DropdownSelector/DropdownSelector";
import NumberInput from "components/NumberInput/NumberInput";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

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

export function WalletSendView() {
  const { chainId } = useChainId();
  const { account } = useWallet();
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  const [, setSettlementChainId] = useGmxAccountSettlementChainId();

  const { tokensData } = useTokensDataRequest(chainId);

  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string | undefined>(undefined);
  const [recipient, setRecipient] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tokenOptions = useMemo(() => getWalletTokenOptions(tokensData), [tokensData]);

  const selectedToken = getByKey(tokensData, selectedTokenAddress);
  const walletBalance = getBalanceByBalanceType(selectedToken, TokenBalanceType.Wallet);

  const amount =
    selectedToken && inputValue !== "" ? parseValue(inputValue, selectedToken.decimals) ?? undefined : undefined;
  const amountUsd = selectedToken ? convertToUsd(amount, selectedToken.decimals, selectedToken.prices?.maxPrice) : undefined;

  const walletBalanceUsd =
    selectedToken && walletBalance !== undefined
      ? convertToUsd(walletBalance, selectedToken.decimals, selectedToken.prices?.maxPrice)
      : undefined;
  const nextWalletBalanceUsd =
    walletBalanceUsd !== undefined && amountUsd !== undefined ? walletBalanceUsd - amountUsd : undefined;

  const isRecipientValid = isAddress(recipient);
  const isInputEmpty = amount === undefined || amount <= 0n;
  const isInsufficientBalance = walletBalance !== undefined && amount !== undefined && amount > walletBalance;

  const handleMaxClick = useCallback(() => {
    if (selectedToken && walletBalance !== undefined) {
      setInputValue(formatAmountFree(walletBalance, selectedToken.decimals, selectedToken.decimals));
    }
  }, [selectedToken, walletBalance]);

  const handleSend = useCallback(async () => {
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

        await sendWalletTransaction({
          chainId,
          signer,
          to,
          callData,
          value,
          callback: (txnEvent) => {
            if (txnEvent.event === TxnEventName.Sent) {
              helperToast.success(t`Sent`);
              setIsVisibleOrView("main");
              setIsSubmitting(false);
            } else if (txnEvent.event === TxnEventName.Error) {
              helperToast.error(t`Send failed`);
              setIsSubmitting(false);
            }
          },
        });
      });
    } catch (error) {
      helperToast.error(t`Send failed`);
    } finally {
      setIsSubmitting(false);
    }
  }, [account, amount, chainId, recipient, selectedToken, setIsVisibleOrView, setSettlementChainId]);

  let buttonState: { text: ReactNode; disabled?: boolean; onClick?: () => void } = {
    text: t`Send`,
    onClick: handleSend,
  };

  if (isSubmitting) {
    buttonState = { text: t`Sending...`, disabled: true };
  } else if (selectedToken === undefined) {
    buttonState = { text: t`Select token`, disabled: true };
  } else if (recipient === "") {
    buttonState = { text: t`Enter recipient address`, disabled: true };
  } else if (!isRecipientValid) {
    buttonState = { text: t`Invalid recipient address`, disabled: true };
  } else if (isInputEmpty) {
    buttonState = { text: t`Enter amount`, disabled: true };
  } else if (isInsufficientBalance) {
    buttonState = { text: t`Insufficient balance`, disabled: true };
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
                       outline-none focus-within:border-blue-300 hover:bg-fill-surfaceElevatedHover"
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
              {selectedToken !== undefined && walletBalance !== undefined && walletBalance > 0n && (
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

      <div className="h-32 shrink-0 grow" />

      {selectedTokenAddress && (
        <div className="mb-16 flex flex-col gap-10">
          <SyntheticsInfoRow label={<Trans>Estimated time</Trans>} value={<Trans>Instant</Trans>} />
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
