import { getChainName } from "config/chains";
import type { AtomicCapabilityStatus } from "lib/wallets/eip5792";

import type {
  TokenApproveBatchAction,
  TokenApproveBatchCapability,
  TokenApproveBatchEvent,
  TokenApproveBatchReason,
  TokenApproveBatchSource,
} from "./types";
import { userAnalytics } from "./UserAnalytics";

const ANALYTICS_CAPABILITY_BY_STATUS: Record<AtomicCapabilityStatus, TokenApproveBatchCapability> = {
  supported: "Supported",
  ready: "Ready",
  unsupported: "Unsupported",
  unknown: "Unknown",
};

export type BatchApprovalAnalyticsEventParams = {
  action: TokenApproveBatchAction;
  source: TokenApproveBatchSource;
  chainId: number;
  capabilityStatus: AtomicCapabilityStatus;
  tokenCount: number;
  walletProvider?: string;
  reason?: TokenApproveBatchReason;
};

export function pushBatchApprovalAnalyticsEvent({
  action,
  source,
  chainId,
  capabilityStatus,
  tokenCount,
  walletProvider,
  reason,
}: BatchApprovalAnalyticsEventParams) {
  return userAnalytics.pushEvent<TokenApproveBatchEvent>({
    event: "TokenApproveAction",
    data: {
      action,
      source,
      chain: getChainName(chainId),
      capability: ANALYTICS_CAPABILITY_BY_STATUS[capabilityStatus],
      tokenCount,
      walletProvider,
      reason,
    },
  });
}
