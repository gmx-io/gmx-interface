/* eslint-disable no-console */
import {
  BaseError,
  createPublicClient,
  decodeErrorResult,
  encodeAbiParameters,
  encodeFunctionData,
  hashTypedData,
  http,
  isErc6492Signature,
  keccak256,
  pad,
  zeroHash,
  type StateOverride,
} from "viem";
import { toCoinbaseSmartAccount } from "viem/account-abstraction";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import { abis } from "../src/abis";
import { getAbi } from "../src/abis/getAbi";
import { getViemChain, type ContractsChainId } from "../src/configs/chains";
import { getContract } from "../src/configs/contracts";
import { getWrappedToken } from "../src/configs/tokens";
import type { RelayParamsPayload } from "../src/utils/express/types";
import {
  getEip6492SignatureWrapperHash,
  getGelatoRelayRouterDomain,
  hashRelayParams,
} from "../src/utils/express/utils/relayParamsUtils";
import { hashString } from "../src/utils/hash/utils";

const USAGE =
  "cd sdk && yarn tsx scripts/check-eip6492-relay-signature.ts <chainId> [--deployer=<EIP6492Deployer address>]";

const DATA_STORE_ADDRESS_VALUES_SLOT = 2n;

const chainId = Number(process.argv[2]) as ContractsChainId;
const deployerOverride = process.argv.find((arg) => arg.startsWith("--deployer="))?.split("=")[1];

if (!chainId) {
  console.error(`Usage: ${USAGE}`);
  process.exit(1);
}

const client = createPublicClient({ chain: getViemChain(chainId), transport: http() });
const dataStore = getContract(chainId, "DataStore");
const router = getContract(chainId, "SubaccountGelatoRelayRouter");

function getDataStoreAddressSlot(key: string) {
  return keccak256(
    encodeAbiParameters([{ type: "bytes32" }, { type: "uint256" }], [key, DATA_STORE_ADDRESS_VALUES_SLOT])
  );
}

function getStateOverride(): StateOverride | undefined {
  if (!deployerOverride) {
    return undefined;
  }

  return [
    {
      address: dataStore,
      stateDiff: [{ slot: getDataStoreAddressSlot(hashString("EIP6492_DEPLOYER")), value: pad(deployerOverride) }],
    },
  ];
}

async function main() {
  const owner = privateKeyToAccount(generatePrivateKey());
  const wallet = await toCoinbaseSmartAccount({ client, owners: [owner], version: "1.1" });
  const subaccount = privateKeyToAccount(generatePrivateKey()).address;
  const now = BigInt(Math.floor(Date.now() / 1000));

  const relayParams: RelayParamsPayload = {
    oracleParams: { tokens: [], providers: [], data: [] },
    tokenPermits: [],
    externalCalls: {
      sendTokens: [],
      sendAmounts: [],
      externalCallTargets: [],
      externalCallDataList: [],
      refundTokens: [],
      refundReceivers: [],
    },
    fee: { feeToken: getWrappedToken(chainId).address, feeAmount: 0n, feeSwapPath: [] },
    deadline: now + 3600n,
    desChainId: BigInt(chainId),
    userNonce: now,
    eip6492SignatureWrapperHash: zeroHash,
  };

  const domain = getGelatoRelayRouterDomain(chainId, router);
  const types = {
    RemoveSubaccount: [
      { name: "account", type: "address" },
      { name: "subaccount", type: "address" },
      { name: "relayParams", type: "bytes32" },
    ],
  };

  async function sign() {
    const digest = hashTypedData({
      domain,
      types,
      primaryType: "RemoveSubaccount",
      message: { account: wallet.address, subaccount, relayParams: hashRelayParams(relayParams) },
    });

    return wallet.signTypedData({
      domain,
      types: { Minified: [{ name: "digest", type: "bytes32" }] },
      primaryType: "Minified",
      message: { digest },
    });
  }

  async function simulate(label: string, signature: string) {
    const data = encodeFunctionData({
      abi: getAbi(chainId, "SubaccountGelatoRelayRouter"),
      functionName: "removeSubaccount",
      args: [{ ...relayParams, signature }, wallet.address, subaccount],
    });

    try {
      await client.call({ account: owner.address, to: router, data, stateOverride: getStateOverride() });
      console.log(`${label}: passed`);
    } catch (error) {
      const errorWithData =
        error instanceof BaseError
          ? error.walk((cause) => typeof (cause as { data?: unknown }).data === "string")
          : null;
      const revertData = (errorWithData as { data?: string } | null)?.data;

      if (typeof revertData !== "string" || revertData === "0x") {
        console.log(`${label}: reverted without a reason`);
        return;
      }

      const { errorName, args } = decodeErrorResult({ abi: abis.CustomErrors, data: revertData });
      console.log(`${label}: ${errorName}(${(args ?? []).join(", ")})`);
    }
  }

  console.log(
    `Smart wallet ${wallet.address}, deployed: ${Boolean(await client.getCode({ address: wallet.address }))}`
  );

  const firstSignature = await sign();
  console.log(`First signature is EIP-6492: ${isErc6492Signature(firstSignature)}`);
  await simulate("First signature, zero wrapper hash", firstSignature);

  relayParams.eip6492SignatureWrapperHash = getEip6492SignatureWrapperHash(firstSignature);
  const secondSignature = await sign();
  await simulate("Second signature, wrapper hash in relay params", secondSignature);

  relayParams.userNonce += 1n;
  await simulate("Second signature, relay params changed after signing", secondSignature);
}

main();
