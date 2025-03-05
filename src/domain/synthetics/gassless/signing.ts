import { BigNumberish, ethers, AbiCoder, keccak256 } from "ethers";

const coder = AbiCoder.defaultAbiCoder();

function getDefaultOracleParams() {
  return {
    tokens: [],
    providers: [],
    data: [],
  };
}

export async function getRelayParams(p: {
  oracleParams?: any;
  tokenPermits?: any;
  externalCalls?: any;
  feeParams: any;
  userNonce?: BigNumberish;
  deadline: BigNumberish;
  relayRouter: ethers.Contract;
  signer: ethers.Signer;
}) {
  let userNonce = p.userNonce;
  if (userNonce === undefined) {
    userNonce = await getUserNonce(await p.signer.getAddress(), p.relayRouter);
  }
  return {
    oracleParams: p.oracleParams || getDefaultOracleParams(),
    tokenPermits: p.tokenPermits || [],
    externalCalls: p.externalCalls || {
      externalCallTargets: [],
      externalCallDataList: [],
      refundTokens: [],
      refundReceivers: [],
    },
    fee: p.feeParams,
    userNonce,
    deadline: p.deadline,
  };
}

export function getDomain(chainId: BigNumberish, verifyingContract: string) {
  if (!chainId) {
    throw new Error("chainId is required");
  }
  if (!verifyingContract) {
    throw new Error("verifyingContract is required");
  }
  return {
    name: "GmxBaseGelatoRelayRouter",
    version: "1",
    chainId,
    verifyingContract,
  };
}

export function hashRelayParams(relayParams: any) {
  const encoded = coder.encode(
    [
      "tuple(address[] tokens, address[] providers, bytes[] data)",
      "tuple(address[] externalCallTargets, bytes[] externalCallDataList, address[] refundTokens, address[] refundReceivers)",
      "tuple(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s, address token)[]",
      "tuple(address feeToken, uint256 feeAmount, address[] feeSwapPath)",
      "uint256",
      "uint256",
    ],
    [
      [relayParams.oracleParams.tokens, relayParams.oracleParams.providers, relayParams.oracleParams.data],
      [
        relayParams.externalCalls.externalCallTargets,
        relayParams.externalCalls.externalCallDataList,
        relayParams.externalCalls.refundTokens,
        relayParams.externalCalls.refundReceivers,
      ],
      relayParams.tokenPermits.map((permit) => [
        permit.owner,
        permit.spender,
        permit.value,
        permit.deadline,
        permit.v,
        permit.r,
        permit.s,
        permit.token,
      ]),
      [relayParams.fee.feeToken, relayParams.fee.feeAmount, relayParams.fee.feeSwapPath],
      relayParams.userNonce,
      relayParams.deadline,
    ]
  );

  return keccak256(encoded);
}

export function hashSubaccountApproval(subaccountApproval: any) {
  return keccak256(
    coder.encode(
      [
        "tuple(address subaccount,bool shouldAdd,uint256 expiresAt,uint256 maxAllowedCount,bytes32 actionType,uint256 nonce,uint256 deadline,bytes signature)",
      ],
      [subaccountApproval]
    )
  );
}

export async function getUserNonce(account: string, relayRouter: ethers.Contract) {
  return relayRouter.userNonces(account);
}

export async function signTypedData(
  signer: ethers.Signer,
  domain: Record<string, any>,
  types: Record<string, any>,
  typedData: Record<string, any>
) {
  // Validate inputs
  for (const [key, value] of Object.entries(domain)) {
    if (value === undefined) {
      throw new Error(`signTypedData: domain.${key} is undefined`);
    }
  }
  for (const [key, value] of Object.entries(typedData)) {
    if (value === undefined) {
      throw new Error(`signTypedData: typedData.${key} is undefined`);
    }
  }

  // In ethers v6.12.1, the signTypedData parameters are arranged as:
  // domain, types without primaryType as a direct property, value
  // Remove primaryType if it exists as a direct property since ethers v6 will infer it
  const typesCopy = { ...types };
  if ("primaryType" in typesCopy) {
    delete typesCopy.primaryType;
  }

  // Get the primary type - the first key in types that's not EIP712Domain
  const primaryType = Object.keys(typesCopy).filter((t) => t !== "EIP712Domain")[0];

  if (!primaryType) {
    throw new Error("No primary type found in types object");
  }

  console.log("Using primaryType:", primaryType);
  console.log("Types keys:", Object.keys(typesCopy));

  // Instead of using signer.signTypedData directly, create the full EIP-712 message
  // and use the provider's JSON-RPC method directly
  try {
    const provider = signer.provider;
    const from = await signer.getAddress();

    if (!provider) {
      throw new Error("Signer must have a provider to sign typed data");
    }

    // Structure the full EIP-712 message according to the spec
    const eip712 = {
      types: typesCopy,
      domain,
      primaryType,
      message: typedData,
    };

    console.log("Sending EIP-712 data:", JSON.stringify(eip712, null, 2));

    // Call the RPC method directly
    return await (provider as any).send("eth_signTypedData_v4", [from, JSON.stringify(eip712)]);
  } catch (error) {
    console.error("Error signing typed data:", error);
    throw error;
  }
}
