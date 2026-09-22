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
  if (isSocial && embeddedWallet && !suppressedAddress) {
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

// Backend `price` is a 20-decimal USD integer. GMX USD amounts are 30 decimals.
const INDEX_PRICE_TO_USD = 10n ** 10n;

export function indexTokenPrices(message: unknown) {
  const prices: Record<string, bigint> = {};
  if (!message || typeof message !== "object") return prices;

  const payload = (message as { payload?: unknown }).payload;
  if (!Array.isArray(payload)) return prices;

  for (const item of payload) {
    if (!item || typeof item !== "object") continue;
    const record = item as { symbol?: unknown; indexToken?: unknown; price?: unknown };
    if (typeof record.price !== "string" || !/^\d+$/.test(record.price)) continue;

    const price = BigInt(record.price) * INDEX_PRICE_TO_USD;
    if (price <= 0n) continue;
    if (typeof record.symbol === "string") prices[record.symbol.toUpperCase()] = price;
    if (typeof record.indexToken === "string") prices[record.indexToken] = price;
  }

  return prices;
}

export function solanaTokenUsd(amount: bigint, decimals: number, price: bigint | undefined) {
  if (price === undefined || price <= 0n) return undefined;
  return (amount * price) / 10n ** BigInt(decimals);
}

// Production mints from GMTrade swapList ∩ GMX_SOLANA_TOKENS_RAW.
// ponytail: static whitelist, add a mint when swapList grows past these.
export const SOLANA_TRADE_TOKENS: Record<string, { symbol: string; decimals: number; native?: boolean }> = {
  "11111111111111111111111111111111": { symbol: "SOL", decimals: 9, native: true },
  So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH: { symbol: "SOL", decimals: 9, native: true },
  So11111111111111111111111111111111111111112: { symbol: "WSOL", decimals: 9 },
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: { symbol: "USDC", decimals: 6 },
  "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh": { symbol: "WBTC", decimals: 8 },
  "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs": { symbol: "WETH", decimals: 8 },
  "9wX6Qz1Y5YQe71dfnFYFfZYXZhKqjYKQwdqfrRkmYUSX": { symbol: "WGMX", decimals: 9 },
  C1MHyoTJpRTeS9AQCyspNVu2EWAYCZwmJ1jNkEArFP1f: { symbol: "APE", decimals: 9 },
};

export function swapTokenMints(message: unknown) {
  const mints: string[] = [];
  if (!message || typeof message !== "object") return mints;
  const payload = (message as { payload?: unknown }).payload;
  if (!Array.isArray(payload)) return mints;

  for (const item of payload) {
    if (!item || typeof item !== "object") continue;
    const tokenAddress = (item as { tokenAddress?: unknown }).tokenAddress;
    if (typeof tokenAddress === "string" && tokenAddress) mints.push(tokenAddress);
  }

  return mints;
}

export function solanaPriceSymbol(symbol: string) {
  if (symbol === "WSOL" || symbol === "WETH" || symbol === "WBTC" || symbol === "WPUMP" || symbol === "WGMX") {
    return symbol.slice(1);
  }
  const dot = symbol.indexOf(".");
  return dot === -1 ? symbol : symbol.slice(0, dot);
}

export function solanaDisplaySymbol(symbol: string) {
  return symbol === "WGMX" ? "GMX" : symbol;
}

export function readSplAmount(data: Uint8Array) {
  if (data.byteLength < 72) return undefined;
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getBigUint64(64, true);
}
