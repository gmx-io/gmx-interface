import { t, Trans } from "@lingui/macro";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { type Address, decodeEventLog, encodeFunctionData, getAddress, type Hex, isAddress, zeroAddress } from "viem";

import { getChainName, getExplorerUrl } from "config/chains";
import { helperToast } from "lib/helperToast";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import useWallet from "lib/wallets/useWallet";

import Button from "components/Button/Button";

import {
  AddressInput,
  DEPLOY_SAFE_DEFAULTS_BY_CHAIN,
  DEPLOY_SUPPORTED_CHAINS,
  type DeploySupportedChainId,
  getErrorMessage,
  parseOwnersInput,
  SAFE_ABI,
  SAFE_PROXY_FACTORY_ABI,
} from "./devSmartWalletShared";

export function DevSmartWalletDeployTab({
  deployChainId,
  setDeployChainId,
  ownersInput,
  setOwnersInput,
  pushActivity,
  upsertSavedWalletProfile,
  onSafeCreated,
}: {
  deployChainId: DeploySupportedChainId;
  setDeployChainId: (chainId: DeploySupportedChainId) => void;
  ownersInput: string;
  setOwnersInput: (value: string) => void;
  pushActivity: (message: string) => void;
  upsertSavedWalletProfile: (input: {
    safeAddress: Address;
    chainId: DeploySupportedChainId;
    owners: Address[];
  }) => void;
  onSafeCreated: (address: Address, chainId: DeploySupportedChainId) => void;
}) {
  const { account, active, chainId: walletChainId, walletClient } = useWallet();

  const [thresholdInput, setThresholdInput] = useState("1");
  const [saltNonceInput, setSaltNonceInput] = useState(() => String(Date.now()));
  const [proxyFactoryAddress, setProxyFactoryAddress] = useState<string>(
    DEPLOY_SAFE_DEFAULTS_BY_CHAIN[deployChainId].proxyFactoryAddress
  );
  const [singletonAddress, setSingletonAddress] = useState<string>(
    DEPLOY_SAFE_DEFAULTS_BY_CHAIN[deployChainId].singletonAddress
  );
  const [fallbackHandlerAddress, setFallbackHandlerAddress] = useState<string>(
    DEPLOY_SAFE_DEFAULTS_BY_CHAIN[deployChainId].fallbackHandlerAddress
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [txHash, setTxHash] = useState<Hex | undefined>();
  const [safeAddress, setSafeAddress] = useState<Address | undefined>();
  const [lastDeploymentChainId, setLastDeploymentChainId] = useState<DeploySupportedChainId | undefined>();

  const ownersState = useMemo(() => parseOwnersInput(ownersInput), [ownersInput]);
  const threshold = Number(thresholdInput);
  const isThresholdInteger = Number.isInteger(threshold);
  const isOnDeployNetwork = walletChainId === deployChainId;
  const lastDeploymentExplorerUrl = getExplorerUrl(lastDeploymentChainId ?? deployChainId);

  useEffect(() => {
    if (account && ownersInput.trim() === "") {
      setOwnersInput(account);
    }
  }, [account, ownersInput, setOwnersInput]);

  useEffect(() => {
    const defaults = DEPLOY_SAFE_DEFAULTS_BY_CHAIN[deployChainId];
    setProxyFactoryAddress(defaults.proxyFactoryAddress);
    setSingletonAddress(defaults.singletonAddress);
    setFallbackHandlerAddress(defaults.fallbackHandlerAddress);
  }, [deployChainId]);

  const formErrors: string[] = [];
  if (ownersState.owners.length === 0) formErrors.push("At least one owner is required");
  if (ownersState.invalidOwners.length > 0) formErrors.push(`Invalid owner address: ${ownersState.invalidOwners[0]}`);
  if (ownersState.hasDuplicates) formErrors.push("Duplicate owner addresses are not allowed");
  if (!isThresholdInteger || threshold < 1) formErrors.push("Threshold must be a positive integer");
  else if (threshold > ownersState.owners.length) formErrors.push("Threshold cannot exceed owner count");
  if (!saltNonceInput.trim()) {
    formErrors.push("Salt nonce is required");
  } else {
    try {
      BigInt(saltNonceInput.trim());
    } catch {
      formErrors.push("Salt nonce must be a valid integer (decimal or 0x-prefixed hex)");
    }
  }
  if (!isAddress(proxyFactoryAddress)) formErrors.push("Proxy factory address is invalid");
  if (!isAddress(singletonAddress)) formErrors.push("Safe singleton address is invalid");
  if (!isAddress(fallbackHandlerAddress)) formErrors.push("Fallback handler address is invalid");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(undefined);
    setTxHash(undefined);
    setSafeAddress(undefined);
    setLastDeploymentChainId(undefined);

    if (!account || !active) {
      const message = t`Connect a wallet first`;
      setSubmitError(message);
      helperToast.error(message);
      return;
    }
    if (!walletClient) {
      const message = t`Wallet client unavailable. Reconnect wallet and retry`;
      setSubmitError(message);
      helperToast.error(message);
      return;
    }
    if (!isOnDeployNetwork) {
      const message = t`Switch wallet to selected deploy chain`;
      setSubmitError(message);
      helperToast.error(message);
      return;
    }
    if (formErrors.length > 0) {
      setSubmitError(formErrors[0]);
      helperToast.error(formErrors[0]);
      return;
    }

    setIsSubmitting(true);

    try {
      const normalizedProxyFactory = getAddress(proxyFactoryAddress);
      const normalizedSingleton = getAddress(singletonAddress);
      const normalizedFallbackHandler = getAddress(fallbackHandlerAddress);
      const saltNonce = BigInt(saltNonceInput.trim());

      const initializer = encodeFunctionData({
        abi: SAFE_ABI,
        functionName: "setup",
        args: [
          ownersState.owners,
          BigInt(threshold),
          zeroAddress,
          "0x",
          normalizedFallbackHandler,
          zeroAddress,
          0n,
          zeroAddress,
        ],
      });

      const data = encodeFunctionData({
        abi: SAFE_PROXY_FACTORY_ABI,
        functionName: "createProxyWithNonce",
        args: [normalizedSingleton, initializer, saltNonce],
      });

      const hash = await walletClient.sendTransaction({
        account,
        to: normalizedProxyFactory,
        data,
      });

      setTxHash(hash);
      setLastDeploymentChainId(deployChainId);
      helperToast.info(t`Transaction submitted. Waiting for confirmation...`);

      const publicClient = getPublicClientWithRpc(deployChainId);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: SAFE_PROXY_FACTORY_ABI,
            data: log.data,
            topics: log.topics,
          });

          if (decoded.eventName === "ProxyCreation") {
            const proxy = decoded.args.proxy as Address;
            const normalizedProxy = getAddress(proxy);
            setSafeAddress(normalizedProxy);
            upsertSavedWalletProfile({
              safeAddress: normalizedProxy,
              chainId: deployChainId,
              owners: ownersState.owners,
            });
            onSafeCreated(normalizedProxy, deployChainId);
            pushActivity(`Created Safe ${normalizedProxy} on ${getChainName(deployChainId)}`);
            break;
          }
        } catch {
          continue;
        }
      }

      helperToast.success(t`Safe wallet created`);
    } catch (error) {
      const message = getErrorMessage(error);
      setSubmitError(message);
      helperToast.error(t`Safe creation failed: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="rounded-8 border-1/2 border-slate-600 bg-slate-950/50 p-16">
        <h2 className="text-18 font-medium">
          <Trans>Deploy Safe</Trans>
        </h2>

        <div className="mt-16 grid gap-16">
          <div>
            <label className="mb-6 block text-13 font-medium text-typography-primary" htmlFor="deployChain">
              <Trans>Deploy chain</Trans>
            </label>
            <select
              id="deployChain"
              value={deployChainId}
              onChange={(e) => setDeployChainId(Number(e.target.value) as DeploySupportedChainId)}
              className="w-full rounded-8 border border-slate-800 bg-slate-800 px-12 py-10 text-14 outline-none focus:border-blue-400"
            >
              {DEPLOY_SUPPORTED_CHAINS.map((chainId) => (
                <option key={chainId} value={chainId}>
                  {getChainName(chainId)} ({chainId})
                </option>
              ))}
            </select>
            <div className="mt-6 text-12 text-typography-secondary">
              <Trans>Switch owner wallet to this chain before submitting.</Trans>
            </div>
          </div>

          <div>
            <label className="mb-6 block text-13 font-medium text-typography-primary" htmlFor="owners">
              <Trans>Owners</Trans>
            </label>
            <textarea
              id="owners"
              value={ownersInput}
              onChange={(e) => setOwnersInput(e.target.value)}
              rows={4}
              placeholder="0xabc... (comma / space / newline separated)"
              className="w-full rounded-8 border border-slate-800 bg-slate-800 px-12 py-10 text-14 outline-none focus:border-blue-400"
            />
            <div className="mt-6 text-12 text-typography-secondary">
              <Trans>Parsed owners</Trans>: {ownersState.owners.length}
              {ownersState.rawOwnersCount !== ownersState.owners.length && ownersState.invalidOwners.length > 0
                ? ` • ${ownersState.invalidOwners.length} invalid`
                : ""}
            </div>
          </div>

          <div className="grid gap-16 md:grid-cols-2">
            <div>
              <label className="mb-6 block text-13 font-medium text-typography-primary" htmlFor="threshold">
                <Trans>Threshold</Trans>
              </label>
              <input
                id="threshold"
                type="number"
                min={1}
                step={1}
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                className="w-full rounded-8 border border-slate-800 bg-slate-800 px-12 py-10 text-14 outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="mb-6 block text-13 font-medium text-typography-primary" htmlFor="saltNonce">
                <Trans>Salt nonce</Trans>
              </label>
              <input
                id="saltNonce"
                value={saltNonceInput}
                onChange={(e) => setSaltNonceInput(e.target.value)}
                placeholder="e.g. 1 or 0x1234"
                className="w-full rounded-8 border border-slate-800 bg-slate-800 px-12 py-10 text-14 outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <div className="grid gap-16">
            <AddressInput
              id="proxyFactory"
              label={t`Safe Proxy Factory`}
              value={proxyFactoryAddress}
              onChange={setProxyFactoryAddress}
            />
            <AddressInput
              id="singleton"
              label={t`Safe Singleton (SafeL2)`}
              value={singletonAddress}
              onChange={setSingletonAddress}
            />
            <AddressInput
              id="fallbackHandler"
              label={t`Compatibility Fallback Handler`}
              value={fallbackHandlerAddress}
              onChange={setFallbackHandlerAddress}
            />
          </div>

          {formErrors.length > 0 && (
            <div className="text-red-200 rounded-8 border border-red-500/40 bg-red-500/10 p-12 text-13">
              {formErrors[0]}
            </div>
          )}

          {submitError && (
            <div className="text-red-200 rounded-8 border border-red-500/40 bg-red-500/10 p-12 text-13">
              {submitError}
            </div>
          )}

          <div className="flex flex-wrap gap-8">
            <Button
              variant="primary-action"
              type="submit"
              disabled={!active || !walletClient || !isOnDeployNetwork || isSubmitting || formErrors.length > 0}
            >
              {isSubmitting ? t`Creating Safe...` : t`Create Safe on selected chain`}
            </Button>
          </div>
        </div>
      </form>

      {(txHash || safeAddress) && (
        <div className="rounded-8 border-1/2 border-slate-600 bg-slate-950/50 p-16">
          <h2 className="text-18 font-medium">
            <Trans>Last Deployment Result</Trans>
          </h2>

          {txHash && (
            <div className="mt-8 text-13">
              <div className="text-typography-secondary">
                <Trans>Transaction hash</Trans>
              </div>
              <a
                href={`${lastDeploymentExplorerUrl}tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-blue-400 underline"
              >
                {txHash}
              </a>
            </div>
          )}

          {safeAddress && (
            <div className="mt-12 text-13">
              <div className="text-typography-secondary">
                <Trans>Created Safe address</Trans>
              </div>
              <a
                href={`${lastDeploymentExplorerUrl}address/${safeAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-blue-400 underline"
              >
                {safeAddress}
              </a>
            </div>
          )}
        </div>
      )}
    </>
  );
}
