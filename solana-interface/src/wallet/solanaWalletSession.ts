export type RememberedSolanaWallet = {
  address: string;
  name: string;
};

export type SolanaWalletCandidate = RememberedSolanaWallet & {
  embedded: boolean;
};

export type SolanaSessionAction =
  | { type: "select"; wallet: RememberedSolanaWallet }
  | { type: "disconnect"; wallet: RememberedSolanaWallet }
  | { type: "createEmbedded" }
  | { type: "openConnect"; preSelectedWalletId?: string }
  | { type: "none" };

const REMEMBERED_SOLANA_WALLET_KEY = "remembered-solana-wallet";
const SUPPRESSED_SOLANA_WALLET_KEY = "suppressed-solana-wallet";

const SOCIAL_LOGIN_TYPES = new Set(["email", "google_oauth", "twitter_oauth", "discord_oauth", "passkey"]);

const DUAL_CHAIN_WALLETS = [
  { evmClientTypes: ["phantom"], names: ["phantom"], preSelectedWalletId: "phantom" },
  { evmClientTypes: ["okx_wallet", "okx"], names: ["okx"], preSelectedWalletId: "okx_wallet" },
  { evmClientTypes: ["coinbase_wallet"], names: ["coinbase"], preSelectedWalletId: "coinbase_wallet" },
];

const listeners = new Set<() => void>();
let rememberedRaw: string | null | undefined;
let rememberedSnapshot: RememberedSolanaWallet | null = null;

function emitSolanaWalletStore() {
  listeners.forEach((listener) => listener());
}

export function subscribeSolanaWalletStore(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isSocialLogin(accountTypes: readonly string[]) {
  return accountTypes.some((accountType) => SOCIAL_LOGIN_TYPES.has(accountType));
}

export function readRememberedSolanaWallet(): RememberedSolanaWallet | null {
  const raw = localStorage.getItem(REMEMBERED_SOLANA_WALLET_KEY);
  if (raw === rememberedRaw) return rememberedSnapshot;

  rememberedRaw = raw;
  if (!raw) {
    rememberedSnapshot = null;
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "address" in parsed &&
      "name" in parsed &&
      typeof parsed.address === "string" &&
      typeof parsed.name === "string"
    ) {
      rememberedSnapshot = { address: parsed.address, name: parsed.name };
      return rememberedSnapshot;
    }
  } catch {
    // Ignore a corrupted value and treat the wallet as not remembered.
  }

  rememberedSnapshot = null;
  return null;
}

export function rememberSolanaWallet(wallet: RememberedSolanaWallet) {
  const current = readRememberedSolanaWallet();
  if (current?.address === wallet.address && current.name === wallet.name) return;

  rememberedSnapshot = wallet;
  rememberedRaw = JSON.stringify(wallet);
  localStorage.setItem(REMEMBERED_SOLANA_WALLET_KEY, rememberedRaw);
  emitSolanaWalletStore();
}

export function clearRememberedSolanaWallet() {
  if (localStorage.getItem(REMEMBERED_SOLANA_WALLET_KEY) === null) return;
  rememberedRaw = null;
  rememberedSnapshot = null;
  localStorage.removeItem(REMEMBERED_SOLANA_WALLET_KEY);
  emitSolanaWalletStore();
}

export function readSuppressedSolanaWallet() {
  return localStorage.getItem(SUPPRESSED_SOLANA_WALLET_KEY);
}

export function suppressSolanaWallet(address: string) {
  if (readSuppressedSolanaWallet() === address) return;
  localStorage.setItem(SUPPRESSED_SOLANA_WALLET_KEY, address);
  emitSolanaWalletStore();
}

export function clearSuppressedSolanaWallet() {
  if (localStorage.getItem(SUPPRESSED_SOLANA_WALLET_KEY) === null) return;
  localStorage.removeItem(SUPPRESSED_SOLANA_WALLET_KEY);
  emitSolanaWalletStore();
}

function dualChainWallet(evmWalletClientType: string | undefined) {
  if (!evmWalletClientType) return undefined;
  const normalized = evmWalletClientType.toLowerCase();
  return DUAL_CHAIN_WALLETS.find((entry) => entry.evmClientTypes.includes(normalized));
}

function preSelectedWalletIdForName(name: string) {
  const normalized = name.toLowerCase();
  return DUAL_CHAIN_WALLETS.find((entry) => entry.names.some((walletName) => normalized.includes(walletName)))
    ?.preSelectedWalletId;
}

function openConnect(preSelectedWalletId?: string): SolanaSessionAction {
  return preSelectedWalletId ? { type: "openConnect", preSelectedWalletId } : { type: "openConnect" };
}

export function decideSolanaSession({
  connected,
  remembered,
  suppressedAddress,
  isSocial,
  evmWalletClientType,
  networkChanged,
}: {
  connected: SolanaWalletCandidate[];
  remembered: RememberedSolanaWallet | null;
  suppressedAddress: string | null;
  isSocial: boolean;
  evmWalletClientType?: string;
  networkChanged: boolean;
}): SolanaSessionAction {
  if (suppressedAddress) {
    const suppressedWallet = connected.find((wallet) => wallet.address === suppressedAddress);
    if (suppressedWallet) {
      return { type: "disconnect", wallet: { address: suppressedWallet.address, name: suppressedWallet.name } };
    }
  }

  if (remembered && remembered.address !== suppressedAddress) {
    const rememberedWallet = connected.find((wallet) => wallet.address === remembered.address);
    if (rememberedWallet) return { type: "select", wallet: remembered };
    if (!networkChanged) return { type: "none" };
    if (isSocial && remembered.name.toLowerCase().includes("privy")) return { type: "createEmbedded" };
    return openConnect(preSelectedWalletIdForName(remembered.name));
  }

  const embeddedWallet = connected.find((wallet) => wallet.embedded && wallet.address !== suppressedAddress);
  if (isSocial && embeddedWallet) {
    return { type: "select", wallet: { address: embeddedWallet.address, name: embeddedWallet.name } };
  }

  const dualChain = dualChainWallet(evmWalletClientType);
  const dualChainMatch = dualChain
    ? connected.find(
        (wallet) =>
          wallet.address !== suppressedAddress &&
          dualChain.names.some((walletName) => wallet.name.toLowerCase().includes(walletName))
      )
    : undefined;
  if (dualChainMatch) {
    return { type: "select", wallet: { address: dualChainMatch.address, name: dualChainMatch.name } };
  }

  if (!networkChanged) return { type: "none" };
  if (isSocial && !suppressedAddress) return { type: "createEmbedded" };
  return openConnect(dualChain?.preSelectedWalletId);
}

const PRICE_KEYS = ["price", "indexPrice", "usdPrice", "markPrice"] as const;

export function indexTokenPrices(message: unknown) {
  const prices: Record<string, number> = {};
  const seen = new WeakSet<object>();

  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (seen.has(value)) return;
    seen.add(value);

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    const record = value as Record<string, unknown>;
    const symbol = record.symbol ?? record.tokenSymbol;
    const priceValue = PRICE_KEYS.map((key) => record[key]).find(
      (item) => typeof item === "number" || (typeof item === "string" && item !== "")
    );
    const price = typeof priceValue === "number" ? priceValue : typeof priceValue === "string" ? Number(priceValue) : undefined;

    if (typeof symbol === "string" && price !== undefined && Number.isFinite(price) && price > 0) {
      prices[symbol.toUpperCase()] = price;
    }

    const mint = record.mint ?? record.mintAddress;
    if (typeof mint === "string" && price !== undefined && Number.isFinite(price) && price > 0) {
      prices[mint] = price;
    }

    Object.values(record).forEach(visit);
  };

  visit(message);
  return prices;
}

export function solanaTokenUsd(amount: bigint, decimals: number, price: number | undefined) {
  if (price === undefined || !Number.isFinite(price) || price <= 0) return undefined;

  const priceScaled = BigInt(Math.round(price * 1e8));
  return (amount * priceScaled * 10n ** 22n) / 10n ** BigInt(decimals);
}
