import { type ErrorLike, parseError } from "lib/errors";

export const USDC_DECIMALS = 6;

// Thrown by the Solana approve actions when the Solana wallet can't pay the network fee.
export const GT_BUYBACK_INSUFFICIENT_SOL_ERROR = "insufficient-sol";

export type GtBuybackRequestStatus =
  | "waitingSignature"
  | "submitting"
  | "inBuyback"
  | "awaitingPayout"
  | "paid"
  | "withdrawn";

export type GtBuybackRequest = {
  id: string;
  gtAmount: bigint;
  usdcAmount?: bigint;
  status: GtBuybackRequestStatus;
  createdAt: number;
  windowEndsAt?: number;
};

export type GtBuybackSummary = {
  // GT the account still holds, after buyback sales.
  gtBalance: bigint;
  quotaTotal: bigint;
  quotaUsed: bigint;
  referralCode?: string;
  activeRequest?: GtBuybackRequest;
  withdrawableUsdc: bigint;
  totalBoughtBackUsdc: bigint;
  isSmartContractWallet: boolean;
  season?: string;
  history?: GtBuybackRequest[];
};

// The buyback data source is not connected yet.
export type GtBuybackSummaryResult = {
  data: GtBuybackSummary | undefined;
  isLoading: boolean;
  requestSale?: (gtAmount: bigint) => Promise<void>;
  signWithdraw?: (usdcAmount: bigint, solanaAddress: string) => Promise<void>;
  approveSolanaWithdraw?: (usdcAmount: bigint, solanaAddress: string) => Promise<void>;
  suggestedReferralCode?: string;
  isReferralCodeTaken?: (code: string) => Promise<boolean>;
  signSetReferralCode?: (code: string) => Promise<void>;
  isSolanaWalletConnected?: boolean;
  connectSolanaWallet?: () => Promise<void>;
  approveSolanaSetReferralCode?: (code: string) => Promise<void>;
};

export function useGtBuybackSummary(_account: string | undefined): GtBuybackSummaryResult {
  return { data: undefined, isLoading: false };
}

export function isGtBuybackUserRejection(error: unknown) {
  return Boolean(parseError(error as ErrorLike)?.isUserRejectedError);
}
