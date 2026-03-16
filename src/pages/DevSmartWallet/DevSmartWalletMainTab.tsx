import { t, Trans } from "@lingui/macro";
import { WalletKit } from "@reown/walletkit";
import Safe, { generateTypedData } from "@safe-global/protocol-kit";
import { Core } from "@walletconnect/core";
import { buildApprovedNamespaces, getSdkError } from "@walletconnect/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  concat,
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  hashTypedData,
  hexToString,
  isAddress,
  isHex,
  numberToHex,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";

import { ARBITRUM_SEPOLIA, getChainName } from "config/chains";
import { helperToast } from "lib/helperToast";
import { switchNetwork } from "lib/wallets";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import useWallet from "lib/wallets/useWallet";

import Button from "components/Button/Button";

import {
  AddressInput,
  asArrayParams,
  DEPLOY_SAFE_DEFAULTS_BY_CHAIN,
  DEPLOY_SUPPORTED_CHAINS,
  getErrorMessage,
  getNonEmptyErrorMessage,
  getSessionDeduplicationKey,
  isSameAddress,
  isStaleWcRequestError,
  parseBigIntLike,
  parseSessionChainId,
  parseWalletSwitchChainId,
  SAFE_ABI,
  SAFE_CONTRACT_NETWORKS,
  SAFE_PROXY_FACTORY_ABI,
  SAFE_TARGET_VERSION,
  SAFE_VERSION_ABI,
  summarizeSession,
  toEip155Chain,
  WC_PROJECT_ID,
  WC_SUPPORTED_EVENTS,
  WC_SUPPORTED_METHODS,
  type DeploySupportedChainId,
  type SavedSmartWalletProfile,
  type WalletConnectRequestEvent,
  type WalletKitSessionMap,
} from "./devSmartWalletShared";

// EIP-6492 magic suffix: keccak256("EIP-6492") truncated, used to identify wrapped signatures
const EIP_6492_MAGIC_SUFFIX =
  "0x6492649264926492649264926492649264926492649264926492649264926492" as Hex;

/**
 * Wraps a Safe signature in EIP-6492 format for counterfactual verification.
 * The verifier will deploy the Safe on-chain (counterfactually), then call isValidSignature.
 */
function wrapSignatureEip6492({
  innerSignature,
  owners,
  saltNonce,
  targetChainId,
}: {
  innerSignature: Hex;
  owners: Address[];
  saltNonce: string;
  targetChainId: DeploySupportedChainId;
}): Hex {
  const defaults = DEPLOY_SAFE_DEFAULTS_BY_CHAIN[targetChainId];

  const initializer = encodeFunctionData({
    abi: SAFE_ABI,
    functionName: "setup",
    args: [
      owners,
      1n, // threshold
      zeroAddress,
      "0x",
      defaults.fallbackHandlerAddress,
      zeroAddress,
      0n,
      zeroAddress,
    ],
  });

  const factoryCalldata = encodeFunctionData({
    abi: SAFE_PROXY_FACTORY_ABI,
    functionName: "createProxyWithNonce",
    args: [defaults.singletonAddress, initializer, BigInt(saltNonce)],
  });

  const wrapped = encodeAbiParameters(
    [
      { name: "factory", type: "address" },
      { name: "factoryCalldata", type: "bytes" },
      { name: "originalSignature", type: "bytes" },
    ],
    [defaults.proxyFactoryAddress, factoryCalldata, innerSignature]
  );

  return concat([wrapped, EIP_6492_MAGIC_SUFFIX]);
}

function normalizePersonalSignMessage(message: string) {
  if (isHex(message)) {
    try {
      return hexToString(message as Hex);
    } catch {
      return message;
    }
  }
  return message;
}

function extractSafeSignature(messageOrTx: { signatures: Map<string, { data: string }> }) {
  const firstSignature = Array.from(messageOrTx.signatures.values())[0];
  if (!firstSignature?.data) throw new Error("No Safe signature produced");
  return firstSignature.data;
}

function normalizeTypedDataSignatureV(signature: Hex): Hex {
  const v = Number.parseInt(signature.slice(-2), 16);
  if (v === 0 || v === 1) {
    const adjusted = (v + 27).toString(16).padStart(2, "0");
    return `${signature.slice(0, -2)}${adjusted}` as Hex;
  }
  return signature;
}

function parseTypedDataParam(params: unknown, safeAddress: Address) {
  const rawParams = asArrayParams(params);
  const safeAddressLower = safeAddress.toLowerCase();
  const typedDataParam = rawParams.find((item) => {
    if (typeof item === "string") return item.toLowerCase() !== safeAddressLower;
    return typeof item === "object" && item !== null;
  });
  if (typeof typedDataParam === "string") return JSON.parse(typedDataParam);
  if (typedDataParam && typeof typedDataParam === "object") return typedDataParam;
  throw new Error("Typed data payload missing");
}

function parsePersonalSignParams(params: unknown, safeAddress: Address) {
  const [first, second] = asArrayParams(params);
  if (typeof first !== "string" || typeof second !== "string") throw new Error("Invalid personal_sign params");
  return isSameAddress(first, safeAddress) ? second : first;
}

function isLikelyInvalidParamsError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("invalid params") ||
    normalized.includes("missing or invalid") ||
    normalized.includes("invalid parameters") ||
    normalized.includes("expected") ||
    normalized.includes("argument")
  );
}

export function DevSmartWalletMainTab({
  providerSafeAddressInput,
  setProviderSafeAddressInput,
  providerChainId,
  setProviderChainId,
  providerSafeAddress,
  savedWalletProfiles,
  upsertSavedWalletProfile,
  removeSavedWalletProfile,
  lastCreatedSafeAddress,
  lastCreatedSafeChainId,
  setValidatorSafeAddressInput,
  setDeployChainId,
  setOwnersInput,
  pushActivity,
  activityLog,
  onWalletKitStatusChange,
  onWalletKitInitErrorChange,
}: {
  providerSafeAddressInput: string;
  setProviderSafeAddressInput: (value: string) => void;
  providerChainId: DeploySupportedChainId;
  setProviderChainId: (chainId: DeploySupportedChainId) => void;
  providerSafeAddress: Address | undefined;
  savedWalletProfiles: SavedSmartWalletProfile[];
  upsertSavedWalletProfile: (input: {
    safeAddress: Address;
    chainId: DeploySupportedChainId;
    owners: Address[];
    saltNonce?: string;
  }) => void;
  removeSavedWalletProfile: (profile: SavedSmartWalletProfile) => void;
  lastCreatedSafeAddress: Address | undefined;
  lastCreatedSafeChainId: DeploySupportedChainId | undefined;
  setValidatorSafeAddressInput: (value: string) => void;
  setDeployChainId: (chainId: DeploySupportedChainId) => void;
  setOwnersInput: (value: string) => void;
  pushActivity: (message: string) => void;
  activityLog: string[];
  onWalletKitStatusChange: (status: string) => void;
  onWalletKitInitErrorChange: (error: string | undefined) => void;
}) {
  const { account, active, chainId: walletChainId, walletClient } = useWallet();

  const [pairUriInput, setPairUriInput] = useState("");
  const [isWalletKitReady, setIsWalletKitReady] = useState(false);
  const [isPairing, setIsPairing] = useState(false);
  const [sessionMap, setSessionMap] = useState<WalletKitSessionMap>({});

  const walletKitRef = useRef<InstanceType<typeof WalletKit> | null>(null);
  const protocolKitCacheRef = useRef<{ key: string; safeSdk: Safe } | null>(null);
  const wcInFlightRequestKeysRef = useRef<Set<string>>(new Set());
  const wcHandledRequestKeysRef = useRef<Map<string, number>>(new Map());
  const typedDataSignInFlightRef = useRef(false);
  const latestStateRef = useRef<{
    account?: Address;
    active: boolean;
    walletChainId?: number;
    walletClient: typeof walletClient;
    providerSafeAddress?: Address;
    providerChainId: DeploySupportedChainId;
  }>({
    account: undefined,
    active: false,
    walletChainId: undefined,
    walletClient: undefined,
    providerSafeAddress: undefined,
    providerChainId: ARBITRUM_SEPOLIA,
  });

  latestStateRef.current = {
    account: account as Address | undefined,
    active: Boolean(active),
    walletChainId,
    walletClient,
    providerSafeAddress,
    providerChainId,
  };

  const providerErrors = useMemo(() => {
    const errors: string[] = [];
    if (!providerSafeAddressInput.trim()) {
      errors.push("Set the Safe address that should be exposed via WalletConnect");
    } else if (!providerSafeAddress) {
      errors.push("Provider Safe address is invalid");
    }
    if (!active || !account) errors.push("Connect owner EOA in this browser");
    // Removed chain check to allow cross-chain signing (e.g. EIP-6492 testing)
    if (!walletClient) errors.push("Wallet client unavailable");
    return errors;
  }, [account, active, providerSafeAddress, providerSafeAddressInput, walletClient]);

  function refreshSessions() {
    const walletKit = walletKitRef.current;
    if (!walletKit) return;
    setSessionMap(walletKit.getActiveSessions() as WalletKitSessionMap);
  }

  async function pruneDuplicateSessions(keepTopic?: string) {
    const walletKit = walletKitRef.current;
    if (!walletKit) return;
    const sessions = walletKit.getActiveSessions() as WalletKitSessionMap;
    const topicsByKey = new Map<string, string[]>();
    for (const [topic, session] of Object.entries(sessions)) {
      const key = getSessionDeduplicationKey(session);
      const current = topicsByKey.get(key) ?? [];
      current.push(topic);
      topicsByKey.set(key, current);
    }
    const topicsToDisconnect: string[] = [];
    for (const topics of topicsByKey.values()) {
      if (topics.length < 2) continue;
      const topicToKeep = keepTopic && topics.includes(keepTopic) ? keepTopic : topics[topics.length - 1];
      for (const topic of topics) {
        if (topic !== topicToKeep) topicsToDisconnect.push(topic);
      }
    }
    if (topicsToDisconnect.length === 0) return;
    for (const topic of topicsToDisconnect) {
      try {
        await walletKit.disconnectSession({ topic, reason: getSdkError("USER_DISCONNECTED") });
        pushActivity(`Closed duplicate WC session: ${topic}`);
      } catch (error) {
        pushActivity(`Failed to close duplicate WC session ${topic}: ${getErrorMessage(error)}`);
      }
    }
    refreshSessions();
  }

  async function getSafeSdkOrThrow() {
    const {
      account: ownerAccount,
      walletClient: currentWalletClient,
      providerSafeAddress: safeAddr,
      providerChainId: currentProviderChainId,
    } = latestStateRef.current;

    if (!ownerAccount || !currentWalletClient) throw new Error("Owner wallet is not connected");
    if (!currentProviderChainId) throw new Error("Provider chain is not configured");
    if (!safeAddr) throw new Error("Set a valid Safe address for the WalletConnect provider");

    const cacheKey = `${ownerAccount}:${safeAddr}:${currentProviderChainId}`;
    if (protocolKitCacheRef.current?.key === cacheKey) return protocolKitCacheRef.current.safeSdk;

    const publicClient = getPublicClientWithRpc(currentProviderChainId);
    const detectedSafeVersion = (await publicClient.readContract({
      address: safeAddr,
      abi: SAFE_VERSION_ABI,
      functionName: "VERSION",
    })) as string;

    if (detectedSafeVersion !== SAFE_TARGET_VERSION) {
      throw new Error(
        `Unsupported Safe version ${detectedSafeVersion}. This dev wallet is pinned to Safe ${SAFE_TARGET_VERSION}.`
      );
    }

    // Hybrid EIP-1193 provider: reads go to the provider chain's public RPC,
    // signing goes to the owner's wallet (which may be on a different chain for EIP-6492)
    const signingMethods = new Set([
      "eth_signTypedData",
      "eth_signTypedData_v3",
      "eth_signTypedData_v4",
      "personal_sign",
      "eth_sign",
      "eth_sendTransaction",
    ]);

    const eip1193Provider = {
      request: async ({ method, params }: { method: string; params?: unknown[] | object }) => {
        if (signingMethods.has(method)) {
          return (currentWalletClient.request as any)({ method, params: (params as any) ?? [] });
        }
        // Route read RPCs to the provider chain
        return publicClient.request({ method: method as any, params: (params as any) ?? [] });
      },
    };

    const safeSdk = await Safe.init({
      provider: eip1193Provider as any,
      signer: ownerAccount,
      safeAddress: safeAddr,
      contractNetworks: SAFE_CONTRACT_NETWORKS as any,
    });

    const [isDeployed, threshold, owners] = await Promise.all([
      safeSdk.isSafeDeployed(),
      safeSdk.getThreshold(),
      safeSdk.getOwners(),
    ]);

    if (!isDeployed) throw new Error("Safe is not deployed");
    if (threshold !== 1) throw new Error(`MVP supports threshold=1 only (current threshold: ${threshold})`);
    if (!owners.some((owner) => isSameAddress(owner, ownerAccount)))
      throw new Error("Connected owner EOA is not an owner of the selected Safe");

    protocolKitCacheRef.current = { key: cacheKey, safeSdk };
    return safeSdk;
  }

  async function respondWcRequestSuccess(topic: string, id: number, result: unknown) {
    const walletKit = walletKitRef.current;
    if (!walletKit) return;
    await walletKit.respondSessionRequest({ topic, response: { id, jsonrpc: "2.0", result } as any });
  }

  async function respondWcRequestError(topic: string, id: number, code: number, message: string) {
    const walletKit = walletKitRef.current;
    if (!walletKit) return;
    const normalizedMessage = message?.trim() || "WalletConnect request failed";
    await walletKit.respondSessionRequest({
      topic,
      response: { id, jsonrpc: "2.0", error: { code, message: normalizedMessage } } as any,
    });
  }

  async function emitWcAccountAndChainChanged(topic: string, chainId?: DeploySupportedChainId) {
    const walletKit = walletKitRef.current;
    const safeAddr = latestStateRef.current.providerSafeAddress;
    const selectedChainId = chainId ?? latestStateRef.current.providerChainId;
    if (!walletKit || !safeAddr || !selectedChainId) return;
    await walletKit.emitSessionEvent({
      topic,
      chainId: toEip155Chain(selectedChainId),
      event: { name: "chainChanged", data: numberToHex(selectedChainId) },
    });
    await walletKit.emitSessionEvent({
      topic,
      chainId: toEip155Chain(selectedChainId),
      event: { name: "accountsChanged", data: [safeAddr] },
    });
  }

  async function proxyReadRpc(chainId: DeploySupportedChainId, method: string, params: unknown) {
    const publicClient = getPublicClientWithRpc(chainId);
    return publicClient.request({ method: method as any, params: asArrayParams(params) as any });
  }

  async function handleWcSessionRequest(event: WalletConnectRequestEvent) {
    const { id, topic, params } = event;
    const method = params.request.method;
    const requestParams = params.request.params;
    const safeAddr = latestStateRef.current.providerSafeAddress;
    const selectedChainId = latestStateRef.current.providerChainId ?? ARBITRUM_SEPOLIA;
    const requestKey = `${topic}:${id}`;
    const now = Date.now();

    for (const [key, ts] of wcHandledRequestKeysRef.current) {
      if (now - ts > 2 * 60_000) wcHandledRequestKeysRef.current.delete(key);
    }
    if (wcInFlightRequestKeysRef.current.has(requestKey)) {
      pushActivity(`WC duplicate request ignored (in-flight): ${method} ${id}`);
      return;
    }
    if (wcHandledRequestKeysRef.current.has(requestKey)) {
      pushActivity(`WC duplicate request ignored (handled): ${method} ${id}`);
      return;
    }
    wcInFlightRequestKeysRef.current.add(requestKey);

    try {
      pushActivity(`WC request: ${method}`);
      if (!safeAddr) throw new Error("No Safe address configured for provider");

      const requestedSessionChainId = parseSessionChainId(params.chainId);
      if (
        requestedSessionChainId !== undefined &&
        !DEPLOY_SUPPORTED_CHAINS.includes(requestedSessionChainId as DeploySupportedChainId)
      ) {
        await respondWcRequestError(topic, id, 4901, `Unsupported chain ${params.chainId}`);
        return;
      }
      const requestChainId = (requestedSessionChainId as DeploySupportedChainId | undefined) ?? selectedChainId;
      const requestChainHex = numberToHex(requestChainId);
      if (method === "eth_chainId") {
        await respondWcRequestSuccess(topic, id, requestChainHex);
        return;
      }
      if (method === "net_version") {
        await respondWcRequestSuccess(topic, id, String(requestChainId));
        return;
      }
      if (method === "eth_accounts" || method === "eth_requestAccounts") {
        await respondWcRequestSuccess(topic, id, [safeAddr]);
        return;
      }
      if (method === "wallet_switchEthereumChain") {
        const requestedChainId = parseWalletSwitchChainId(requestParams);
        if (
          requestedChainId === undefined ||
          !DEPLOY_SUPPORTED_CHAINS.includes(requestedChainId as DeploySupportedChainId)
        ) {
          await respondWcRequestError(
            topic,
            id,
            4902,
            `Unsupported chain id: ${requestedChainId ?? "unknown"}`
          );
          return;
        }
        const nextChainId = requestedChainId as DeploySupportedChainId;
        setProviderChainId(nextChainId);
        latestStateRef.current.providerChainId = nextChainId;
        await switchNetwork(nextChainId, Boolean(latestStateRef.current.active));
        await respondWcRequestSuccess(topic, id, null);
        void emitWcAccountAndChainChanged(topic, nextChainId).catch((error) => {
          pushActivity(`WC event emit warning (wallet_switchEthereumChain): ${getErrorMessage(error)}`);
        });
        return;
      }
      if (method === "wallet_addEthereumChain") {
        const requestedChainId = parseWalletSwitchChainId(requestParams);
        if (
          requestedChainId === undefined ||
          !DEPLOY_SUPPORTED_CHAINS.includes(requestedChainId as DeploySupportedChainId)
        ) {
          await respondWcRequestError(
            topic,
            id,
            4902,
            `Unsupported chain id: ${requestedChainId ?? "unknown"}`
          );
          return;
        }
        const nextChainId = requestedChainId as DeploySupportedChainId;
        setProviderChainId(nextChainId);
        latestStateRef.current.providerChainId = nextChainId;
        await switchNetwork(nextChainId, Boolean(latestStateRef.current.active));
        await respondWcRequestSuccess(topic, id, null);
        void emitWcAccountAndChainChanged(topic, nextChainId).catch((error) => {
          pushActivity(`WC event emit warning (wallet_addEthereumChain): ${getErrorMessage(error)}`);
        });
        return;
      }
      if (method === "personal_sign") {
        const safeSdk = await getSafeSdkOrThrow();
        const message = normalizePersonalSignMessage(parsePersonalSignParams(requestParams, safeAddr));
        const safeMessage = safeSdk.createMessage(message);
        const signedMessage = await safeSdk.signMessage(safeMessage, undefined, safeAddr);
        const signature = extractSafeSignature(signedMessage);
        await respondWcRequestSuccess(topic, id, signature);
        return;
      }
      if (method === "eth_signTypedData" || method === "eth_signTypedData_v3" || method === "eth_signTypedData_v4") {
        if (typedDataSignInFlightRef.current) {
          throw new Error("Another typed-data signing request is already in progress");
        }
        typedDataSignInFlightRef.current = true;

        const safeSdk = await getSafeSdkOrThrow();
        const typedData = parseTypedDataParam(requestParams, safeAddr);
        const typedDataHash = hashTypedData(typedData as any);
        const safeMessage = safeSdk.createMessage(typedData as any);
        const safeMessageHash = await (safeSdk as any).getSafeMessageHash(typedDataHash);
        const { walletClient: ownerWalletClient, account: ownerAccount, walletChainId: ownerChainId } =
          latestStateRef.current;
        if (!ownerWalletClient || !ownerAccount) throw new Error("Owner wallet is not connected");

        // EIP-6492: use the owner's current chain (settlement chain, e.g. Arb Sepolia) for the
        // Safe envelope domain, not the Safe's deployment chain. This makes the signature
        // verifiable on the settlement chain via EIP-6492 counterfactual verification.
        const signingChainId = ownerChainId ? BigInt(ownerChainId) : await safeSdk.getChainId();
        const safeEnvelopeTypedData = generateTypedData({
          safeAddress: safeAddr,
          safeVersion: safeSdk.getContractVersion(),
          chainId: signingChainId,
          data: (safeMessage as any).data,
        } as any);
        const ownerSignMethod = method === "eth_signTypedData_v3" ? "eth_signTypedData_v3" : "eth_signTypedData_v4";
        const typedDataJson = JSON.stringify(safeEnvelopeTypedData);

        // Some wallet providers are strict about parameter ordering. Try both.
        let rawSignature: Hex | undefined;
        let firstSignError: string | undefined;
        try {
          rawSignature = (await (ownerWalletClient.request as any)({
            method: ownerSignMethod,
            params: [ownerAccount, typedDataJson],
          })) as Hex;
        } catch (error) {
          firstSignError = getNonEmptyErrorMessage(error);
        }

        if (!rawSignature && firstSignError && isLikelyInvalidParamsError(firstSignError)) {
          try {
            rawSignature = (await (ownerWalletClient.request as any)({
              method: ownerSignMethod,
              params: [typedDataJson, ownerAccount],
            })) as Hex;
          } catch (error) {
            const secondSignError = getNonEmptyErrorMessage(error);
            throw new Error(
              `Failed to sign typed data (${ownerSignMethod}). first=[${firstSignError ?? "n/a"}] second=[${secondSignError}]`
            );
          }
        }

        if (!rawSignature) {
          throw new Error(`Failed to sign typed data (${ownerSignMethod}): ${firstSignError ?? "unknown error"}`);
        }

        let signature: Hex = normalizeTypedDataSignatureV(rawSignature);

        // EIP-6492: wrap signature if the owner is on a different chain than the Safe's deployment chain.
        // This enables counterfactual verification on the settlement chain.
        const safeDeploymentChainId = await safeSdk.getChainId();
        const needsEip6492 = ownerChainId !== undefined && BigInt(ownerChainId) !== safeDeploymentChainId;
        if (needsEip6492) {
          const targetChainId = ownerChainId as DeploySupportedChainId;
          const profile = latestStateRef.current.providerSafeAddress
            ? savedWalletProfiles.find(
                (p) =>
                  isSameAddress(p.safeAddress, latestStateRef.current.providerSafeAddress) &&
                  p.chainId === latestStateRef.current.providerChainId
              )
            : undefined;

          if (!profile?.saltNonce) {
            throw new Error(
              "EIP-6492 wrapping requires saltNonce. Re-deploy the Safe or update the saved profile with the salt nonce."
            );
          }

          const owners = await safeSdk.getOwners();
          signature = wrapSignatureEip6492({
            innerSignature: signature,
            owners: owners as Address[],
            saltNonce: profile.saltNonce,
            targetChainId,
          });
          pushActivity(
            `EIP-6492 wrapped signature for cross-chain verification (${ownerChainId}) tdHash=${typedDataHash.slice(0, 10)}`
          );
        } else {
          pushActivity(
            `WC typed-data signed via Safe typed-data (${method}) tdHash=${typedDataHash.slice(0, 10)} safeHash=${String(safeMessageHash).slice(0, 10)}...`
          );
        }

        await respondWcRequestSuccess(topic, id, signature);
        typedDataSignInFlightRef.current = false;
        return;
      }
      if (method === "eth_sign") {
        await respondWcRequestError(topic, id, 4200, "eth_sign is not supported");
        return;
      }
      if (method === "eth_sendTransaction") {
        const [tx] = asArrayParams(requestParams);
        if (!tx || typeof tx !== "object") throw new Error("Invalid transaction params");
        const txParams = tx as { from?: string; to?: string; data?: string; value?: string | number };
        if (txParams.from && !isSameAddress(txParams.from, safeAddr))
          throw new Error(`Transaction from must be Safe address ${safeAddr}`);
        if (!txParams.to || !isAddress(txParams.to))
          throw new Error("Contract creation transactions are not supported in MVP");
        const safeSdk = await getSafeSdkOrThrow();
        const safeTransaction = await safeSdk.createTransaction({
          transactions: [
            {
              to: getAddress(txParams.to),
              data: (txParams.data ?? "0x") as Hex,
              value: parseBigIntLike(txParams.value, 0n).toString(),
            },
          ],
        });
        const executionResult = await safeSdk.executeTransaction(safeTransaction);
        const hash = await Promise.resolve(executionResult.hash);
        await respondWcRequestSuccess(topic, id, hash);
        pushActivity(`Safe exec tx: ${hash}`);
        return;
      }
      if (method.startsWith("eth_") || method === "web3_clientVersion") {
        const result = await proxyReadRpc(requestChainId, method, requestParams);
        await respondWcRequestSuccess(topic, id, result);
        return;
      }
      await respondWcRequestError(topic, id, 4200, `Unsupported method: ${method}`);
    } catch (error) {
      const message = getNonEmptyErrorMessage(error);
      pushActivity(`WC error (${method}): ${message}`);
      if (!isStaleWcRequestError(message)) {
        const code = message.toLowerCase().includes("rejected") ? 4001 : -32000;
        await respondWcRequestError(topic, id, code, message);
      }
    } finally {
      if (method === "eth_signTypedData" || method === "eth_signTypedData_v3" || method === "eth_signTypedData_v4") {
        typedDataSignInFlightRef.current = false;
      }
      wcInFlightRequestKeysRef.current.delete(requestKey);
      wcHandledRequestKeysRef.current.set(requestKey, Date.now());
    }
  }

  async function handleWcSessionProposal(event: any) {
    const walletKit = walletKitRef.current;
    const safeAddr = latestStateRef.current.providerSafeAddress;
    const supportedChains = DEPLOY_SUPPORTED_CHAINS.map((chainId) => toEip155Chain(chainId));
    if (!walletKit) return;
    try {
      if (!safeAddr) throw new Error("Set a Safe address before approving a WalletConnect session");
      await getSafeSdkOrThrow();
      const approvedNamespaces = buildApprovedNamespaces({
        proposal: event.params,
        supportedNamespaces: {
          eip155: {
            chains: supportedChains,
            methods: [...WC_SUPPORTED_METHODS],
            events: [...WC_SUPPORTED_EVENTS],
            accounts: supportedChains.map((chain) => `${chain}:${safeAddr}`),
          },
        },
      });
      const session = await walletKit.approveSession({ id: event.id, namespaces: approvedNamespaces });
      refreshSessions();
      await pruneDuplicateSessions(session.topic);
      pushActivity(`WC session approved: ${summarizeSession(session)}`);
      onWalletKitStatusChange("WalletConnect wallet ready");
    } catch (error) {
      const message = getErrorMessage(error);
      pushActivity(`WC proposal rejected: ${message}`);
      await walletKit.rejectSession({ id: event.id, reason: getSdkError("USER_REJECTED") });
    }
  }

  useEffect(() => {
    let disposed = false;
    let mountedWalletKit: InstanceType<typeof WalletKit> | null = null;

    async function initWalletKit() {
      try {
        onWalletKitInitErrorChange(undefined);
        onWalletKitStatusChange("Initializing WalletConnect wallet...");
        const core = new Core({ projectId: WC_PROJECT_ID });
        const walletKit = await WalletKit.init({
          core,
          metadata: {
            name: "GMX Dev Smart Wallet",
            description: "Dev Safe wallet provider for Arbitrum Sepolia and Sepolia",
            url: "https://gmx.io",
            icons: ["https://gmx.io/favicon.ico"],
          },
        });
        if (disposed) return;
        mountedWalletKit = walletKit;
        walletKitRef.current = walletKit;
        walletKit.on("session_proposal", (event: any) => void handleWcSessionProposal(event));
        walletKit.on("session_request", (event: WalletConnectRequestEvent) => void handleWcSessionRequest(event));
        walletKit.on("session_delete", ((event: { topic: string }) => {
          pushActivity(`WC session deleted: ${event.topic}`);
          refreshSessions();
        }) as any);
        setIsWalletKitReady(true);
        onWalletKitStatusChange("WalletConnect wallet ready");
        refreshSessions();
        await pruneDuplicateSessions();
        pushActivity("WalletConnect wallet initialized");
      } catch (error) {
        if (disposed) return;
        const message = getErrorMessage(error);
        onWalletKitInitErrorChange(message);
        onWalletKitStatusChange("WalletConnect wallet failed to initialize");
        pushActivity(`WalletConnect init error: ${message}`);
      }
    }
    void initWalletKit();
    return () => {
      disposed = true;
      if (mountedWalletKit) (mountedWalletKit as any).removeAllListeners?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePairWalletConnect() {
    const walletKit = walletKitRef.current;
    const wcUri = pairUriInput.trim();
    if (!walletKit) {
      helperToast.error(t`WalletConnect wallet not initialized yet`);
      return;
    }
    if (!wcUri) {
      helperToast.error(t`Paste a WalletConnect URI from /trade`);
      return;
    }
    if (!wcUri.startsWith("wc:")) {
      helperToast.error(t`WalletConnect URI should start with wc:`);
      return;
    }
    setIsPairing(true);
    try {
      await walletKit.pair({ uri: wcUri });
      pushActivity("WalletConnect pairing started");
      setPairUriInput("");
      helperToast.success(t`WalletConnect pairing started`);
    } catch (error) {
      const message = getErrorMessage(error);
      pushActivity(`Pairing failed: ${message}`);
      helperToast.error(t`WalletConnect pairing failed: ${message}`);
    } finally {
      setIsPairing(false);
    }
  }

  async function handleDisconnectSession(topic: string) {
    const walletKit = walletKitRef.current;
    if (!walletKit) return;
    try {
      await walletKit.disconnectSession({ topic, reason: getSdkError("USER_DISCONNECTED") });
      refreshSessions();
      pushActivity(`Disconnected session: ${topic}`);
    } catch (error) {
      helperToast.error(getErrorMessage(error));
    }
  }

  function handleSaveCurrentProviderProfile() {
    if (!providerSafeAddress) {
      helperToast.error(t`Set a valid provider Safe address first`);
      return;
    }
    const owners = account ? [account as Address] : [];
    upsertSavedWalletProfile({ safeAddress: providerSafeAddress, chainId: providerChainId, owners });
    pushActivity(`Saved wallet profile: ${providerSafeAddress} on ${getChainName(providerChainId)}`);
    helperToast.success(t`Saved smart wallet profile`);
  }

  return (
    <>
      <div className="rounded-8 border-1/2 border-slate-600 bg-slate-950/50 p-16">
        <h2 className="text-18 font-medium">
          <Trans>WalletConnect Wallet Provider (MVP)</Trans>
        </h2>
        <p className="mt-8 text-13 text-typography-secondary">
          <Trans>
            Threshold-1 Safe only. Exposes the Safe address over WalletConnect and executes dapp transactions through
            Safe Protocol Kit using the connected owner EOA in this browser.
          </Trans>
        </p>
        <p className="mt-4 text-12 text-typography-secondary">
          <Trans>This dev wallet is pinned to Safe version {SAFE_TARGET_VERSION}.</Trans>
        </p>

        <div className="mt-12 grid gap-16">
          <div>
            <label className="mb-6 block text-13 font-medium text-typography-primary" htmlFor="providerChain">
              <Trans>Provider chain (WalletConnect account chain)</Trans>
            </label>
            <select
              id="providerChain"
              value={providerChainId}
              onChange={(e) => setProviderChainId(Number(e.target.value) as DeploySupportedChainId)}
              className="w-full rounded-8 border border-slate-800 bg-slate-800 px-12 py-10 text-14 outline-none focus:border-blue-400"
            >
              {DEPLOY_SUPPORTED_CHAINS.map((chainId) => (
                <option key={chainId} value={chainId}>
                  {getChainName(chainId)} ({chainId})
                </option>
              ))}
            </select>
          </div>

          <AddressInput
            id="providerSafeAddress"
            label={t`Safe address to expose over WalletConnect`}
            value={providerSafeAddressInput}
            onChange={setProviderSafeAddressInput}
          />

          <div className="flex flex-wrap gap-8">
            <Button
              variant="secondary"
              onClick={() => {
                if (!lastCreatedSafeAddress || !lastCreatedSafeChainId) return;
                setProviderSafeAddressInput(lastCreatedSafeAddress);
                setProviderChainId(lastCreatedSafeChainId);
              }}
              disabled={!lastCreatedSafeAddress}
            >
              <Trans>Use last created Safe</Trans>
            </Button>
            <Button variant="secondary" onClick={handleSaveCurrentProviderProfile} disabled={!providerSafeAddress}>
              <Trans>Save current provider wallet</Trans>
            </Button>
          </div>

          {providerErrors.length > 0 && (
            <div className="text-yellow-200 rounded-8 border border-yellow-500/40 bg-yellow-500/10 p-12 text-13">
              {providerErrors[0]}
            </div>
          )}

          <div>
            <label className="mb-6 block text-13 font-medium text-typography-primary" htmlFor="wcPairUri">
              <Trans>WalletConnect URI (paste from /trade)</Trans>
            </label>
            <textarea
              id="wcPairUri"
              rows={3}
              value={pairUriInput}
              onChange={(e) => setPairUriInput(e.target.value)}
              placeholder="wc:..."
              className="w-full rounded-8 border border-slate-800 bg-slate-800 px-12 py-10 text-14 outline-none focus:border-blue-400"
            />
          </div>

          <div className="flex flex-wrap gap-8">
            <Button
              variant="primary-action"
              onClick={handlePairWalletConnect}
              disabled={!isWalletKitReady || isPairing || providerErrors.length > 0}
            >
              {isPairing ? t`Pairing...` : t`Pair WalletConnect Session`}
            </Button>
          </div>

          <div className="text-12 text-typography-secondary">
            <Trans>
              Connection flow: open /trade in Chrome, choose WalletConnect, copy the wc: URI from the modal, paste it
              here in Firefox, then approve the session on this page.
            </Trans>
          </div>
        </div>
      </div>

      <div className="rounded-8 border-1/2 border-slate-600 bg-slate-950/50 p-16">
        <h2 className="text-18 font-medium">
          <Trans>Saved Smart Wallets</Trans>
        </h2>
        <p className="mt-8 text-13 text-typography-secondary">
          <Trans>
            Persisted in this browser: Safe address, chain, and owners. Use saved entries to quickly switch provider
            wallet, validator target, or deploy form owners.
          </Trans>
        </p>

        <div className="mt-12 flex flex-col gap-10">
          {savedWalletProfiles.length === 0 && (
            <div className="text-13 text-typography-secondary">
              <Trans>No saved smart wallets yet</Trans>
            </div>
          )}

          {savedWalletProfiles.map((profile) => (
            <div
              key={`${profile.chainId}:${profile.safeAddress}`}
              className="rounded-8 border border-slate-700 bg-slate-900/40 p-12"
            >
              <div className="flex flex-wrap items-center gap-8 text-13">
                <span className="rounded-8 border border-slate-700 px-8 py-4 text-12">
                  {getChainName(profile.chainId)} ({profile.chainId})
                </span>
                <span className="text-typography-secondary">
                  <Trans>Owners</Trans>: {profile.owners.length}
                </span>
              </div>
              <div className="mt-8 break-all text-13 text-typography-primary">{profile.safeAddress}</div>
              {profile.owners.length > 0 && (
                <div className="mt-6 break-all text-12 text-typography-secondary">{profile.owners.join(", ")}</div>
              )}
              <div className="mt-6 flex items-center gap-8 text-12">
                <span className="text-typography-secondary">Salt nonce:</span>
                <input
                  className="w-[200px] rounded-4 border border-slate-700 bg-slate-800 px-8 py-4 text-12 outline-none focus:border-blue-400"
                  placeholder="e.g. 1710000000000"
                  value={profile.saltNonce ?? ""}
                  onChange={(e) =>
                    upsertSavedWalletProfile({
                      safeAddress: profile.safeAddress,
                      chainId: profile.chainId,
                      owners: profile.owners,
                      saltNonce: e.target.value || undefined,
                    })
                  }
                />
                {!profile.saltNonce && (
                  <span className="text-yellow-500">Required for EIP-6492</span>
                )}
              </div>
              <div className="mt-10 flex flex-wrap gap-8">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setProviderSafeAddressInput(profile.safeAddress);
                    setProviderChainId(profile.chainId);
                    upsertSavedWalletProfile(profile);
                  }}
                >
                  <Trans>Use for provider</Trans>
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setValidatorSafeAddressInput(profile.safeAddress);
                    upsertSavedWalletProfile(profile);
                  }}
                >
                  <Trans>Use for validator</Trans>
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setDeployChainId(profile.chainId);
                    if (profile.owners.length > 0) setOwnersInput(profile.owners.join("\n"));
                    upsertSavedWalletProfile(profile);
                  }}
                >
                  <Trans>Use for deploy form</Trans>
                </Button>
                <Button variant="secondary" onClick={() => removeSavedWalletProfile(profile)}>
                  <Trans>Remove</Trans>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-16 xl:grid-cols-2">
        <div className="rounded-8 border-1/2 border-slate-600 bg-slate-950/50 p-16">
          <h2 className="text-18 font-medium">
            <Trans>Active WalletConnect Sessions</Trans>
          </h2>
          <div className="mt-12 flex flex-col gap-10">
            {Object.entries(sessionMap).length === 0 && (
              <div className="text-13 text-typography-secondary">
                <Trans>No active sessions</Trans>
              </div>
            )}
            {Object.entries(sessionMap).map(([topic, session]) => (
              <div key={topic} className="rounded-8 border border-slate-700 bg-slate-900/40 p-12">
                <div className="text-13 font-medium text-typography-primary">{summarizeSession(session)}</div>
                <div className="mt-6 break-all text-12 text-typography-secondary">{topic}</div>
                <div className="mt-6 break-all text-12 text-typography-secondary">
                  <Trans>Accounts</Trans>: {session?.namespaces?.eip155?.accounts?.join(", ") ?? "-"}
                </div>
                <div className="mt-10">
                  <Button variant="secondary" onClick={() => handleDisconnectSession(topic)}>
                    <Trans>Disconnect</Trans>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-8 border-1/2 border-slate-600 bg-slate-950/50 p-16">
          <h2 className="text-18 font-medium">
            <Trans>Wallet Activity</Trans>
          </h2>
          <div className="mt-12 rounded-8 border border-slate-700 bg-slate-900/40 p-12">
            <pre className="max-h-[360px] max-w-full overflow-auto whitespace-pre-wrap break-words text-12 text-typography-secondary">
              {activityLog.length > 0 ? activityLog.join("\n") : t`No activity yet`}
            </pre>
          </div>
        </div>
      </div>
    </>
  );
}
