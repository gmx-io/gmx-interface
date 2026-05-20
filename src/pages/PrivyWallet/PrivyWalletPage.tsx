import { Trans } from "@lingui/macro";
import { useExportWallet, useSendTransaction, useWallets } from "@privy-io/react-auth";
import { ChangeEvent, FormEvent, useCallback, useMemo, useState } from "react";
import { isAddress, parseEther } from "viem";
import { useAccount } from "wagmi";

import { useDisconnectAndClose } from "domain/multichain/useDisconnectAndClose";
import { useConnectModal } from "lib/wallets/useConnectModal";

import Button from "components/Button/Button";
import ConnectWalletButton from "components/ConnectWalletButton/ConnectWalletButton";
import Modal from "components/Modal/Modal";
import NumberInput from "components/NumberInput/NumberInput";

import "./PrivyWalletPage.css";

function isPrivyEmbeddedWallet(walletClientType: string) {
  return walletClientType === "privy" || walletClientType === "privy-v2";
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
  const [withdrawStatus, setWithdrawStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [withdrawMessage, setWithdrawMessage] = useState("");
  const [exportStatus, setExportStatus] = useState<"idle" | "pending" | "error">("idle");
  const [exportMessage, setExportMessage] = useState("");
  const [isDisconnecting, setIsDisconnecting] = useState(false);

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

      const recipient = withdrawAddress.trim();

      if (!isAddress(recipient, { strict: false })) {
        setWithdrawStatus("error");
        setWithdrawMessage("Enter a valid recipient wallet address.");
        return;
      }

      let value: bigint;
      try {
        value = parseEther(withdrawAmount);
      } catch {
        setWithdrawStatus("error");
        setWithdrawMessage("Enter a valid native token amount.");
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
        const { hash } = await sendTransaction(
          {
            to: recipient,
            value,
            chainId,
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
    [chainId, currentPrivyWallet, sendTransaction, withdrawAddress, withdrawAmount]
  );

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

          <label className="PrivyWalletPage-row">
            <span className="PrivyWalletPage-label">
              <Trans>Native amount</Trans>
            </span>
            <NumberInput
              className="PrivyWalletPage-input text-input"
              value={withdrawAmount}
              onValueChange={(event) => setWithdrawAmount(event.target.value)}
              placeholder="0.0"
            />
          </label>

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
