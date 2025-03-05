import { getContract } from "config/contracts";
import { ethers, Signer } from "ethers";
import { IncreaseOrderParams } from "../orders/createIncreaseOrderTxn";
// Import only the GelatoRelayRouterAbi and extract just the ABI part
import GelatoRelayRouterAbiJson from "../../../../sdk/src/abis/GelatoRelayRouter.json";
import { CreateOrderParams, getCreateOrderCalldata } from "./orderUtils";
const GelatoRelayRouterAbi = GelatoRelayRouterAbiJson.abi;

// Import Gelato Relay SDK
import { GelatoRelay, TransactionStatusResponse } from "@gelatonetwork/relay-sdk";
import { getWrappedToken } from "sdk/configs/tokens";

const relay = new GelatoRelay();

relay.onTaskStatusUpdate((taskStatus: TransactionStatusResponse) => {
  console.log("Task status update", taskStatus);
});

// Add the canSignTypedData function at the top of the file
async function canSignTypedData(signer: Signer): Promise<boolean> {
  try {
    // In ethers v6, signTypedData is a standard method
    return typeof signer.signTypedData === "function";
  } catch (error) {
    console.error("Error checking signing capability:", error);
    return false;
  }
}

export async function createGasslessIncreaseOrderTxn({
  chainId,
  createOrderParams: p,
  signer,
  deadline = BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour from now
  feeToken,
  feeAmount,
  relayFeeToken,
  relayFeeAmount,
}: {
  chainId: number;
  createOrderParams: IncreaseOrderParams;
  signer: Signer;
  deadline?: bigint;
  feeToken: string;
  feeAmount: bigint;
  relayFeeToken: string;
  relayFeeAmount: bigint;
}) {
  if (!signer) {
    throw new Error("Signer is required for gasless transactions");
  }

  // Check if the signer can sign typed data
  if (!(await canSignTypedData(signer))) {
    throw new Error("Your wallet does not support EIP-712 signing. Please use MetaMask or another compatible wallet.");
  }

  try {
    // Get the user's address
    const account = await signer.getAddress();
    console.log("User address:", account);

    // Get the relay router contract address
    const relayRouterAddress = getContract(chainId, "GelatoRelayRouter");
    console.log("Using relay router address:", relayRouterAddress);

    // Create a contract instance for the relay router
    const relayRouter = new ethers.Contract(relayRouterAddress, GelatoRelayRouterAbi, signer);

    // Prepare the order parameters according to CreateOrderParams type
    const orderParams: CreateOrderParams = {
      addresses: {
        receiver: account,
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
        triggerPrice: p.triggerPrice ? p.triggerPrice : 0n,
        acceptablePrice: p.acceptablePrice,
        executionFee: feeAmount,
        callbackGasLimit: p.executionGasLimit,
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

    console.log(
      "Order params prepared:",
      JSON.stringify(
        {
          ...orderParams,
          numbers: {
            ...orderParams.numbers,
            sizeDeltaUsd: orderParams.numbers.sizeDeltaUsd.toString(),
            initialCollateralDeltaAmount: orderParams.numbers.initialCollateralDeltaAmount.toString(),
            triggerPrice: orderParams.numbers.triggerPrice.toString(),
            acceptablePrice: orderParams.numbers.acceptablePrice.toString(),
            executionFee: orderParams.numbers.executionFee.toString(),
            callbackGasLimit: orderParams.numbers.callbackGasLimit.toString(),
          },
        },
        null,
        2
      )
    );

    const txDataResult = await getCreateOrderCalldata(chainId, {
      signer,
      sender: signer,
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
      tokenPermits: [],
      feeParams: {
        feeToken,
        feeAmount,
        feeSwapPath: [],
      },
      collateralDeltaAmount: p.collateralDeltaAmount,
      account,
      params: orderParams,
      deadline,
      relayRouter,
      chainId,
      relayFeeToken,
      relayFeeAmount,
    });

    console.log("Transaction data generated successfully");

    // Prepare the relay request
    const relayRequest = {
      chainId: BigInt(chainId),
      target: relayRouterAddress,
      data: txDataResult.calldata, // Use the calldata string
      feeToken: relayFeeToken,
      isRelayContext: true,
    };

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

    // Return the transaction details with a wait function to check status
    return {
      transactionHash: relayResponse.taskId,
      wait: async () => {
        // Poll for transaction status
        let status = await relay.getTaskStatus(relayResponse.taskId);
        console.log("Initial task status:", status);

        // For debugging, also fetch the detailed debug information
        try {
          const debugResponse = await fetch(`https://api.gelato.digital/tasks/status/${relayResponse.taskId}/debug`);
          const debugData = await debugResponse.json();
          console.log("Task debug information:", debugData);
        } catch (error) {
          console.warn("Could not fetch debug information:", error);
        }

        // Wait until the transaction is completed or failed
        while (
          status &&
          status.taskState !== "ExecSuccess" &&
          status.taskState !== "ExecReverted" &&
          status.taskState !== "Cancelled"
        ) {
          console.log(`Waiting for transaction completion. Current state: ${status.taskState}`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          status = await relay.getTaskStatus(relayResponse.taskId);
        }

        // Handle different completion states
        if (status && status.taskState === "ExecReverted") {
          console.error("Transaction reverted:", status.lastCheckMessage);
          throw new Error(`Gelato transaction reverted: ${status.lastCheckMessage || "Unknown error"}`);
        } else if (status && status.taskState === "Cancelled") {
          console.error("Transaction cancelled");
          throw new Error("Gelato transaction was cancelled");
        }

        console.log("Transaction completed successfully:", status);
        return {
          status: 1,
          hash: status?.transactionHash || relayResponse.taskId,
        };
      },
    };
  } catch (error) {
    console.error("Error in gasless transaction:", error);

    // Provide more detailed error messages based on the error type
    if (error.message?.includes("UnexpectedReturndata")) {
      throw new Error("Gelato Relay returned unexpected data. Please check your transaction parameters and try again.");
    } else if (error.message?.includes("user rejected")) {
      throw new Error("Transaction was rejected by user.");
    } else if (error.message?.includes("types/values length mismatch")) {
      throw new Error(
        "Error in EIP-712 signing: The types and values don't match. Please check the console for details."
      );
    } else {
      throw new Error(`Error in gasless transaction: ${error.message}`);
    }
  }
}
