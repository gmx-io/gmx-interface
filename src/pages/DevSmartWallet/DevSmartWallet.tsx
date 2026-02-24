import { t, Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { WalletKit } from "@reown/walletkit";
import Safe, { generateTypedData } from "@safe-global/protocol-kit";
import { Core } from "@walletconnect/core";
import { buildApprovedNamespaces, getSdkError } from "@walletconnect/utils";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  concatHex,
  decodeEventLog,
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  hashTypedData,
  hexToString,
  keccak256,
  isAddress,
  isHex,
  numberToHex,
  parseAbi,
  type Address,
  type Hex,
  zeroAddress,
} from "viem";

import { ARBITRUM_SEPOLIA, getChainName, getExplorerUrl } from "config/chains";
import { helperToast } from "lib/helperToast";
import { switchNetwork } from "lib/wallets";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import useWallet from "lib/wallets/useWallet";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import Button from "components/Button/Button";
import ConnectWalletButton from "components/ConnectWalletButton/ConnectWalletButton";

const SAFE_PROXY_FACTORY_ABI = parseAbi([
  "function createProxyWithNonce(address _singleton, bytes initializer, uint256 saltNonce) returns (address proxy)",
  "event ProxyCreation(address proxy, address singleton)",
]);

const SAFE_ABI = parseAbi([
  "function setup(address[] _owners,uint256 _threshold,address to,bytes data,address fallbackHandler,address paymentToken,uint256 payment,address paymentReceiver)",
]);
const SAFE_1271_BYTES32_ABI = parseAbi([
  "function isValidSignature(bytes32 _hash, bytes _signature) view returns (bytes4)",
]);
const SAFE_1271_BYTES_ABI = parseAbi([
  "function isValidSignature(bytes _data, bytes _signature) view returns (bytes4)",
]);
const EIP1271_MAGIC_VALUE = "0x1626ba7e";
const EIP1271_BYTES_MAGIC_VALUE = "0x20c13b0b";
const MINIFIED_TYPEHASH = keccak256("0x4d696e696669656428627974657333322064696765737429"); // "Minified(bytes32 digest)"
// Derived from Safe Wallet monorepo ContractErrorCodes.ts (pinned commit referenced in user request)
const SAFE_CONTRACT_ERROR_CODE_MESSAGES: Record<string, string> = {
  GS000: "Could not finish initialization",
  GS001: "Threshold needs to be defined",
  GS010: "Not enough gas to execute Safe transaction",
  GS011: "Could not pay gas costs with ether",
  GS012: "Could not pay gas costs with token",
  GS013: "Safe transaction failed when gasPrice and safeTxGas were 0",
  GS020: "Signatures data too short",
  GS021: "Invalid contract signature location = inside static part",
  GS022: "Invalid contract signature location = length not present",
  GS023: "Invalid contract signature location = data not complete",
  GS024: "Invalid contract signature provided",
  GS025: "Hash has not been approved",
  GS026: "Invalid owner provided",
  GS030: "Only owners can approve a hash",
  GS031: "Method can only be called from this contract",
  GS100: "Modules have already been initialized",
  GS101: "Invalid module address provided",
  GS102: "Module has already been added",
  GS103: "Invalid prevModule, module pair provided",
  GS104: "Method can only be called from an enabled module",
  GS200: "Owners have already been set up",
  GS201: "Threshold cannot exceed owner count",
  GS202: "Threshold needs to be greater than 0",
  GS203: "Invalid owner address provided",
  GS204: "Address is already an owner",
  GS205: "Invalid prevOwner, owner pair provided",
  GS300: "Guard does not implement IERC165",
};

const WC_PROJECT_ID = "de24cddbaf2a68f027eae30d9bb5df58";
const EIP155_ARB_SEPOLIA = `eip155:${ARBITRUM_SEPOLIA}`;
const ARBITRUM_SEPOLIA_HEX = numberToHex(ARBITRUM_SEPOLIA);
const DEV_SMART_WALLET_PROVIDER_SAFE_LS_KEY = "devSmartWallet.providerSafeAddress";

const SAFE_DEFAULTS = {
  proxyFactoryAddress: "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67" as Address,
  singletonAddress: "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762" as Address,
  fallbackHandlerAddress: "0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99" as Address,
  multiSendAddress: "0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526" as Address,
  multiSendCallOnlyAddress: "0x9641d764fc13c8B624c04430C7356C1C7C8102e2" as Address,
  signMessageLibAddress: "0xd53cd0aB83D845Ac265BE939c57F53AD838012c9" as Address,
  createCallAddress: "0x9b35Af71d77eaf8d7e40252370304687390A1A52" as Address,
  simulateTxAccessorAddress: "0x3d4BA2E0884aa488718476ca2FB8Efc291A46199" as Address,
};

const SAFE_CONTRACT_NETWORKS = {
  [ARBITRUM_SEPOLIA]: {
    safeSingletonAddress: SAFE_DEFAULTS.singletonAddress,
    safeProxyFactoryAddress: SAFE_DEFAULTS.proxyFactoryAddress,
    multiSendAddress: SAFE_DEFAULTS.multiSendAddress,
    multiSendCallOnlyAddress: SAFE_DEFAULTS.multiSendCallOnlyAddress,
    fallbackHandlerAddress: SAFE_DEFAULTS.fallbackHandlerAddress,
    signMessageLibAddress: SAFE_DEFAULTS.signMessageLibAddress,
    createCallAddress: SAFE_DEFAULTS.createCallAddress,
    simulateTxAccessorAddress: SAFE_DEFAULTS.simulateTxAccessorAddress,
  },
};

const WC_SUPPORTED_METHODS = [
  "eth_accounts",
  "eth_requestAccounts",
  "eth_chainId",
  "eth_sendTransaction",
  "eth_call",
  "eth_estimateGas",
  "eth_getBalance",
  "eth_getCode",
  "eth_getLogs",
  "eth_getTransactionByHash",
  "eth_getTransactionCount",
  "eth_getTransactionReceipt",
  "eth_gasPrice",
  "eth_maxPriorityFeePerGas",
  "eth_blockNumber",
  "eth_feeHistory",
  "eth_getBlockByNumber",
  "eth_getBlockByHash",
  "eth_getStorageAt",
  "eth_sign",
  "personal_sign",
  "eth_signTypedData",
  "eth_signTypedData_v3",
  "eth_signTypedData_v4",
  "wallet_switchEthereumChain",
  "wallet_addEthereumChain",
  "net_version",
  "web3_clientVersion",
] as const;

const WC_SUPPORTED_EVENTS = ["accountsChanged", "chainChanged"] as const;

type WalletKitSessionMap = Record<string, any>;

type WalletConnectRequestEvent = {
  id: number;
  topic: string;
  params: {
    chainId?: string;
    request: {
      method: string;
      params?: unknown;
    };
  };
};

function parseOwnersInput(value: string) {
  const rawOwners = value
    .split(/[\s,;]+/g)
    .map((item) => item.trim())
    .filter(Boolean);

  const owners: Address[] = [];
  const invalidOwners: string[] = [];
  const seen = new Set<string>();
  let hasDuplicates = false;

  for (const owner of rawOwners) {
    if (!isAddress(owner)) {
      invalidOwners.push(owner);
      continue;
    }

    const normalizedOwner = getAddress(owner);

    if (seen.has(normalizedOwner)) {
      hasDuplicates = true;
      continue;
    }

    seen.add(normalizedOwner);
    owners.push(normalizedOwner);
  }

  return { owners, invalidOwners, hasDuplicates, rawOwnersCount: rawOwners.length };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error && "message" in error && typeof (error as any).message === "string") {
    return (error as any).message;
  }

  return String(error);
}

function getNonEmptyErrorMessage(error: unknown) {
  const message = getErrorMessage(error).trim();
  return message || "Unknown wallet error (empty message)";
}

function getSafeContractErrorHint(message: string) {
  const match = message.match(/\bGS\d{3}\b/);
  if (!match) return undefined;

  const code = match[0];
  const description = SAFE_CONTRACT_ERROR_CODE_MESSAGES[code];
  if (!description) return undefined;

  return `${code}: ${description}`;
}

function isSameAddress(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  if (!isAddress(a) || !isAddress(b)) return false;
  return getAddress(a) === getAddress(b);
}

function asArrayParams(params: unknown): unknown[] {
  if (Array.isArray(params)) return params;
  if (params === undefined) return [];
  return [params];
}

function parseBigIntLike(value: unknown, fallback = 0n) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string") return BigInt(value);
  throw new Error("Invalid bigint value");
}

function parseWalletSwitchChainId(params: unknown): number | undefined {
  const [request] = asArrayParams(params);
  if (!request || typeof request !== "object") return undefined;
  const chainId = (request as { chainId?: unknown }).chainId;
  if (typeof chainId === "string") {
    return Number(chainId.startsWith("0x") ? BigInt(chainId) : Number(chainId));
  }
  if (typeof chainId === "number") return chainId;
  return undefined;
}

function normalizePersonalSignMessage(message: string) {
  if (isHex(message)) {
    try {
      return hexToString(message as Hex);
    } catch {
      // Fallback to hex literal string if bytes aren't utf8.
      return message;
    }
  }

  return message;
}

function extractSafeSignature(messageOrTx: { signatures: Map<string, { data: string }> }) {
  const firstSignature = Array.from(messageOrTx.signatures.values())[0];

  if (!firstSignature?.data) {
    throw new Error("No Safe signature produced");
  }

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
    if (typeof item === "string") {
      return item.toLowerCase() !== safeAddressLower;
    }
    return typeof item === "object" && item !== null;
  });

  if (typeof typedDataParam === "string") {
    return JSON.parse(typedDataParam);
  }

  if (typedDataParam && typeof typedDataParam === "object") {
    return typedDataParam;
  }

  throw new Error("Typed data payload missing");
}

function parsePersonalSignParams(params: unknown, safeAddress: Address) {
  const [first, second] = asArrayParams(params);

  if (typeof first !== "string" || typeof second !== "string") {
    throw new Error("Invalid personal_sign params");
  }

  return isSameAddress(first, safeAddress) ? second : first;
}

function formatLogLine(message: string) {
  return `${new Date().toLocaleTimeString()} ${message}`;
}

function summarizeSession(session: any) {
  const peer = session?.peer?.metadata;
  const name = peer?.name || "Unknown dapp";
  const url = peer?.url || "";
  return url ? `${name} (${url})` : name;
}

export default function DevSmartWallet() {
  const { openConnectModal } = useConnectModal();
  const { account, active, chainId: walletChainId, walletClient } = useWallet();

  const [ownersInput, setOwnersInput] = useState("");
  const [thresholdInput, setThresholdInput] = useState("1");
  const [saltNonceInput, setSaltNonceInput] = useState(() => String(Date.now()));
  const [proxyFactoryAddress, setProxyFactoryAddress] = useState<string>(SAFE_DEFAULTS.proxyFactoryAddress);
  const [singletonAddress, setSingletonAddress] = useState<string>(SAFE_DEFAULTS.singletonAddress);
  const [fallbackHandlerAddress, setFallbackHandlerAddress] = useState<string>(SAFE_DEFAULTS.fallbackHandlerAddress);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [txHash, setTxHash] = useState<Hex | undefined>();
  const [safeAddress, setSafeAddress] = useState<Address | undefined>();

  const [providerSafeAddressInput, setProviderSafeAddressInput] = useState(() => {
    try {
      return localStorage.getItem(DEV_SMART_WALLET_PROVIDER_SAFE_LS_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [pairUriInput, setPairUriInput] = useState("");
  const [isWalletKitReady, setIsWalletKitReady] = useState(false);
  const [walletKitInitError, setWalletKitInitError] = useState<string | undefined>();
  const [walletKitStatus, setWalletKitStatus] = useState<string>("Initializing WalletConnect wallet...");
  const [isPairing, setIsPairing] = useState(false);
  const [sessionMap, setSessionMap] = useState<WalletKitSessionMap>({});
  const [activityLog, setActivityLog] = useState<string[]>([]);
  const [validatorSafeAddressInput, setValidatorSafeAddressInput] = useState("");
  const [validatorHashInput, setValidatorHashInput] = useState("");
  const [validatorDomainSeparatorInput, setValidatorDomainSeparatorInput] = useState("");
  const [validatorSignatureInput, setValidatorSignatureInput] = useState("");
  const [isValidatorChecking, setIsValidatorChecking] = useState(false);
  const [validatorResult, setValidatorResult] = useState<
    | {
        safeAddress: Address;
        hash: Hex;
        bytes32ReturnValue?: Hex;
        bytesReturnValue?: Hex;
        bytes32Error?: string;
        bytesError?: string;
        signatureUtilsDomainSeparator?: Hex;
        signatureUtilsMinifiedDigest?: Hex;
        signatureUtilsDigest1271ReturnValue?: Hex;
        signatureUtilsDigest1271Error?: string;
        signatureUtilsMinified1271ReturnValue?: Hex;
        signatureUtilsMinified1271Error?: string;
        signatureUtils1271Valid?: boolean;
        isValid: boolean;
      }
    | undefined
  >();
  const [validatorError, setValidatorError] = useState<string | undefined>();

  const walletKitRef = useRef<InstanceType<typeof WalletKit> | null>(null);
  const protocolKitCacheRef = useRef<{ key: string; safeSdk: Safe } | null>(null);
  const wcInFlightRequestKeysRef = useRef<Set<string>>(new Set());
  const wcHandledRequestKeysRef = useRef<Map<string, number>>(new Map());
  const latestStateRef = useRef<{
    account?: Address;
    active: boolean;
    walletChainId?: number;
    walletClient: typeof walletClient;
    providerSafeAddress?: Address;
  }>({
    account: undefined,
    active: false,
    walletChainId: undefined,
    walletClient: undefined,
    providerSafeAddress: undefined,
  });

  useEffect(() => {
    if (account && ownersInput.trim() === "") {
      setOwnersInput(account);
    }
  }, [account, ownersInput]);

  useEffect(() => {
    if (safeAddress && providerSafeAddressInput.trim() === "") {
      setProviderSafeAddressInput(safeAddress);
    }
  }, [providerSafeAddressInput, safeAddress]);

  useEffect(() => {
    if (!validatorSafeAddressInput.trim() && providerSafeAddressInput.trim()) {
      setValidatorSafeAddressInput(providerSafeAddressInput.trim());
    }
  }, [providerSafeAddressInput, validatorSafeAddressInput]);

  useEffect(() => {
    try {
      if (providerSafeAddressInput.trim()) {
        localStorage.setItem(DEV_SMART_WALLET_PROVIDER_SAFE_LS_KEY, providerSafeAddressInput.trim());
      } else {
        localStorage.removeItem(DEV_SMART_WALLET_PROVIDER_SAFE_LS_KEY);
      }
    } catch {
      // Ignore localStorage failures in restrictive browser contexts.
    }
  }, [providerSafeAddressInput]);

  const ownersState = useMemo(() => parseOwnersInput(ownersInput), [ownersInput]);
  const threshold = Number(thresholdInput);
  const isThresholdInteger = Number.isInteger(threshold);
  const isOnTargetNetwork = walletChainId === ARBITRUM_SEPOLIA;
  const explorerUrl = getExplorerUrl(ARBITRUM_SEPOLIA);
  const providerSafeAddress = isAddress(providerSafeAddressInput) ? getAddress(providerSafeAddressInput) : undefined;
  const validatorSafeAddress = isAddress(validatorSafeAddressInput) ? getAddress(validatorSafeAddressInput) : undefined;

  latestStateRef.current = {
    account: account as Address | undefined,
    active: Boolean(active),
    walletChainId,
    walletClient,
    providerSafeAddress,
  };

  const formErrors: string[] = [];

  if (ownersState.owners.length === 0) {
    formErrors.push("At least one owner is required");
  }
  if (ownersState.invalidOwners.length > 0) {
    formErrors.push(`Invalid owner address: ${ownersState.invalidOwners[0]}`);
  }
  if (ownersState.hasDuplicates) {
    formErrors.push("Duplicate owner addresses are not allowed");
  }
  if (!isThresholdInteger || threshold < 1) {
    formErrors.push("Threshold must be a positive integer");
  } else if (threshold > ownersState.owners.length) {
    formErrors.push("Threshold cannot exceed owner count");
  }
  if (!saltNonceInput.trim()) {
    formErrors.push("Salt nonce is required");
  } else {
    try {
      BigInt(saltNonceInput.trim());
    } catch {
      formErrors.push("Salt nonce must be a valid integer (decimal or 0x-prefixed hex)");
    }
  }
  if (!isAddress(proxyFactoryAddress)) {
    formErrors.push("Proxy factory address is invalid");
  }
  if (!isAddress(singletonAddress)) {
    formErrors.push("Safe singleton address is invalid");
  }
  if (!isAddress(fallbackHandlerAddress)) {
    formErrors.push("Fallback handler address is invalid");
  }

  function pushActivity(message: string) {
    setActivityLog((prev) => [formatLogLine(message), ...prev].slice(0, 30));
  }

  function refreshSessions() {
    const walletKit = walletKitRef.current;
    if (!walletKit) return;
    setSessionMap(walletKit.getActiveSessions() as WalletKitSessionMap);
  }

  async function handleSwitchNetwork() {
    try {
      await switchNetwork(ARBITRUM_SEPOLIA, Boolean(active));
    } catch (error) {
      helperToast.error(t`Failed to switch network: ${getErrorMessage(error)}`);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setSubmitError(undefined);
    setTxHash(undefined);
    setSafeAddress(undefined);

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

    if (!isOnTargetNetwork) {
      const message = t`Switch wallet to Arbitrum Sepolia`;
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
      helperToast.info(t`Transaction submitted. Waiting for confirmation...`);

      const publicClient = getPublicClientWithRpc(ARBITRUM_SEPOLIA);
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
            setSafeAddress(getAddress(proxy));
            pushActivity(`Created Safe ${getAddress(proxy)}`);
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

  async function getSafeSdkOrThrow() {
    const {
      account: ownerAccount,
      walletClient: currentWalletClient,
      walletChainId: currentChainId,
      providerSafeAddress,
    } = latestStateRef.current;

    if (!ownerAccount || !currentWalletClient) {
      throw new Error("Owner wallet is not connected");
    }

    if (currentChainId !== ARBITRUM_SEPOLIA) {
      throw new Error("Owner wallet must be on Arbitrum Sepolia");
    }

    if (!providerSafeAddress) {
      throw new Error("Set a valid Safe address for the WalletConnect provider");
    }

    const cacheKey = `${ownerAccount}:${providerSafeAddress}`;
    if (protocolKitCacheRef.current?.key === cacheKey) {
      return protocolKitCacheRef.current.safeSdk;
    }

    const eip1193Provider = {
      request: async ({ method, params }: { method: string; params?: unknown[] | object }) =>
        (currentWalletClient.request as any)({
          method,
          params: (params as any) ?? [],
        }),
    };

    const safeSdk = await Safe.init({
      provider: eip1193Provider as any,
      signer: ownerAccount,
      safeAddress: providerSafeAddress,
      contractNetworks: SAFE_CONTRACT_NETWORKS as any,
    });

    const [isDeployed, threshold, owners] = await Promise.all([
      safeSdk.isSafeDeployed(),
      safeSdk.getThreshold(),
      safeSdk.getOwners(),
    ]);

    if (!isDeployed) {
      throw new Error("Safe is not deployed");
    }

    if (threshold !== 1) {
      throw new Error(`MVP supports threshold=1 only (current threshold: ${threshold})`);
    }

    if (!owners.some((owner) => isSameAddress(owner, ownerAccount))) {
      throw new Error("Connected owner EOA is not an owner of the selected Safe");
    }

    protocolKitCacheRef.current = { key: cacheKey, safeSdk };
    return safeSdk;
  }

  async function respondWcRequestSuccess(topic: string, id: number, result: unknown) {
    const walletKit = walletKitRef.current;
    if (!walletKit) return;

    await walletKit.respondSessionRequest({
      topic,
      response: {
        id,
        jsonrpc: "2.0",
        result,
      } as any,
    });
  }

  async function respondWcRequestError(topic: string, id: number, code: number, message: string) {
    const walletKit = walletKitRef.current;
    if (!walletKit) return;

    await walletKit.respondSessionRequest({
      topic,
      response: {
        id,
        jsonrpc: "2.0",
        error: {
          code,
          message,
        },
      } as any,
    });
  }

  async function emitWcAccountAndChainChanged(topic: string) {
    const walletKit = walletKitRef.current;
    const safeAddr = latestStateRef.current.providerSafeAddress;
    if (!walletKit || !safeAddr) return;

    await walletKit.emitSessionEvent({
      topic,
      chainId: EIP155_ARB_SEPOLIA,
      event: { name: "chainChanged", data: ARBITRUM_SEPOLIA_HEX },
    });

    await walletKit.emitSessionEvent({
      topic,
      chainId: EIP155_ARB_SEPOLIA,
      event: { name: "accountsChanged", data: [safeAddr] },
    });
  }

  async function proxyReadRpc(method: string, params: unknown) {
    const publicClient = getPublicClientWithRpc(ARBITRUM_SEPOLIA);
    return publicClient.request({
      method: method as any,
      params: asArrayParams(params) as any,
    });
  }

  async function handleWcSessionRequest(event: WalletConnectRequestEvent) {
    const { id, topic, params } = event;
    const method = params.request.method;
    const requestParams = params.request.params;
    const safeAddr = latestStateRef.current.providerSafeAddress;
    const requestKey = `${topic}:${id}`;
    const now = Date.now();

    for (const [key, ts] of wcHandledRequestKeysRef.current) {
      if (now - ts > 2 * 60_000) {
        wcHandledRequestKeysRef.current.delete(key);
      }
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

      if (!safeAddr) {
        throw new Error("No Safe address configured for provider");
      }

      if (params.chainId && params.chainId !== EIP155_ARB_SEPOLIA && method !== "wallet_switchEthereumChain") {
        await respondWcRequestError(topic, id, 4901, `Unsupported chain ${params.chainId}`);
        return;
      }

      if (method === "eth_chainId") {
        await respondWcRequestSuccess(topic, id, ARBITRUM_SEPOLIA_HEX);
        return;
      }

      if (method === "net_version") {
        await respondWcRequestSuccess(topic, id, String(ARBITRUM_SEPOLIA));
        return;
      }

      if (method === "eth_accounts" || method === "eth_requestAccounts") {
        await respondWcRequestSuccess(topic, id, [safeAddr]);
        return;
      }

      if (method === "wallet_switchEthereumChain") {
        const requestedChainId = parseWalletSwitchChainId(requestParams);

        if (requestedChainId !== ARBITRUM_SEPOLIA) {
          await respondWcRequestError(topic, id, 4902, `Only Arbitrum Sepolia (${ARBITRUM_SEPOLIA}) is supported`);
          return;
        }

        await switchNetwork(ARBITRUM_SEPOLIA, Boolean(latestStateRef.current.active));
        await respondWcRequestSuccess(topic, id, null);
        await emitWcAccountAndChainChanged(topic);
        return;
      }

      if (method === "wallet_addEthereumChain") {
        const requestedChainId = parseWalletSwitchChainId(requestParams);

        if (requestedChainId !== ARBITRUM_SEPOLIA) {
          await respondWcRequestError(topic, id, 4902, `Only Arbitrum Sepolia (${ARBITRUM_SEPOLIA}) is supported`);
          return;
        }

        await switchNetwork(ARBITRUM_SEPOLIA, Boolean(latestStateRef.current.active));
        await respondWcRequestSuccess(topic, id, null);
        await emitWcAccountAndChainChanged(topic);
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
        // Mirror Safe wallet behavior for typed-data on a Safe account:
        // wrap the original typed data as a SafeMessage and sign it through Protocol Kit's
        // EIP-712 SafeMessage path (not a raw `signHash`).
        const safeSdk = await getSafeSdkOrThrow();
        const typedData = parseTypedDataParam(requestParams, safeAddr);
        const typedDataHash = hashTypedData(typedData as any);
        const safeMessage = safeSdk.createMessage(typedData as any);
        const safeMessageHash = await (safeSdk as any).getSafeMessageHash(typedDataHash);
        const { walletClient: ownerWalletClient, account: ownerAccount } = latestStateRef.current;
        if (!ownerWalletClient || !ownerAccount) {
          throw new Error("Owner wallet is not connected");
        }

        const safeEnvelopeTypedData = generateTypedData({
          safeAddress: safeAddr,
          safeVersion: safeSdk.getContractVersion(),
          chainId: await safeSdk.getChainId(),
          data: (safeMessage as any).data,
        } as any);

        const ownerSignMethod = method === "eth_signTypedData_v3" ? "eth_signTypedData_v3" : "eth_signTypedData_v4";
        const rawSignature = (await (ownerWalletClient.request as any)({
          method: ownerSignMethod,
          params: [ownerAccount, JSON.stringify(safeEnvelopeTypedData)],
        })) as Hex;

        const signature = normalizeTypedDataSignatureV(rawSignature);

        pushActivity(
          `WC typed-data signed via Safe typed-data (${method}) tdHash=${typedDataHash.slice(
            0,
            10
          )} safeHash=${String(safeMessageHash).slice(0, 10)}...`
        );

        await respondWcRequestSuccess(topic, id, signature);
        return;
      }

      if (method === "eth_sign") {
        await respondWcRequestError(topic, id, 4200, "eth_sign is not supported");
        return;
      }

      if (method === "eth_sendTransaction") {
        const [tx] = asArrayParams(requestParams);
        if (!tx || typeof tx !== "object") {
          throw new Error("Invalid transaction params");
        }

        const txParams = tx as {
          from?: string;
          to?: string;
          data?: string;
          value?: string | number;
        };

        if (txParams.from && !isSameAddress(txParams.from, safeAddr)) {
          throw new Error(`Transaction from must be Safe address ${safeAddr}`);
        }

        if (!txParams.to || !isAddress(txParams.to)) {
          throw new Error("Contract creation transactions are not supported in MVP");
        }

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

        const signedTx = await safeSdk.signTransaction(safeTransaction, undefined, safeAddr);
        const executionResult = await safeSdk.executeTransaction(signedTx);
        const hash = await Promise.resolve(executionResult.hash);

        await respondWcRequestSuccess(topic, id, hash);
        pushActivity(`Safe exec tx: ${hash}`);
        return;
      }

      if (method.startsWith("eth_") || method === "web3_clientVersion") {
        const result = await proxyReadRpc(method, requestParams);
        await respondWcRequestSuccess(topic, id, result);
        return;
      }

      await respondWcRequestError(topic, id, 4200, `Unsupported method: ${method}`);
    } catch (error) {
      const message = getNonEmptyErrorMessage(error);
      pushActivity(`WC error (${method}): ${message}`);
      if (!message.toLowerCase().includes("record was recently deleted")) {
        await respondWcRequestError(topic, id, -32000, message);
      }
    } finally {
      wcInFlightRequestKeysRef.current.delete(requestKey);
      wcHandledRequestKeysRef.current.set(requestKey, Date.now());
    }
  }

  async function handleWcSessionProposal(event: any) {
    const walletKit = walletKitRef.current;
    const safeAddr = latestStateRef.current.providerSafeAddress;

    if (!walletKit) return;

    try {
      if (!safeAddr) {
        throw new Error("Set a Safe address before approving a WalletConnect session");
      }

      await getSafeSdkOrThrow();

      const approvedNamespaces = buildApprovedNamespaces({
        proposal: event.params,
        supportedNamespaces: {
          eip155: {
            chains: [EIP155_ARB_SEPOLIA],
            methods: [...WC_SUPPORTED_METHODS],
            events: [...WC_SUPPORTED_EVENTS],
            accounts: [`${EIP155_ARB_SEPOLIA}:${safeAddr}`],
          },
        },
      });

      const session = await walletKit.approveSession({
        id: event.id,
        namespaces: approvedNamespaces,
      });

      refreshSessions();
      pushActivity(`WC session approved: ${summarizeSession(session)}`);
      setWalletKitStatus("WalletConnect wallet ready");
    } catch (error) {
      const message = getErrorMessage(error);
      pushActivity(`WC proposal rejected: ${message}`);

      await walletKit.rejectSession({
        id: event.id,
        reason: getSdkError("USER_REJECTED"),
      });
    }
  }

  useEffect(() => {
    let disposed = false;
    let mountedWalletKit: InstanceType<typeof WalletKit> | null = null;

    async function initWalletKit() {
      try {
        setWalletKitInitError(undefined);
        setWalletKitStatus("Initializing WalletConnect wallet...");

        const core = new Core({
          projectId: WC_PROJECT_ID,
        });

        const walletKit = await WalletKit.init({
          core,
          metadata: {
            name: "GMX Dev Smart Wallet",
            description: "Dev Safe wallet provider for Arbitrum Sepolia",
            url: "https://gmx.io",
            icons: ["https://gmx.io/favicon.ico"],
          },
        });

        if (disposed) return;

        mountedWalletKit = walletKit;
        walletKitRef.current = walletKit;

        const onProposal = (event: any) => {
          void handleWcSessionProposal(event);
        };

        const onRequest = (event: WalletConnectRequestEvent) => {
          void handleWcSessionRequest(event);
        };

        const onDelete = (event: { topic: string }) => {
          pushActivity(`WC session deleted: ${event.topic}`);
          refreshSessions();
        };

        walletKit.on("session_proposal", onProposal);
        walletKit.on("session_request", onRequest);
        walletKit.on("session_delete", onDelete as any);

        setIsWalletKitReady(true);
        setWalletKitStatus("WalletConnect wallet ready");
        refreshSessions();
        pushActivity("WalletConnect wallet initialized");
      } catch (error) {
        if (disposed) return;

        const message = getErrorMessage(error);
        setWalletKitInitError(message);
        setWalletKitStatus("WalletConnect wallet failed to initialize");
        pushActivity(`WalletConnect init error: ${message}`);
      }
    }

    void initWalletKit();

    return () => {
      disposed = true;

      if (mountedWalletKit) {
        (mountedWalletKit as any).removeAllListeners?.();
      }
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
      await walletKit.disconnectSession({
        topic,
        reason: getSdkError("USER_DISCONNECTED"),
      });
      refreshSessions();
      pushActivity(`Disconnected session: ${topic}`);
    } catch (error) {
      helperToast.error(getErrorMessage(error));
    }
  }

  const providerErrors = useMemo(() => {
    const errors: string[] = [];

    if (!providerSafeAddressInput.trim()) {
      errors.push("Set the Safe address that should be exposed via WalletConnect");
    } else if (!providerSafeAddress) {
      errors.push("Provider Safe address is invalid");
    }

    if (!active || !account) {
      errors.push("Connect owner EOA in this browser");
    }

    if (walletChainId !== ARBITRUM_SEPOLIA) {
      errors.push("Owner EOA must be on Arbitrum Sepolia");
    }

    if (!walletClient) {
      errors.push("Wallet client unavailable");
    }

    return errors;
  }, [account, active, providerSafeAddress, providerSafeAddressInput, walletChainId, walletClient]);

  const validatorFormError = useMemo(() => {
    if (!validatorSafeAddressInput.trim()) {
      return "Safe address is required";
    }
    if (!validatorSafeAddress) {
      return "Validator Safe address is invalid";
    }
    if (!validatorHashInput.trim()) {
      return "Hash is required";
    }
    if (!isHex(validatorHashInput) || validatorHashInput.length !== 66) {
      return "Hash must be a 32-byte hex value (0x + 64 hex chars)";
    }
    if (!validatorSignatureInput.trim()) {
      return "Signature is required";
    }
    if (!isHex(validatorSignatureInput)) {
      return "Signature must be hex";
    }
    if (validatorDomainSeparatorInput.trim()) {
      if (!isHex(validatorDomainSeparatorInput) || validatorDomainSeparatorInput.length !== 66) {
        return "Domain separator must be a 32-byte hex value (0x + 64 hex chars)";
      }
    }
    return undefined;
  }, [
    validatorDomainSeparatorInput,
    validatorHashInput,
    validatorSafeAddress,
    validatorSafeAddressInput,
    validatorSignatureInput,
  ]);

  function computeSignatureUtilsMinifiedDigest(domainSeparator: Hex, digest: Hex): Hex {
    const minifiedStructHash = keccak256(
      encodeAbiParameters([{ type: "bytes32" }, { type: "bytes32" }], [MINIFIED_TYPEHASH as Hex, digest])
    );

    return keccak256(concatHex(["0x1901", domainSeparator, minifiedStructHash]));
  }

  async function handleValidate1271Signature() {
    setValidatorError(undefined);
    setValidatorResult(undefined);

    if (validatorFormError || !validatorSafeAddress) {
      const message = validatorFormError ?? "Invalid validator inputs";
      setValidatorError(message);
      helperToast.error(message);
      return;
    }

    setIsValidatorChecking(true);

    try {
      const publicClient = getPublicClientWithRpc(ARBITRUM_SEPOLIA);
      let bytes32ReturnValue: Hex | undefined;
      let bytesReturnValue: Hex | undefined;
      let bytes32Error: string | undefined;
      let bytesError: string | undefined;

      try {
        bytes32ReturnValue = (await publicClient.readContract({
          address: validatorSafeAddress,
          abi: SAFE_1271_BYTES32_ABI,
          functionName: "isValidSignature",
          args: [validatorHashInput as Hex, validatorSignatureInput as Hex],
        })) as Hex;
      } catch (error) {
        bytes32Error = getErrorMessage(error);
      }

      try {
        bytesReturnValue = (await publicClient.readContract({
          address: validatorSafeAddress,
          abi: SAFE_1271_BYTES_ABI,
          functionName: "isValidSignature",
          args: [validatorHashInput as Hex, validatorSignatureInput as Hex],
        })) as Hex;
      } catch (error) {
        bytesError = getErrorMessage(error);
      }

      const bytes32Valid = bytes32ReturnValue?.slice(0, 10).toLowerCase() === EIP1271_MAGIC_VALUE;
      const bytesValid = bytesReturnValue?.slice(0, 10).toLowerCase() === EIP1271_BYTES_MAGIC_VALUE;
      let signatureUtilsDomainSeparator: Hex | undefined;
      let signatureUtilsMinifiedDigest: Hex | undefined;
      let signatureUtilsDigest1271ReturnValue: Hex | undefined;
      let signatureUtilsDigest1271Error: string | undefined;
      let signatureUtilsMinified1271ReturnValue: Hex | undefined;
      let signatureUtilsMinified1271Error: string | undefined;

      if (validatorDomainSeparatorInput.trim()) {
        signatureUtilsDomainSeparator = validatorDomainSeparatorInput as Hex;
        signatureUtilsMinifiedDigest = computeSignatureUtilsMinifiedDigest(
          signatureUtilsDomainSeparator,
          validatorHashInput as Hex
        );

        try {
          signatureUtilsDigest1271ReturnValue = (await publicClient.readContract({
            address: validatorSafeAddress,
            abi: SAFE_1271_BYTES32_ABI,
            functionName: "isValidSignature",
            args: [validatorHashInput as Hex, validatorSignatureInput as Hex],
          })) as Hex;
        } catch (error) {
          signatureUtilsDigest1271Error = getErrorMessage(error);
        }

        try {
          signatureUtilsMinified1271ReturnValue = (await publicClient.readContract({
            address: validatorSafeAddress,
            abi: SAFE_1271_BYTES32_ABI,
            functionName: "isValidSignature",
            args: [signatureUtilsMinifiedDigest, validatorSignatureInput as Hex],
          })) as Hex;
        } catch (error) {
          signatureUtilsMinified1271Error = getErrorMessage(error);
        }
      }

      const signatureUtilsDigestValid =
        signatureUtilsDigest1271ReturnValue?.slice(0, 10).toLowerCase() === EIP1271_MAGIC_VALUE;
      const signatureUtilsMinifiedValid =
        signatureUtilsMinified1271ReturnValue?.slice(0, 10).toLowerCase() === EIP1271_MAGIC_VALUE;
      const signatureUtils1271Valid =
        validatorDomainSeparatorInput.trim().length > 0
          ? Boolean(signatureUtilsDigestValid || signatureUtilsMinifiedValid)
          : undefined;

      const isValid = Boolean(bytes32Valid || bytesValid || signatureUtils1271Valid);

      setValidatorResult({
        safeAddress: validatorSafeAddress,
        hash: validatorHashInput as Hex,
        bytes32ReturnValue,
        bytesReturnValue,
        bytes32Error,
        bytesError,
        signatureUtilsDomainSeparator,
        signatureUtilsMinifiedDigest,
        signatureUtilsDigest1271ReturnValue,
        signatureUtilsDigest1271Error,
        signatureUtilsMinified1271ReturnValue,
        signatureUtilsMinified1271Error,
        signatureUtils1271Valid,
        isValid,
      });

      pushActivity(
        `1271 check (${validatorSafeAddress}): ${
          isValid
            ? `valid${bytes32Valid ? " [bytes32]" : ""}${bytesValid ? " [bytes]" : ""}`
            : `invalid (${bytes32ReturnValue ?? bytesReturnValue ?? "reverted"})`
        }`
      );
      helperToast[isValid ? "success" : "info"](
        isValid ? t`1271 signature is valid` : t`1271 signature is invalid (magic mismatch)`
      );

      if (!bytes32ReturnValue && !bytesReturnValue) {
        const firstError = bytes32Error ?? bytesError;
        if (firstError) {
          const safeHint = getSafeContractErrorHint(firstError);
          const detailedMessage = safeHint ? `${firstError}\n\nSafe code: ${safeHint}` : firstError;
          setValidatorError(detailedMessage);
        }
      }
    } catch (error) {
      const message = getErrorMessage(error);
      const safeHint = getSafeContractErrorHint(message);
      const detailedMessage = safeHint ? `${message}\n\nSafe code: ${safeHint}` : message;

      setValidatorError(detailedMessage);
      pushActivity(`1271 check error: ${safeHint ?? message}`);
      helperToast.error(safeHint ? t`1271 validation failed (${safeHint})` : t`1271 validation failed: ${message}`);
    } finally {
      setIsValidatorChecking(false);
    }
  }

  return (
    <AppPageLayout title="Dev Smart Wallet">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-16">
        <div className="rounded-8 border-1/2 border-slate-600 bg-slate-950/50 p-16">
          <h1 className="text-24 font-medium">
            <Trans>Dev Smart Wallet (Safe on Arbitrum Sepolia)</Trans>
          </h1>
          <p className="mt-8 text-13 text-typography-secondary">
            <Trans>
              Use this page as a Safe deployer and a WalletConnect wallet-provider MVP. Keep /trade open in another
              browser tab/window and pair it here by pasting the WalletConnect URI.
            </Trans>
          </p>

          <div className="mt-12 flex flex-wrap items-center gap-8 text-13">
            <div className="rounded-8 border border-slate-700 px-10 py-6">
              <Trans>Target chain</Trans>: {getChainName(ARBITRUM_SEPOLIA)} ({ARBITRUM_SEPOLIA})
            </div>
            <div className="rounded-8 border border-slate-700 px-10 py-6">
              <Trans>Owner wallet</Trans>: {active && account ? account : t`Not connected`}
            </div>
            <div className="rounded-8 border border-slate-700 px-10 py-6">
              <Trans>Owner chain</Trans>: {walletChainId ?? t`-`}
            </div>
            <div className="rounded-8 border border-slate-700 px-10 py-6">
              <Trans>WC Wallet status</Trans>: {walletKitStatus}
            </div>
          </div>

          <div className="mt-12 flex flex-wrap gap-8">
            {!active ? (
              <ConnectWalletButton onClick={() => openConnectModal?.()}>
                <Trans>Connect owner wallet</Trans>
              </ConnectWalletButton>
            ) : null}

            <Button variant="secondary" onClick={handleSwitchNetwork}>
              <Trans>Switch owner to Arbitrum Sepolia</Trans>
            </Button>
          </div>

          {walletKitInitError && (
            <div className="text-red-200 mt-12 rounded-8 border border-red-500/40 bg-red-500/10 p-12 text-13">
              {walletKitInitError}
            </div>
          )}
        </div>

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

          <div className="mt-12 grid gap-16">
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
                  if (!safeAddress) return;
                  setProviderSafeAddressInput(safeAddress);
                }}
                disabled={!safeAddress}
              >
                <Trans>Use last created Safe</Trans>
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

        <form onSubmit={handleSubmit} className="rounded-8 border-1/2 border-slate-600 bg-slate-950/50 p-16">
          <h2 className="text-18 font-medium">
            <Trans>Deploy Safe</Trans>
          </h2>

          <div className="mt-16 grid gap-16">
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
                disabled={!active || !walletClient || !isOnTargetNetwork || isSubmitting || formErrors.length > 0}
              >
                {isSubmitting ? t`Creating Safe...` : t`Create Safe on Arbitrum Sepolia`}
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
                  href={`${explorerUrl}tx/${txHash}`}
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
                  href={`${explorerUrl}address/${safeAddress}`}
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

        <div className="rounded-8 border-1/2 border-slate-600 bg-slate-950/50 p-16">
          <h2 className="text-18 font-medium">
            <Trans>ERC-1271 Signature Validator</Trans>
          </h2>
          <p className="mt-8 text-13 text-typography-secondary">
            <Trans>
              Tests <code>isValidSignature(bytes32,bytes)</code> on the Safe contract on Arbitrum Sepolia and shows the
              returned magic value.
            </Trans>
          </p>

          <div className="mt-16 grid gap-16">
            <AddressInput
              id="validatorSafeAddress"
              label={t`Safe address (validator target)`}
              value={validatorSafeAddressInput}
              onChange={setValidatorSafeAddressInput}
            />

            <div>
              <label className="mb-6 block text-13 font-medium text-typography-primary" htmlFor="validatorHash">
                <Trans>Hash (bytes32)</Trans>
              </label>
              <input
                id="validatorHash"
                value={validatorHashInput}
                onChange={(e) => setValidatorHashInput(e.target.value.trim())}
                placeholder="0x..."
                className="w-full rounded-8 border border-slate-800 bg-slate-800 px-12 py-10 text-14 outline-none focus:border-blue-400"
              />
            </div>

            <div>
              <label
                className="mb-6 block text-13 font-medium text-typography-primary"
                htmlFor="validatorDomainSeparator"
              >
                <Trans>Domain separator (optional, for SignatureUtils-style minified check)</Trans>
              </label>
              <input
                id="validatorDomainSeparator"
                value={validatorDomainSeparatorInput}
                onChange={(e) => setValidatorDomainSeparatorInput(e.target.value.trim())}
                placeholder="0x..."
                className="w-full rounded-8 border border-slate-800 bg-slate-800 px-12 py-10 text-14 outline-none focus:border-blue-400"
              />
            </div>

            <div>
              <label className="mb-6 block text-13 font-medium text-typography-primary" htmlFor="validatorSignature">
                <Trans>Signature (hex)</Trans>
              </label>
              <textarea
                id="validatorSignature"
                rows={4}
                value={validatorSignatureInput}
                onChange={(e) => setValidatorSignatureInput(e.target.value.trim())}
                placeholder="0x..."
                className="w-full rounded-8 border border-slate-800 bg-slate-800 px-12 py-10 text-14 outline-none focus:border-blue-400"
              />
            </div>

            {validatorFormError && (
              <div className="text-yellow-200 rounded-8 border border-yellow-500/40 bg-yellow-500/10 p-12 text-13">
                {validatorFormError}
              </div>
            )}

            {validatorError && (
              <div className="text-red-200 rounded-8 border border-red-500/40 bg-red-500/10 p-12 text-13">
                {validatorError}
              </div>
            )}

            <div className="flex flex-wrap gap-8">
              <Button
                variant="primary-action"
                onClick={handleValidate1271Signature}
                disabled={Boolean(validatorFormError) || isValidatorChecking}
              >
                {isValidatorChecking ? t`Checking...` : t`Check ERC-1271 Validity`}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  if (providerSafeAddressInput.trim()) {
                    setValidatorSafeAddressInput(providerSafeAddressInput.trim());
                  }
                }}
                disabled={!providerSafeAddressInput.trim()}
              >
                <Trans>Use provider Safe address</Trans>
              </Button>
            </div>

            {validatorResult && (
              <div
                className={`rounded-8 border p-12 text-13 ${
                  validatorResult.isValid
                    ? "text-green-200 border-green-500/40 bg-green-500/10"
                    : "text-yellow-200 border-yellow-500/40 bg-yellow-500/10"
                }`}
              >
                <div>
                  <Trans>Result</Trans>: {validatorResult.isValid ? t`Valid` : t`Invalid`}
                </div>
                <div className="mt-6 break-all">
                  <Trans>bytes32 overload</Trans>:{" "}
                  {validatorResult.bytes32ReturnValue ?? validatorResult.bytes32Error ?? t`No result`}
                </div>
                <div className="mt-6 break-all">
                  <Trans>bytes overload</Trans>:{" "}
                  {validatorResult.bytesReturnValue ?? validatorResult.bytesError ?? t`No result`}
                </div>
                <div className="mt-6 break-all text-typography-secondary">
                  <Trans>Expected bytes32 magic</Trans>: {EIP1271_MAGIC_VALUE}
                </div>
                <div className="mt-6 break-all text-typography-secondary">
                  <Trans>Expected bytes magic</Trans>: {EIP1271_BYTES_MAGIC_VALUE}
                </div>
                {validatorResult.signatureUtilsDomainSeparator && (
                  <>
                    <div className="mt-8 break-all text-typography-secondary">
                      <Trans>SignatureUtils minifiedDigest</Trans>: {validatorResult.signatureUtilsMinifiedDigest}
                    </div>
                    <div className="mt-6 break-all">
                      <Trans>SignatureUtils 1271 on digest</Trans>:{" "}
                      {validatorResult.signatureUtilsDigest1271ReturnValue ??
                        validatorResult.signatureUtilsDigest1271Error ??
                        t`No result`}
                    </div>
                    <div className="mt-6 break-all">
                      <Trans>SignatureUtils 1271 on minifiedDigest</Trans>:{" "}
                      {validatorResult.signatureUtilsMinified1271ReturnValue ??
                        validatorResult.signatureUtilsMinified1271Error ??
                        t`No result`}
                    </div>
                    <div className="mt-6 break-all text-typography-secondary">
                      <Trans>SignatureUtils-style 1271 path</Trans>:{" "}
                      {validatorResult.signatureUtils1271Valid === undefined
                        ? t`N/A`
                        : validatorResult.signatureUtils1271Valid
                          ? t`Pass`
                          : t`Fail`}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppPageLayout>
  );
}

function AddressInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-6 block text-13 font-medium text-typography-primary" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-8 border border-slate-800 bg-slate-800 px-12 py-10 text-14 outline-none focus:border-blue-400"
      />
    </div>
  );
}
