import { t, Trans } from "@lingui/macro";
import { useState } from "react";
import { encodeFunctionData, getAddress, isAddress, zeroAddress, type Address, type Hex } from "viem";

import { ARBITRUM_SEPOLIA, getChainName, getExplorerUrl } from "config/chains";
import { getContract } from "config/contracts";
import { helperToast } from "lib/helperToast";
import { switchNetwork } from "lib/wallets";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import useWallet from "lib/wallets/useWallet";
import { abis } from "sdk/abis";

import Button from "components/Button/Button";

import { AddressInput, ERC20_ABI, getErrorMessage, TOPUP_TOKENS } from "./devSmartWalletShared";

async function getGasOverrides(chainId: number) {
  const publicClient = getPublicClientWithRpc(chainId);
  const block = await publicClient.getBlock({ blockTag: "latest" });
  const baseFee = block.baseFeePerGas ?? 0n;
  const maxFeePerGas = (baseFee * 3n) / 2n + 1n;
  return { maxFeePerGas, maxPriorityFeePerGas: 1n };
}

export function DevSmartWalletTopUpTab({
  providerSafeAddressInput,
  pushActivity,
}: {
  providerSafeAddressInput: string;
  pushActivity: (message: string) => void;
}) {
  const { account, active, chainId: walletChainId, walletClient } = useWallet();

  const [recipientInput, setRecipientInput] = useState("");
  const [tokenIndex, setTokenIndex] = useState(0);
  const [amountInput, setAmountInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [txHash, setTxHash] = useState<Hex | undefined>();

  const tokens = TOPUP_TOKENS[ARBITRUM_SEPOLIA];
  const selectedToken = tokens[tokenIndex] ?? tokens[0];
  const recipient = isAddress(recipientInput) ? getAddress(recipientInput) : undefined;
  const isOnTopUpNetwork = walletChainId === ARBITRUM_SEPOLIA;

  const formErrors: string[] = [];
  if (!recipientInput.trim()) {
    formErrors.push("Recipient address is required");
  } else if (!recipient) {
    formErrors.push("Recipient address is invalid");
  }
  if (!amountInput.trim()) {
    formErrors.push("Amount is required");
  } else {
    const parsed = Number(amountInput);
    if (Number.isNaN(parsed) || parsed <= 0) {
      formErrors.push("Amount must be a positive number");
    }
  }

  function parseAmount(): bigint {
    return BigInt(Math.round(Number(amountInput) * 10 ** selectedToken.decimals));
  }

  async function handleApprove() {
    if (!account || !active || !walletClient || selectedToken.isNative) return;

    setIsApproving(true);
    setError(undefined);

    try {
      const routerAddress = getContract(ARBITRUM_SEPOLIA, "MultichainTransferRouter") as Address;
      const amount = parseAmount();
      const gasOverrides = await getGasOverrides(ARBITRUM_SEPOLIA);

      const hash = await walletClient.sendTransaction({
        account,
        to: selectedToken.address,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [routerAddress, amount],
        }),
        ...gasOverrides,
      });

      helperToast.info(t`Approval submitted. Waiting for confirmation...`);
      const publicClient = getPublicClientWithRpc(ARBITRUM_SEPOLIA);
      await publicClient.waitForTransactionReceipt({ hash });
      helperToast.success(t`Token approved`);
      pushActivity(`Approved ${selectedToken.symbol} for MultichainTransferRouter`);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      helperToast.error(t`Approval failed: ${message}`);
    } finally {
      setIsApproving(false);
    }
  }

  async function handleSubmit() {
    if (!account || !active || !walletClient || !recipient || formErrors.length > 0) return;

    setIsSubmitting(true);
    setError(undefined);
    setTxHash(undefined);

    try {
      const routerAddress = getContract(ARBITRUM_SEPOLIA, "MultichainTransferRouter") as Address;
      const vaultAddress = getContract(ARBITRUM_SEPOLIA, "MultichainVault") as Address;
      const amount = parseAmount();
      const gasOverrides = await getGasOverrides(ARBITRUM_SEPOLIA);

      let hash: Hex;

      if (selectedToken.isNative) {
        const wrappedAddress = "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73" as Address;

        const encodedCalls = [
          encodeFunctionData({
            abi: abis.MultichainTransferRouter,
            functionName: "sendWnt",
            args: [vaultAddress, amount],
          }),
          encodeFunctionData({
            abi: abis.MultichainTransferRouter,
            functionName: "bridgeIn",
            args: [recipient, wrappedAddress],
          }),
        ];

        hash = await walletClient.sendTransaction({
          account,
          to: routerAddress,
          data: encodeFunctionData({
            abi: abis.MultichainTransferRouter,
            functionName: "multicall",
            args: [encodedCalls],
          }),
          value: amount,
          ...gasOverrides,
        });
      } else {
        const encodedCalls = [
          encodeFunctionData({
            abi: abis.MultichainTransferRouter,
            functionName: "sendTokens",
            args: [selectedToken.address, vaultAddress, amount],
          }),
          encodeFunctionData({
            abi: abis.MultichainTransferRouter,
            functionName: "bridgeIn",
            args: [recipient, selectedToken.address],
          }),
        ];

        hash = await walletClient.sendTransaction({
          account,
          to: routerAddress,
          data: encodeFunctionData({
            abi: abis.MultichainTransferRouter,
            functionName: "multicall",
            args: [encodedCalls],
          }),
          ...gasOverrides,
        });
      }

      setTxHash(hash);
      helperToast.info(t`Top-up submitted. Waiting for confirmation...`);

      const publicClient = getPublicClientWithRpc(ARBITRUM_SEPOLIA);
      await publicClient.waitForTransactionReceipt({ hash });

      helperToast.success(t`Top-up confirmed`);
      pushActivity(
        `Topped up ${recipient} with ${amountInput} ${selectedToken.symbol} on ${getChainName(ARBITRUM_SEPOLIA)}`
      );
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      helperToast.error(t`Top-up failed: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-8 border-1/2 border-slate-600 bg-slate-950/50 p-16">
      <h2 className="text-18 font-medium">
        <Trans>Top Up Multichain Account (Same-Chain Deposit)</Trans>
      </h2>
      <p className="mt-8 text-13 text-typography-secondary">
        <Trans>
          Credit tokens to any account's multichain balance via <code>bridgeIn</code>. The connected wallet pays; the
          recipient's multichain balance is credited. Runs on Arbitrum Sepolia.
        </Trans>
      </p>

      <div className="mt-16 grid gap-16">
        <AddressInput
          id="topUpRecipient"
          label={t`Recipient account (who receives the multichain balance)`}
          value={recipientInput}
          onChange={setRecipientInput}
        />

        <div className="flex flex-wrap gap-8">
          <Button
            variant="secondary"
            onClick={() => {
              if (providerSafeAddressInput.trim()) setRecipientInput(providerSafeAddressInput.trim());
            }}
            disabled={!providerSafeAddressInput.trim()}
          >
            <Trans>Use provider Safe address</Trans>
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              if (account) setRecipientInput(account);
            }}
            disabled={!account}
          >
            <Trans>Use own address</Trans>
          </Button>
        </div>

        <div>
          <label className="mb-6 block text-13 font-medium text-typography-primary" htmlFor="topUpToken">
            <Trans>Token</Trans>
          </label>
          <select
            id="topUpToken"
            value={tokenIndex}
            onChange={(e) => setTokenIndex(Number(e.target.value))}
            className="w-full rounded-8 border border-slate-800 bg-slate-800 px-12 py-10 text-14 outline-none focus:border-blue-400"
          >
            {tokens.map((token, idx) => (
              <option key={token.address} value={idx}>
                {token.symbol} ({token.address === zeroAddress ? "native" : token.address})
              </option>
            ))}
          </select>
          <div className="mt-6 text-12 text-typography-secondary">
            {selectedToken.isNative
              ? t`Native ETH — will be wrapped and credited via sendWnt + bridgeIn`
              : t`ERC-20 — approve the router first, then sendTokens + bridgeIn`}
          </div>
        </div>

        <div>
          <label className="mb-6 block text-13 font-medium text-typography-primary" htmlFor="topUpAmount">
            <Trans>Amount (human-readable)</Trans>
          </label>
          <input
            id="topUpAmount"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            placeholder={`e.g. 0.01 (${selectedToken.decimals} decimals)`}
            className="w-full rounded-8 border border-slate-800 bg-slate-800 px-12 py-10 text-14 outline-none focus:border-blue-400"
          />
        </div>

        {formErrors.length > 0 && (
          <div className="text-yellow-200 rounded-8 border border-yellow-500/40 bg-yellow-500/10 p-12 text-13">
            {formErrors[0]}
          </div>
        )}

        {error && (
          <div className="text-red-200 rounded-8 border border-red-500/40 bg-red-500/10 p-12 text-13">{error}</div>
        )}

        <div className="flex flex-wrap gap-8">
          {!selectedToken.isNative && (
            <Button
              variant="secondary"
              onClick={handleApprove}
              disabled={!active || !walletClient || !isOnTopUpNetwork || isApproving || formErrors.length > 0}
            >
              {isApproving ? t`Approving...` : t`Approve ${selectedToken.symbol}`}
            </Button>
          )}
          <Button
            variant="primary-action"
            onClick={handleSubmit}
            disabled={!active || !walletClient || !isOnTopUpNetwork || isSubmitting || formErrors.length > 0}
          >
            {isSubmitting ? t`Sending...` : t`Top Up Account`}
          </Button>
          {!isOnTopUpNetwork && (
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await switchNetwork(ARBITRUM_SEPOLIA, Boolean(active));
                } catch (err) {
                  helperToast.error(t`Failed to switch network: ${getErrorMessage(err)}`);
                }
              }}
            >
              <Trans>Switch to Arbitrum Sepolia</Trans>
            </Button>
          )}
        </div>

        {txHash && (
          <div className="mt-8 text-13">
            <div className="text-typography-secondary">
              <Trans>Transaction hash</Trans>
            </div>
            <a
              href={`${getExplorerUrl(ARBITRUM_SEPOLIA)}tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-blue-400 underline"
            >
              {txHash}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
