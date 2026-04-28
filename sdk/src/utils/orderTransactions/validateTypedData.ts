import { getAddress } from "viem";

import { ContractsChainId } from "configs/chains";
import { ContractName, getContract } from "configs/contracts";
import type { TypedDataDomain, TypedDataTypes } from "utils/signer";

const EXPECTED_DOMAIN_NAME = "GmxBaseGelatoRelayRouter";
const EXPECTED_DOMAIN_VERSION = "1";

const RELAY_ROUTER_CONTRACT_NAMES: ContractName[] = [
  "GelatoRelayRouter",
  "SubaccountGelatoRelayRouter",
  "MultichainOrderRouter",
  "MultichainSubaccountRouter",
  "MultichainClaimsRouter",
  "MultichainGlvRouter",
  "MultichainGmRouter",
  "MultichainTransferRouter",
];

function getKnownRelayRouterAddresses(chainId: ContractsChainId): Set<string> {
  const addresses = new Set<string>();

  for (const name of RELAY_ROUTER_CONTRACT_NAMES) {
    try {
      const addr = getContract(chainId, name);
      if (addr) addresses.add(getAddress(addr));
    } catch {
      // Contract may not exist on this chain
    }
  }

  return addresses;
}

function validateDomain(domain: TypedDataDomain, chainId: ContractsChainId): void {
  if (domain.name !== EXPECTED_DOMAIN_NAME) {
    throw new Error(
      `EIP-712 domain name mismatch: got "${domain.name}", expected "${EXPECTED_DOMAIN_NAME}"`
    );
  }

  if (domain.version !== EXPECTED_DOMAIN_VERSION) {
    throw new Error(
      `EIP-712 domain version mismatch: got "${domain.version}", expected "${EXPECTED_DOMAIN_VERSION}"`
    );
  }

  if (Number(domain.chainId) !== chainId) {
    throw new Error(`EIP-712 domain chainId mismatch: got ${domain.chainId}, expected ${chainId}`);
  }

  const knownAddresses = getKnownRelayRouterAddresses(chainId);
  const verifyingContract = domain.verifyingContract ? getAddress(domain.verifyingContract) : undefined;

  if (!verifyingContract || !knownAddresses.has(verifyingContract)) {
    throw new Error(
      `EIP-712 domain verifyingContract "${domain.verifyingContract}" is not a known relay router for chain ${chainId}`
    );
  }
}

export function validateOrderTypedData(
  domain: TypedDataDomain,
  types: TypedDataTypes,
  message: Record<string, any>,
  chainId: ContractsChainId,
  signerAddress: string,
  /** For subaccount orders, the main account (owner) is a valid receiver */
  accountAddress?: string
): void {
  validateDomain(domain, chainId);

  // --- Types validation ---
  const typeKeys = Object.keys(types);
  if (typeKeys.length === 0) {
    throw new Error("EIP-712 types object is empty");
  }

  // --- Message receiver validation ---
  const checksummedSigner = getAddress(signerAddress);
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  const allowedReceivers = new Set([checksummedSigner]);
  if (accountAddress) {
    allowedReceivers.add(getAddress(accountAddress));
  }

  if (Array.isArray(message.createOrderParamsList)) {
    for (const order of message.createOrderParamsList) {
      const receiver = order?.addresses?.receiver;
      if (receiver) {
        const checksummedReceiver = getAddress(receiver);
        if (checksummedReceiver !== ZERO_ADDRESS && !allowedReceivers.has(checksummedReceiver)) {
          throw new Error(
            `Order receiver "${receiver}" does not match signer "${signerAddress}". Possible malicious typed data.`
          );
        }
      }
    }
  }
}

export function validateSubaccountApprovalTypedData(
  domain: TypedDataDomain,
  message: Record<string, any>,
  chainId: ContractsChainId,
  signerAddress: string,
  expectedSubaccountAddress: string
): void {
  validateDomain(domain, chainId);

  // --- Message field validation ---
  const checksummedSigner = getAddress(signerAddress);

  if (message.account && getAddress(message.account) !== checksummedSigner) {
    throw new Error(
      `Subaccount approval account "${message.account}" does not match signer "${signerAddress}"`
    );
  }

  if (
    message.subaccount &&
    getAddress(message.subaccount) !== getAddress(expectedSubaccountAddress)
  ) {
    throw new Error(
      `Subaccount address "${message.subaccount}" does not match expected "${expectedSubaccountAddress}"`
    );
  }
}
