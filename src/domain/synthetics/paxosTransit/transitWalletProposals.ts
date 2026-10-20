import { getAddress } from "viem";

import { PAXOS_TRANSIT_APPROVAL_PROPOSALS_KEY, PAXOS_TRANSIT_CONVERSION_PROPOSALS_KEY } from "config/localStorage";
import { readLocalStorageItem, writeLocalStorageItem } from "lib/localStorage";

const APPROVAL_PROPOSAL_TTL_MS = 24 * 60 * 60_000;
const CONVERSION_PROPOSAL_TTL_MS = 16 * 60_000;

export type TransitApproval = {
  chainId: number;
  account: string;
  tokenAddress: string;
  spender: string;
  amount: bigint;
};

type StoredApprovalProposals = Record<string, { amount: string; proposedAt: number }>;

export function getTransitApprovalKey(approval: TransitApproval) {
  return [
    approval.chainId,
    getAddress(approval.account),
    getAddress(approval.tokenAddress),
    getAddress(approval.spender),
  ].join(":");
}

function readApprovalProposals(): StoredApprovalProposals {
  return (
    readLocalStorageItem(PAXOS_TRANSIT_APPROVAL_PROPOSALS_KEY, {
      deserializer: (value) => JSON.parse(value) as StoredApprovalProposals,
    }) ?? {}
  );
}

function writeApprovalProposals(proposals: StoredApprovalProposals) {
  writeLocalStorageItem(PAXOS_TRANSIT_APPROVAL_PROPOSALS_KEY, proposals, { serializer: JSON.stringify });
}

export function getIsTransitApprovalProposed(approval: TransitApproval, now = Date.now()): boolean {
  const proposal = readApprovalProposals()[getTransitApprovalKey(approval)];

  return (
    proposal !== undefined &&
    BigInt(proposal.amount) >= approval.amount &&
    now - proposal.proposedAt < APPROVAL_PROPOSAL_TTL_MS
  );
}

export function storeTransitApprovalProposal(approval: TransitApproval, now = Date.now()) {
  writeApprovalProposals({
    ...readApprovalProposals(),
    [getTransitApprovalKey(approval)]: { amount: approval.amount.toString(), proposedAt: now },
  });
}

export function removeTransitApprovalProposal(approval: TransitApproval) {
  const { [getTransitApprovalKey(approval)]: _removed, ...rest } = readApprovalProposals();

  writeApprovalProposals(rest);
}

type TransitConversionOwner = { chainId: number; account: string };

function getConversionProposalKey(owner: TransitConversionOwner) {
  return `${owner.chainId}:${getAddress(owner.account)}`;
}

function readConversionProposals(): Record<string, number> {
  return (
    readLocalStorageItem(PAXOS_TRANSIT_CONVERSION_PROPOSALS_KEY, {
      deserializer: (value) => JSON.parse(value) as Record<string, number>,
    }) ?? {}
  );
}

function writeConversionProposals(proposals: Record<string, number>) {
  writeLocalStorageItem(PAXOS_TRANSIT_CONVERSION_PROPOSALS_KEY, proposals, { serializer: JSON.stringify });
}

export function getIsTransitConversionProposed(owner: TransitConversionOwner, now = Date.now()): boolean {
  const proposedAt = readConversionProposals()[getConversionProposalKey(owner)];

  return proposedAt !== undefined && now - proposedAt < CONVERSION_PROPOSAL_TTL_MS;
}

export function storeTransitConversionProposal(owner: TransitConversionOwner, now = Date.now()) {
  writeConversionProposals({ ...readConversionProposals(), [getConversionProposalKey(owner)]: now });
}

export function removeTransitConversionProposal(owner: TransitConversionOwner) {
  const { [getConversionProposalKey(owner)]: _removed, ...rest } = readConversionProposals();

  writeConversionProposals(rest);
}
