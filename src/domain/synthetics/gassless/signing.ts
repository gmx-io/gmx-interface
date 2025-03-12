import { BigNumberish, ethers, AbiCoder, keccak256, ZeroHash } from "ethers";

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
  // Define default values for optional parameters
  const oracleParams = p.oracleParams || getDefaultOracleParams();
  const tokenPermits = p.tokenPermits || [];
  const externalCalls = p.externalCalls || {
    externalCallTargets: [],
    externalCallDataList: [],
    refundTokens: [],
    refundReceivers: [],
  };

  // Get user nonce if not provided
  let userNonce = p.userNonce;
  if (userNonce === undefined) {
    const account = await p.signer.getAddress();
    const nonceValue = await getUserNonce(account, p.relayRouter);
    userNonce = BigInt(nonceValue.toString());
    console.log(`Fetched user nonce for ${account}: ${userNonce}`);
  } else {
    userNonce = BigInt(userNonce.toString());
  }

  // Ensure deadline is a BigInt
  const deadline = BigInt(p.deadline.toString());

  // Format fee params
  const feeParams = {
    feeToken: p.feeParams.feeToken,
    feeAmount: BigInt(p.feeParams.feeAmount.toString()),
    feeSwapPath: p.feeParams.feeSwapPath || [],
  };

  return {
    oracleParams,
    tokenPermits,
    externalCalls,
    fee: feeParams,
    userNonce,
    deadline,
  };
}

export function getGelatoRelayRouterDomain(chainId: BigNumberish, verifyingContract: string) {
  return {
    name: "GmxBaseGelatoRelayRouter",
    version: "1",
    chainId,
    verifyingContract,
  };
}

export function hashRelayParams(relayParams: any) {
  // Make sure we handle any undefined values and convert to arrays
  const oracleParams = relayParams.oracleParams || {
    tokens: [],
    providers: [],
    data: [],
  };

  const externalCalls = relayParams.externalCalls || {
    externalCallTargets: [],
    externalCallDataList: [],
    refundTokens: [],
    refundReceivers: [],
  };

  const tokenPermits = relayParams.tokenPermits || [];

  // Make sure the fee object has all required properties
  const fee = {
    feeToken: relayParams.fee.feeToken,
    feeAmount: relayParams.fee.feeAmount,
    feeSwapPath: relayParams.fee.feeSwapPath || [],
  };

  // Map token permits to the expected format
  const mappedPermits = tokenPermits.map((permit) => [
    permit.owner || ethers.ZeroAddress,
    permit.spender || ethers.ZeroAddress,
    permit.value || 0,
    permit.deadline || 0,
    permit.v || 0,
    permit.r || ethers.ZeroHash,
    permit.s || ethers.ZeroHash,
    permit.token || ethers.ZeroAddress,
  ]);

  // Encode exactly as the Solidity contract does
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
      [oracleParams.tokens, oracleParams.providers, oracleParams.data],
      [
        externalCalls.externalCallTargets,
        externalCalls.externalCallDataList,
        externalCalls.refundTokens,
        externalCalls.refundReceivers,
      ],
      mappedPermits,
      [fee.feeToken, fee.feeAmount, fee.feeSwapPath],
      relayParams.userNonce,
      relayParams.deadline,
    ]
  );

  // Use keccak256 to hash the encoded data
  const hash = keccak256(encoded);
  console.log("RelayParams Hash:", hash);
  return hash;
}

export function hashSubaccountApproval(subaccountApproval: any) {
  if (!subaccountApproval) {
    return ZeroHash;
  }

  // This must match exactly how the contract hashes the subaccount approval
  // In SubaccountGelatoRelayRouter.sol:
  // bytes32 subaccountApprovalHash = keccak256(abi.encode(subaccountApproval));
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

  // Get the primary type - the first key in types that's not EIP712Domain
  const primaryType = Object.keys(types).filter((t) => t !== "EIP712Domain")[0];

  if (!primaryType) {
    throw new Error("No primary type found in types object");
  }

  console.log("Using primaryType:", primaryType);
  console.log("Domain:", JSON.stringify(domain, null, 2));
  console.log("Types:", JSON.stringify(types, null, 2));
  console.log("TypedData:", JSON.stringify(typedData, null, 2));

  try {
    const provider = signer.provider;
    const from = await signer.getAddress();

    if (!provider) {
      throw new Error("Signer must have a provider to sign typed data");
    }

    // Structure the data in EIP-712 format exactly matching what the contract expects
    const eip712 = {
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
        ...types,
      },
      primaryType,
      domain,
      message: typedData,
    };

    console.log("Sending EIP-712 data:", JSON.stringify(eip712, null, 2));

    // Use the standard JSON-RPC method for EIP-712 signing
    const signature = await (provider as any).send("eth_signTypedData_v4", [from, JSON.stringify(eip712)]);

    console.log("Signature received:", signature);

    return signature;
  } catch (error) {
    console.error("Error signing typed data:", error);
    throw error;
  }
}
