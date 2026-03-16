import {
  getCompatibilityFallbackHandlerDeployment,
  getCreateCallDeployment,
  getMultiSendCallOnlyDeployment,
  getMultiSendDeployment,
  getProxyFactoryDeployment,
  getSafeL2SingletonDeployment,
  getSignMessageLibDeployment,
  getSimulateTxAccessorDeployment,
} from "@safe-global/safe-deployments";
import { getAddress, isAddress, keccak256, parseAbi, type Address } from "viem";

import { ARBITRUM_SEPOLIA, SOURCE_SEPOLIA } from "config/chains";

export const SAFE_PROXY_FACTORY_ABI = parseAbi([
  "function createProxyWithNonce(address _singleton, bytes initializer, uint256 saltNonce) returns (address proxy)",
  "event ProxyCreation(address proxy, address singleton)",
]);

export const SAFE_ABI = parseAbi([
  "function setup(address[] _owners,uint256 _threshold,address to,bytes data,address fallbackHandler,address paymentToken,uint256 payment,address paymentReceiver)",
]);
export const SAFE_1271_BYTES32_ABI = parseAbi([
  "function isValidSignature(bytes32 _hash, bytes _signature) view returns (bytes4)",
]);
export const SAFE_1271_BYTES_ABI = parseAbi([
  "function isValidSignature(bytes _data, bytes _signature) view returns (bytes4)",
]);
export const SAFE_VERSION_ABI = parseAbi(["function VERSION() view returns (string)"]);

export const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);

export const EIP1271_MAGIC_VALUE = "0x1626ba7e";
export const EIP1271_BYTES_MAGIC_VALUE = "0x20c13b0b";
export const MINIFIED_TYPEHASH = keccak256("0x4d696e696669656428627974657333322064696765737429");
export const SAFE_TARGET_VERSION = "1.4.1";

export const SAFE_CONTRACT_ERROR_CODE_MESSAGES: Record<string, string> = {
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

export const WC_PROJECT_ID = "de24cddbaf2a68f027eae30d9bb5df58";

export const DEV_SMART_WALLET_TABS = ["main", "deploy", "signature", "topup"] as const;
export type DevSmartWalletTab = (typeof DEV_SMART_WALLET_TABS)[number];
export const DEV_SMART_WALLET_TAB_LABELS: Record<DevSmartWalletTab, string> = {
  main: "Main",
  deploy: "Deploy",
  signature: "Signature",
  topup: "Multichain Top Up",
};

export const DEV_SMART_WALLET_PROVIDER_SAFE_LS_KEY = "devSmartWallet.providerSafeAddress";
export const DEV_SMART_WALLET_PROVIDER_CHAIN_LS_KEY = "devSmartWallet.providerChainId";
export const DEV_SMART_WALLET_SAVED_PROFILES_LS_KEY = "devSmartWallet.savedProfiles";

export const DEPLOY_SUPPORTED_CHAINS = [ARBITRUM_SEPOLIA, SOURCE_SEPOLIA] as const;
export type DeploySupportedChainId = (typeof DEPLOY_SUPPORTED_CHAINS)[number];

export type SavedSmartWalletProfile = {
  safeAddress: Address;
  chainId: DeploySupportedChainId;
  owners: Address[];
  createdAt: number;
  updatedAt: number;
  saltNonce?: string;
};

export type TopUpToken = { symbol: string; address: Address; decimals: number; isNative?: boolean };

export const TOPUP_TOKENS: Record<typeof ARBITRUM_SEPOLIA, TopUpToken[]> = {
  [ARBITRUM_SEPOLIA]: [
    { symbol: "ETH", address: "0x0000000000000000000000000000000000000000" as Address, decimals: 18, isNative: true },
    { symbol: "WETH", address: "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73" as Address, decimals: 18 },
    { symbol: "USDC", address: "0x3321Fd36aEaB0d5CdfD26f4A3A93E2D2aAcCB99f" as Address, decimals: 6 },
    { symbol: "USDC.SG", address: "0x3253a335E7bFfB4790Aa4C25C4250d206E9b9773" as Address, decimals: 6 },
    { symbol: "USDT", address: "0x095f40616FA98Ff75D1a7D0c68685c5ef806f110" as Address, decimals: 6 },
    { symbol: "BTC", address: "0xF79cE1Cf38A09D572b021B4C5548b75A14082F12" as Address, decimals: 8 },
  ],
};

const DEPLOY_SAFE_DEFAULTS_FALLBACK: Record<
  DeploySupportedChainId,
  { proxyFactoryAddress: Address; singletonAddress: Address; fallbackHandlerAddress: Address }
> = {
  [ARBITRUM_SEPOLIA]: {
    proxyFactoryAddress: "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67" as Address,
    singletonAddress: "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762" as Address,
    fallbackHandlerAddress: "0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99" as Address,
  },
  [SOURCE_SEPOLIA]: {
    proxyFactoryAddress: "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67" as Address,
    singletonAddress: "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762" as Address,
    fallbackHandlerAddress: "0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99" as Address,
  },
};

const SAFE_SHARED_DEFAULTS_FALLBACK = {
  multiSendAddress: "0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526" as Address,
  multiSendCallOnlyAddress: "0x9641d764fc13c8B624c04430C7356C1C7C8102e2" as Address,
  signMessageLibAddress: "0xd53cd0aB83D845Ac265BE939c57F53AD838012c9" as Address,
  createCallAddress: "0x9b35Af71d77eaf8d7e40252370304687390A1A52" as Address,
  simulateTxAccessorAddress: "0x3d4BA2E0884aa488718476ca2FB8Efc291A46199" as Address,
};

function getSafeDeployDefaultsForChain(chainId: DeploySupportedChainId) {
  const fallback = DEPLOY_SAFE_DEFAULTS_FALLBACK[chainId];
  try {
    const network = String(chainId);
    const deploymentFilter = { network, version: SAFE_TARGET_VERSION };
    const proxyFactory = getProxyFactoryDeployment(deploymentFilter);
    const singleton = getSafeL2SingletonDeployment(deploymentFilter);
    const fallbackHandler = getCompatibilityFallbackHandlerDeployment(deploymentFilter);
    const proxyFactoryAddress = proxyFactory?.networkAddresses?.[network];
    const singletonAddress = singleton?.networkAddresses?.[network];
    const fallbackHandlerAddress = fallbackHandler?.networkAddresses?.[network];
    if (proxyFactoryAddress && singletonAddress && fallbackHandlerAddress) {
      return {
        proxyFactoryAddress: getAddress(proxyFactoryAddress),
        singletonAddress: getAddress(singletonAddress),
        fallbackHandlerAddress: getAddress(fallbackHandlerAddress),
      };
    }
  } catch {
    // Fall back to known addresses if package lookups fail for this chain/runtime.
  }
  return fallback;
}

function getSafeSharedDefaultsForChain(chainId: DeploySupportedChainId) {
  const fallback = SAFE_SHARED_DEFAULTS_FALLBACK;
  try {
    const network = String(chainId);
    const deploymentFilter = { network, version: SAFE_TARGET_VERSION };
    const multiSend = getMultiSendDeployment(deploymentFilter);
    const multiSendCallOnly = getMultiSendCallOnlyDeployment(deploymentFilter);
    const signMessageLib = getSignMessageLibDeployment(deploymentFilter);
    const createCall = getCreateCallDeployment(deploymentFilter);
    const simulateTxAccessor = getSimulateTxAccessorDeployment(deploymentFilter);
    const multiSendAddress = multiSend?.networkAddresses?.[network];
    const multiSendCallOnlyAddress = multiSendCallOnly?.networkAddresses?.[network];
    const signMessageLibAddress = signMessageLib?.networkAddresses?.[network];
    const createCallAddress = createCall?.networkAddresses?.[network];
    const simulateTxAccessorAddress = simulateTxAccessor?.networkAddresses?.[network];
    if (
      multiSendAddress &&
      multiSendCallOnlyAddress &&
      signMessageLibAddress &&
      createCallAddress &&
      simulateTxAccessorAddress
    ) {
      return {
        multiSendAddress: getAddress(multiSendAddress),
        multiSendCallOnlyAddress: getAddress(multiSendCallOnlyAddress),
        signMessageLibAddress: getAddress(signMessageLibAddress),
        createCallAddress: getAddress(createCallAddress),
        simulateTxAccessorAddress: getAddress(simulateTxAccessorAddress),
      };
    }
  } catch {
    // Fall back to known addresses if package lookups fail for this chain/runtime.
  }
  return fallback;
}

export const DEPLOY_SAFE_DEFAULTS_BY_CHAIN: Record<
  DeploySupportedChainId,
  { proxyFactoryAddress: Address; singletonAddress: Address; fallbackHandlerAddress: Address }
> = {
  [ARBITRUM_SEPOLIA]: getSafeDeployDefaultsForChain(ARBITRUM_SEPOLIA),
  [SOURCE_SEPOLIA]: getSafeDeployDefaultsForChain(SOURCE_SEPOLIA),
};

const SAFE_SHARED_DEFAULTS_BY_CHAIN: Record<
  DeploySupportedChainId,
  {
    multiSendAddress: Address;
    multiSendCallOnlyAddress: Address;
    signMessageLibAddress: Address;
    createCallAddress: Address;
    simulateTxAccessorAddress: Address;
  }
> = {
  [ARBITRUM_SEPOLIA]: getSafeSharedDefaultsForChain(ARBITRUM_SEPOLIA),
  [SOURCE_SEPOLIA]: getSafeSharedDefaultsForChain(SOURCE_SEPOLIA),
};

export const SAFE_CONTRACT_NETWORKS = {
  [ARBITRUM_SEPOLIA]: {
    safeSingletonAddress: DEPLOY_SAFE_DEFAULTS_BY_CHAIN[ARBITRUM_SEPOLIA].singletonAddress,
    safeProxyFactoryAddress: DEPLOY_SAFE_DEFAULTS_BY_CHAIN[ARBITRUM_SEPOLIA].proxyFactoryAddress,
    multiSendAddress: SAFE_SHARED_DEFAULTS_BY_CHAIN[ARBITRUM_SEPOLIA].multiSendAddress,
    multiSendCallOnlyAddress: SAFE_SHARED_DEFAULTS_BY_CHAIN[ARBITRUM_SEPOLIA].multiSendCallOnlyAddress,
    fallbackHandlerAddress: DEPLOY_SAFE_DEFAULTS_BY_CHAIN[ARBITRUM_SEPOLIA].fallbackHandlerAddress,
    signMessageLibAddress: SAFE_SHARED_DEFAULTS_BY_CHAIN[ARBITRUM_SEPOLIA].signMessageLibAddress,
    createCallAddress: SAFE_SHARED_DEFAULTS_BY_CHAIN[ARBITRUM_SEPOLIA].createCallAddress,
    simulateTxAccessorAddress: SAFE_SHARED_DEFAULTS_BY_CHAIN[ARBITRUM_SEPOLIA].simulateTxAccessorAddress,
  },
  [SOURCE_SEPOLIA]: {
    safeSingletonAddress: DEPLOY_SAFE_DEFAULTS_BY_CHAIN[SOURCE_SEPOLIA].singletonAddress,
    safeProxyFactoryAddress: DEPLOY_SAFE_DEFAULTS_BY_CHAIN[SOURCE_SEPOLIA].proxyFactoryAddress,
    multiSendAddress: SAFE_SHARED_DEFAULTS_BY_CHAIN[SOURCE_SEPOLIA].multiSendAddress,
    multiSendCallOnlyAddress: SAFE_SHARED_DEFAULTS_BY_CHAIN[SOURCE_SEPOLIA].multiSendCallOnlyAddress,
    fallbackHandlerAddress: DEPLOY_SAFE_DEFAULTS_BY_CHAIN[SOURCE_SEPOLIA].fallbackHandlerAddress,
    signMessageLibAddress: SAFE_SHARED_DEFAULTS_BY_CHAIN[SOURCE_SEPOLIA].signMessageLibAddress,
    createCallAddress: SAFE_SHARED_DEFAULTS_BY_CHAIN[SOURCE_SEPOLIA].createCallAddress,
    simulateTxAccessorAddress: SAFE_SHARED_DEFAULTS_BY_CHAIN[SOURCE_SEPOLIA].simulateTxAccessorAddress,
  },
};

export const WC_SUPPORTED_METHODS = [
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

export const WC_SUPPORTED_EVENTS = ["accountsChanged", "chainChanged"] as const;

export type WalletKitSessionMap = Record<string, any>;

export type WalletConnectRequestEvent = {
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

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

export function parseOwnersInput(value: string) {
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

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error && "message" in error && typeof (error as any).message === "string") {
    return (error as any).message;
  }
  return String(error);
}

export function getNonEmptyErrorMessage(error: unknown) {
  const message = getErrorMessage(error).trim();
  return message || "Unknown wallet error (empty message)";
}

export function getSafeContractErrorHint(message: string) {
  const match = message.match(/\bGS\d{3}\b/);
  if (!match) return undefined;
  const code = match[0];
  const description = SAFE_CONTRACT_ERROR_CODE_MESSAGES[code];
  if (!description) return undefined;
  return `${code}: ${description}`;
}

export function isSameAddress(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  if (!isAddress(a) || !isAddress(b)) return false;
  return getAddress(a) === getAddress(b);
}

export function asArrayParams(params: unknown): unknown[] {
  if (Array.isArray(params)) return params;
  if (params === undefined) return [];
  return [params];
}

export function parseBigIntLike(value: unknown, fallback = 0n) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string") return BigInt(value);
  throw new Error("Invalid bigint value");
}

export function formatLogLine(message: string) {
  return `${new Date().toLocaleTimeString()} ${message}`;
}

export function isStaleWcRequestError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("record was recently deleted") ||
    (normalized.includes("no matching key") && normalized.includes("history"))
  );
}

export function summarizeSession(session: any) {
  const peer = session?.peer?.metadata;
  const name = peer?.name || "Unknown dapp";
  const url = peer?.url || "";
  return url ? `${name} (${url})` : name;
}

export function getSessionDeduplicationKey(session: any) {
  const peer = session?.peer?.metadata;
  const peerName = peer?.name || "";
  const peerUrl = peer?.url || "";
  const accounts = Array.isArray(session?.namespaces?.eip155?.accounts)
    ? [...session.namespaces.eip155.accounts].sort().join("|")
    : "";
  return `${peerName}|${peerUrl}|${accounts}`;
}

export function toEip155Chain(chainId: number) {
  return `eip155:${chainId}`;
}

export function parseSessionChainId(chainId: unknown): number | undefined {
  if (typeof chainId !== "string" || !chainId) return undefined;
  if (chainId.startsWith("eip155:")) {
    const parsed = Number(chainId.slice("eip155:".length));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (chainId.startsWith("0x")) {
    try {
      const parsed = Number(BigInt(chainId));
      return Number.isFinite(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  const parsed = Number(chainId);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseWalletSwitchChainId(params: unknown): number | undefined {
  const [request] = asArrayParams(params);
  if (!request || typeof request !== "object") return undefined;
  const chainId = (request as { chainId?: unknown }).chainId;
  if (typeof chainId === "string") {
    return Number(chainId.startsWith("0x") ? BigInt(chainId) : Number(chainId));
  }
  if (typeof chainId === "number") return chainId;
  return undefined;
}

export function parseSavedSmartWalletProfiles(raw: string | null): SavedSmartWalletProfile[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return undefined;
        const safeAddressValue = (item as any).safeAddress;
        const chainIdValue = Number((item as any).chainId);
        const ownersValue = Array.isArray((item as any).owners) ? (item as any).owners : [];
        if (!isAddress(safeAddressValue) || !DEPLOY_SUPPORTED_CHAINS.includes(chainIdValue as DeploySupportedChainId)) {
          return undefined;
        }
        const owners = ownersValue
          .filter((owner: unknown) => typeof owner === "string" && isAddress(owner))
          .map((owner: string) => getAddress(owner));
        const createdAt = Number((item as any).createdAt);
        const updatedAt = Number((item as any).updatedAt);
        const saltNonce = typeof (item as any).saltNonce === "string" ? (item as any).saltNonce : undefined;
        return {
          safeAddress: getAddress(safeAddressValue),
          chainId: chainIdValue as DeploySupportedChainId,
          owners,
          createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
          updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
          saltNonce,
        } satisfies SavedSmartWalletProfile;
      })
      .filter(Boolean)
      .sort((a, b) => b!.updatedAt - a!.updatedAt) as SavedSmartWalletProfile[];
  } catch {
    return [];
  }
}

export function parseSupportedChainId(value: unknown): DeploySupportedChainId | undefined {
  const chainId = Number(value);
  return DEPLOY_SUPPORTED_CHAINS.includes(chainId as DeploySupportedChainId)
    ? (chainId as DeploySupportedChainId)
    : undefined;
}

// ---------------------------------------------------------------------------
// AddressInput component
// ---------------------------------------------------------------------------

export function AddressInput({
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
