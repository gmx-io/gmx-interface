import { t, Trans } from "@lingui/macro";
import { useExportWallet, useSendTransaction, useWallets } from "@privy-io/react-auth";
import { ChangeEvent, FormEvent, useCallback, useMemo, useState } from "react";
import { encodeFunctionData, isAddress, parseUnits, type Address } from "viem";
import { arbitrum } from "viem/chains";
import { useAccount, useBalance } from "wagmi";

import { useDisconnectAndClose } from "domain/multichain/useDisconnectAndClose";
import type { Token } from "domain/tokens";
import { formatBalanceAmount } from "lib/numbers";
import { useConnectModal } from "lib/wallets/useConnectModal";
import { getTokens, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import Button from "components/Button/Button";
import ConnectWalletButton from "components/ConnectWalletButton/ConnectWalletButton";
import Modal from "components/Modal/Modal";
import NumberInput from "components/NumberInput/NumberInput";
import TokenSelector from "components/TokenSelector/TokenSelector";
import { TradeInputBox } from "components/TradeboxMarginFields/TradeInputBox";

import WalletIcon from "img/ic_wallet.svg?react";

import "./PrivyWalletPage.css";

const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

function isPrivyEmbeddedWallet(walletClientType: string) {
  return walletClientType === "privy" || walletClientType === "privy-v2";
}

function getTransferableTokens(chainId: number) {
  try {
    return getTokens(chainId).filter((token) => !token.isSynthetic && !token.isTempHidden);
  } catch {
    return [];
  }
}

export function PrivyWalletPage() {
  const { address: account, chainId, isConnected } = useAccount();
  const { openConnectModal, connectModalOpen } = useConnectModal();
  const { wallets } = useWallets();
  const { exportWallet } = useExportWallet();
  const { sendTransaction } = useSendTransaction();
  const disconnectAndClose = useDisconnectAndClose();

  const [isWithdrawModalVisible, setIsWithdrawModalVisible] = useState(false);
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawTokenAddress, setWithdrawTokenAddress] = useState<string>(NATIVE_TOKEN_ADDRESS);
  const [withdrawStatus, setWithdrawStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [withdrawMessage, setWithdrawMessage] = useState("");
  const [exportStatus, setExportStatus] = useState<"idle" | "pending" | "error">("idle");
  const [exportMessage, setExportMessage] = useState("");
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const transferChainId = chainId ?? arbitrum.id;
  const transferableTokens = useMemo(() => getTransferableTokens(transferChainId), [transferChainId]);
  const selectedWithdrawToken = useMemo(
    () =>
      transferableTokens.find((token) => token.address === withdrawTokenAddress) ??
      transferableTokens.find((token) => token.address === NATIVE_TOKEN_ADDRESS) ??
      transferableTokens[0],
    [transferableTokens, withdrawTokenAddress]
  );

  const { data: selectedTokenBalance } = useBalance({
    address: account,
    chainId: transferChainId,
    token:
      selectedWithdrawToken && selectedWithdrawToken.address !== NATIVE_TOKEN_ADDRESS
        ? (selectedWithdrawToken.address as Address)
        : undefined,
    query: {
      enabled: Boolean(account && selectedWithdrawToken),
    },
  });

  const currentPrivyWallet = useMemo(() => {
    if (!account) {
      return undefined;
    }

    return wallets.find(
      (wallet) =>
        wallet.address.toLowerCase() === account.toLowerCase() && isPrivyEmbeddedWallet(wallet.walletClientType)
    );
  }, [account, wallets]);

  const canUseEmbeddedWallet = Boolean(currentPrivyWallet);

  const handleExportWallet = useCallback(async () => {
    if (!currentPrivyWallet) {
      setExportStatus("error");
      setExportMessage("Private key export is available only for the active Privy embedded wallet.");
      return;
    }

    try {
      setExportStatus("pending");
      setExportMessage("");
      await exportWallet({ address: currentPrivyWallet.address });
      setExportStatus("idle");
    } catch (error) {
      setExportStatus("error");
      setExportMessage(error instanceof Error ? error.message : "Failed to open private key export.");
    }
  }, [currentPrivyWallet, exportWallet]);

  const handleDisconnect = useCallback(async () => {
    setIsDisconnecting(true);

    try {
      await disconnectAndClose();
      setIsWithdrawModalVisible(false);
    } finally {
      setIsDisconnecting(false);
    }
  }, [disconnectAndClose]);

  const handleWithdraw = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      if (!currentPrivyWallet) {
        setWithdrawStatus("error");
        setWithdrawMessage("Withdraw is available only for the active Privy embedded wallet.");
        return;
      }

      if (!selectedWithdrawToken) {
        setWithdrawStatus("error");
        setWithdrawMessage("Select a token to withdraw.");
        return;
      }

      const recipient = withdrawAddress.trim();

      if (!isAddress(recipient, { strict: false })) {
        setWithdrawStatus("error");
        setWithdrawMessage("Enter a valid recipient wallet address.");
        return;
      }

      let value: bigint;
      try {
        value = parseUnits(withdrawAmount, selectedWithdrawToken.decimals);
      } catch {
        setWithdrawStatus("error");
        setWithdrawMessage("Enter a valid token amount.");
        return;
      }

      if (value <= 0n) {
        setWithdrawStatus("error");
        setWithdrawMessage("Enter an amount greater than zero.");
        return;
      }

      try {
        setWithdrawStatus("pending");
        setWithdrawMessage("");
        const isNativeTransfer = selectedWithdrawToken.address === NATIVE_TOKEN_ADDRESS;
        const { hash } = await sendTransaction(
          isNativeTransfer
            ? {
                to: recipient,
                value,
                chainId: transferChainId,
              }
            : {
                to: selectedWithdrawToken.address,
                data: encodeFunctionData({
                  abi: ERC20_TRANSFER_ABI,
                  functionName: "transfer",
                  args: [recipient, value],
                }),
                chainId: transferChainId,
              },
          { address: currentPrivyWallet.address }
        );

        setWithdrawStatus("success");
        setWithdrawMessage(`Transfer submitted: ${hash}`);
        setWithdrawAddress("");
        setWithdrawAmount("");
      } catch (error) {
        setWithdrawStatus("error");
        setWithdrawMessage(error instanceof Error ? error.message : "Failed to submit transfer.");
      }
    },
    [currentPrivyWallet, selectedWithdrawToken, sendTransaction, transferChainId, withdrawAddress, withdrawAmount]
  );

  const handleMaxWithdrawClick = useCallback(() => {
    if (!selectedTokenBalance || !selectedWithdrawToken) {
      return;
    }

    setWithdrawAmount(selectedTokenBalance.formatted);
  }, [selectedTokenBalance, selectedWithdrawToken]);

  return (
    <div className="PrivyWalletPage">
      <div className="PrivyWalletPage-panel p-20">
        <div className="mb-20 flex items-center justify-between gap-16 max-sm:flex-col max-sm:items-start">
          <h1 className="m-0 text-20 font-medium text-typography-primary">
            <Trans>Privy Wallet</Trans>
          </h1>

          {!isConnected ? (
            <ConnectWalletButton onClick={openConnectModal}>
              {connectModalOpen ? <Trans>Connecting...</Trans> : <Trans>Connect Wallet</Trans>}
            </ConnectWalletButton>
          ) : (
            <div className="flex gap-8 max-sm:w-full max-sm:flex-col">
              <Button variant="secondary" size="medium" onClick={handleExportWallet} disabled={!canUseEmbeddedWallet}>
                {exportStatus === "pending" ? <Trans>Opening...</Trans> : <Trans>Private Key</Trans>}
              </Button>
              <Button
                variant="primary"
                size="medium"
                onClick={() => setIsWithdrawModalVisible(true)}
                disabled={!canUseEmbeddedWallet}
              >
                <Trans>Withdraw</Trans>
              </Button>
              <Button variant="secondary" size="medium" onClick={handleDisconnect} disabled={isDisconnecting}>
                {isDisconnecting ? <Trans>Disconnecting...</Trans> : <Trans>Disconnect</Trans>}
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-16">
          <div className="PrivyWalletPage-row">
            <div className="PrivyWalletPage-label">
              <Trans>Current account</Trans>
            </div>
            <div className="PrivyWalletPage-value">{account ?? <Trans>Not connected</Trans>}</div>
          </div>

          {isConnected && (
            <div className="PrivyWalletPage-row">
              <div className="PrivyWalletPage-label">
                <Trans>Wallet type</Trans>
              </div>
              <div className="PrivyWalletPage-value">
                {currentPrivyWallet ? currentPrivyWallet.walletClientType : <Trans>External wallet</Trans>}
              </div>
            </div>
          )}

          {exportStatus === "error" && exportMessage && (
            <div className="PrivyWalletPage-status PrivyWalletPage-status-error">{exportMessage}</div>
          )}

          {isConnected && !canUseEmbeddedWallet && (
            <div className="PrivyWalletPage-status PrivyWalletPage-status-error">
              <Trans>Private key export and withdraw require the active Privy embedded wallet.</Trans>
            </div>
          )}
        </div>
      </div>

      <Modal
        isVisible={isWithdrawModalVisible}
        setIsVisible={setIsWithdrawModalVisible}
        label={<Trans>Withdraw</Trans>}
        contentClassName="md:min-w-[360px]"
      >
        <form className="flex flex-col gap-16" onSubmit={handleWithdraw}>
          <label className="PrivyWalletPage-row">
            <span className="PrivyWalletPage-label">
              <Trans>Recipient wallet address</Trans>
            </span>
            <input
              className="PrivyWalletPage-input text-input"
              value={withdrawAddress}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setWithdrawAddress(event.target.value)}
              placeholder="0x..."
            />
          </label>

          {selectedWithdrawToken && (
            <WithdrawAmountField
              chainId={transferChainId}
              inputValue={withdrawAmount}
              onInputValueChange={(event) => setWithdrawAmount(event.target.value)}
              onMaxClick={handleMaxWithdrawClick}
              onSelectToken={setWithdrawTokenAddress}
              selectedToken={selectedWithdrawToken}
              selectedTokenBalance={selectedTokenBalance?.value}
              tokens={transferableTokens}
            />
          )}

          {withdrawMessage && (
            <div
              className={
                withdrawStatus === "success"
                  ? "PrivyWalletPage-status PrivyWalletPage-status-success"
                  : "PrivyWalletPage-status PrivyWalletPage-status-error"
              }
            >
              {withdrawMessage}
            </div>
          )}

          <Button variant="primary" size="medium" type="submit" disabled={withdrawStatus === "pending"}>
            {withdrawStatus === "pending" ? <Trans>Submitting...</Trans> : <Trans>Transfer</Trans>}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

function WithdrawAmountField({
  chainId,
  inputValue,
  onInputValueChange,
  onMaxClick,
  onSelectToken,
  selectedToken,
  selectedTokenBalance,
  tokens,
}: {
  chainId: number;
  inputValue: string;
  onInputValueChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onMaxClick: () => void;
  onSelectToken: (tokenAddress: string) => void;
  selectedToken: Token;
  selectedTokenBalance?: bigint;
  tokens: Token[];
}) {
  const formattedBalance =
    selectedTokenBalance !== undefined
      ? formatBalanceAmount(selectedTokenBalance, selectedToken.decimals, "", { isStable: selectedToken.isStable })
      : undefined;

  const handleBalanceClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onMaxClick();
    },
    [onMaxClick]
  );

  return (
    <TradeInputBox
      leftHeadline={<Trans>Amount</Trans>}
      leftContent={
        <NumberInput
          value={inputValue}
          className="text-body-large h-24 w-full min-w-0 p-0 outline-none"
          onValueChange={onInputValueChange}
          placeholder="0.00"
          maxDecimals={selectedToken.decimals}
        />
      }
      rightHeadline={
        formattedBalance !== undefined ? (
          <button
            type="button"
            onClick={handleBalanceClick}
            className="flex items-center gap-4 text-12 text-typography-secondary hover:text-typography-primary"
          >
            <WalletIcon className="size-14" />
            <span className="numbers">{formattedBalance}</span>
          </button>
        ) : undefined
      }
      rightContent={
        <div data-token-selector>
          <TokenSelector
            label={t`Pay`}
            chainId={chainId}
            tokenAddress={selectedToken.address}
            onSelectToken={(token) => onSelectToken(token.address)}
            tokens={tokens}
            showSymbolImage={true}
            showTokenImgInDropdown={true}
            showBalances={false}
            qa="privy-withdraw-token-selector"
          />
        </div>
      }
    />
  );
}
