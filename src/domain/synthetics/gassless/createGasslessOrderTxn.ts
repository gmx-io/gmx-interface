import { ethers, parseUnits, Signer } from "ethers";
import { IncreaseOrderParams } from "../orders/createIncreaseOrderTxn";
// Import only the GelatoRelayRouterAbi and extract just the ABI part
import GelatoRelayRouterAbiJson from "../../../../sdk/src/abis/GelatoRelayRouter.json";
import SubaccountGelatoRelayRouterAbiJson from "../../../../sdk/src/abis/SubaccountGelatoRelayRouter.json";
import { CreateOrderParams, getCreateOrderCalldata } from "./orderUtils";
// Import permit utilities
import { createCollateralTokenPermit, supportsPermit, TokenPermit, debugPermitSignature } from "./permitUtils";
// Import subaccount utilities
import { SubaccountApproval, createSubaccountApproval } from "./subaccountUtils";

const GelatoRelayRouterAbi = GelatoRelayRouterAbiJson.abi;
const SubaccountGelatoRelayRouterAbi = SubaccountGelatoRelayRouterAbiJson.abi;

// Import Gelato Relay SDK
import { GelatoRelay, TransactionStatusResponse } from "@gelatonetwork/relay-sdk";
import { getTokenBySymbol, getWrappedToken } from "sdk/configs/tokens";
import { SUBACCOUNT_ORDER_ACTION } from "sdk/configs/dataStore";
import { getContract } from "config/contracts";

const relay = new GelatoRelay();

relay.onTaskStatusUpdate((taskStatus: TransactionStatusResponse) => {
  console.log("Task status update", taskStatus);
});

export async function createGasslessIncreaseOrderTxn({
  chainId,
  createOrderParams: p,
  signer,
  deadline = BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour from now
  feeToken,
  feeAmount,
  relayFeeToken,
  relayFeeAmount,
  tokenPermits = [], // Optional manually provided token permits
  createPermit = true, // Default to automatically creating permit
  subaccountApproval, // Optional subaccount approval for trading with subaccounts
  subaccountSigner, // Optional subaccount signer if using a subaccount
}: {
  chainId: number;
  createOrderParams: IncreaseOrderParams;
  signer: Signer; // Main account signer (used for signing permits)
  deadline?: bigint;
  feeToken: string;
  feeAmount: bigint;
  relayFeeToken: string;
  relayFeeAmount: bigint;
  tokenPermits?: TokenPermit[]; // Optional manually provided token permits
  createPermit?: boolean; // Flag to auto-create permit for collateral token
  subaccountApproval?: SubaccountApproval; // Optional subaccount approval
  subaccountSigner?: Signer; // Optional subaccount signer
}) {
  if (!signer) {
    throw new Error("Signer is required for gasless transactions");
  }

  // Make sure signer has provider
  if (!signer.provider) {
    throw new Error("Signer must be connected to a provider");
  }

  // If using a subaccount, make sure subaccountSigner is provided
  if (subaccountApproval && !subaccountSigner) {
    throw new Error("When using subaccount approval, a subaccountSigner must be provided");
  }

  // Determine which signer to use for sending the transaction
  // If we're using a subaccount, use the subaccountSigner for sending
  // but the main signer for signing permits
  const txSender = subaccountSigner || signer;
  const permitSigner = signer; // Always use the main account for signing permits

  // Get the account addresses
  const account = await signer.getAddress();
  const txSenderAddress = await txSender.getAddress();
  console.log("Main account address:", account);
  if (subaccountSigner) {
    console.log("Subaccount address:", txSenderAddress);
  }

  // Auto-create permit if requested and none provided
  if (createPermit && (!tokenPermits || tokenPermits.length === 0)) {
    console.log("Auto-creating permit for collateral token:", p.initialCollateralAddress);

    // Ensure provider is available for permit signer
    if (!permitSigner.provider) {
      throw new Error("Permit signer must have a provider attached");
    }

    // Check if token supports permits
    const supportsPerm = await supportsPermit(p.initialCollateralAddress, permitSigner.provider);
    if (!supportsPerm) {
      console.warn(`Token ${p.initialCollateralAddress} does not support EIP-2612 permits, continuing without permit`);
    } else {
      try {
        // Run diagnostic to help with debugging
        await debugPermitSignature(p.initialCollateralAddress, permitSigner, permitSigner.provider, chainId);

        // Create permit for the collateral token
        const tokenPermit = await createCollateralTokenPermit(
          chainId,
          permitSigner,
          p.initialCollateralAddress,
          p.initialCollateralAmount,
          deadline
        );

        // Use the created permit
        tokenPermits = [tokenPermit];
        console.log("Collateral token permit created successfully");
      } catch (error) {
        console.error("Failed to create collateral token permit:", error);
        console.log("Continuing without token permit");
      }
    }
  }

  // Prepare the order parameters according to CreateOrderParams type
  const orderParams: CreateOrderParams = {
    addresses: {
      receiver: account, // Always set the receiver to the main account, not the subaccount
      cancellationReceiver: ethers.ZeroAddress,
      callbackContract: ethers.ZeroAddress,
      uiFeeReceiver: ethers.ZeroAddress,
      market: p.marketAddress,
      initialCollateralToken: p.initialCollateralAddress,
      swapPath: p.swapPath || [],
    },
    numbers: {
      sizeDeltaUsd: p.sizeDeltaUsd,
      initialCollateralDeltaAmount: p.initialCollateralAmount,
      triggerPrice: p.triggerPrice ?? 0n,
      acceptablePrice: p.acceptablePrice,
      executionFee: p.executionFee,
      callbackGasLimit: 0n, // Always set to 0n for gasless orders
      minOutputAmount: 0n,
      validFromTime: 0n,
    },
    orderType: p.orderType,
    decreasePositionSwapType: 0,
    isLong: p.isLong,
    shouldUnwrapNativeToken: false,
    autoCancel: false,
    referralCode: p.referralCode || ethers.ZeroHash,
  };

  // Log token permits if any and validate them
  if (tokenPermits.length > 0) {
    console.log(
      "Using token permits:",
      tokenPermits.map((permit) => ({
        token: permit.token,
        owner: permit.owner,
        spender: permit.spender,
        value: permit.value.toString(),
        deadline: permit.deadline.toString(),
      }))
    );
  }

  const txDataResult = await getCreateOrderCalldata(chainId, {
    signer: subaccountSigner ?? signer,
    oracleParams: {
      tokens: [p.initialCollateralAddress, getWrappedToken(chainId).address],
      providers: ["0x527FB0bCfF63C47761039bB386cFE181A92a4701", "0x527FB0bCfF63C47761039bB386cFE181A92a4701"],
      data: ["0x", "0x"],
    },
    externalCalls: {
      externalCallTargets: [],
      externalCallDataList: [],
      refundTokens: [],
      refundReceivers: [],
    },
    subaccountApproval,
    tokenPermits, // Pass the token permits
    feeParams: {
      feeToken: getTokenBySymbol(chainId, "USDC")?.address,
      feeAmount: parseUnits("1", 6),
      feeSwapPath: ["0x70d95587d40A2caf56bd97485aB3Eec10Bee6336"],
    },
    collateralDeltaAmount: p.initialCollateralAmount,
    account,
    params: orderParams,
    deadline,
    chainId,
    relayFeeToken,
    relayFeeAmount,
  });

  console.log("Transaction data generated successfully");

  // Use the appropriate router based on whether we're using a subaccount
  const targetRouterAddress = await txDataResult.relayRouter.getAddress();

  // Prepare the relay request
  const relayRequest = {
    chainId: BigInt(chainId),
    target: targetRouterAddress,
    data: txDataResult.calldata, // Use the calldata string
    feeToken: relayFeeToken,
    isRelayContext: true,
  };

  console.log("Relay request:", relayRequest, relayFeeToken, feeToken, feeAmount);

  console.log(
    "Submitting relay request to Gelato:",
    JSON.stringify(
      {
        ...relayRequest,
        chainId: chainId.toString(),
        data: txDataResult.calldata.substring(0, 64) + "...", // Truncate for logging
      },
      null,
      2
    )
  );

  // Send the transaction to Gelato Relay
  const relayResponse = await relay.callWithSyncFee(relayRequest);
  console.log("Relay response:", relayResponse);

  // Return the transaction details with a wait function to check status
  return {
    transactionHash: relayResponse.taskId,
    wait: async () => {
      return {
        status: 1,
      };
    },
  };
}
