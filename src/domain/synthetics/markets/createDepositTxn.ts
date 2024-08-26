import { getContract } from "config/contracts";
import { Signer, ethers } from "ethers";
import { callContract } from "lib/contracts";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "config/tokens";
import { SetPendingDeposit } from "context/SyntheticsEvents";
import { applySlippageToMinOut } from "../trade";
import { simulateExecuteTxn } from "../orders/simulateExecuteTxn";
import { TokensData } from "../tokens";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { t } from "@lingui/macro";
import { useMulticall } from "lib/multicall";

import GlvRouter from "abis/GlvRouter.json";

type Params = {
  account: string;
  initialLongTokenAddress: string;
  initialShortTokenAddress: string;
  longTokenSwapPath: string[];
  shortTokenSwapPath: string[];
  marketTokenAddress: string;
  longTokenAmount: bigint;
  shortTokenAmount: bigint;
  minMarketTokens: bigint;
  executionFee: bigint;
  allowedSlippage: number;
  tokensData: TokensData;
  skipSimulation?: boolean;
  setPendingTxns: (txns: any) => void;
  setPendingDeposit: SetPendingDeposit;
};

export async function createDepositTxn(chainId: number, signer: Signer, p: Params) {
  const contract = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, signer);
  const depositVaultAddress = getContract(chainId, "DepositVault");

  const isNativeLongDeposit = Boolean(
    p.initialLongTokenAddress === NATIVE_TOKEN_ADDRESS && p.longTokenAmount != undefined && p.longTokenAmount > 0
  );
  const isNativeShortDeposit = Boolean(
    p.initialShortTokenAddress === NATIVE_TOKEN_ADDRESS && p.shortTokenAmount != undefined && p.shortTokenAmount > 0
  );

  let wntDeposit = 0n;

  if (isNativeLongDeposit) {
    wntDeposit = wntDeposit + p.longTokenAmount!;
  }

  if (isNativeShortDeposit) {
    wntDeposit = wntDeposit + p.shortTokenAmount!;
  }

  const shouldUnwrapNativeToken = isNativeLongDeposit || isNativeShortDeposit;

  const wntAmount = p.executionFee + wntDeposit;

  const initialLongTokenAddress = convertTokenAddress(chainId, p.initialLongTokenAddress, "wrapped");
  const initialShortTokenAddress = convertTokenAddress(chainId, p.initialShortTokenAddress, "wrapped");

  const minMarketTokens = applySlippageToMinOut(p.allowedSlippage, p.minMarketTokens);

  const multicall = [
    { method: "sendWnt", params: [depositVaultAddress, wntAmount] },

    !isNativeLongDeposit && p.longTokenAmount > 0
      ? { method: "sendTokens", params: [p.initialLongTokenAddress, depositVaultAddress, p.longTokenAmount] }
      : undefined,

    !isNativeShortDeposit && p.shortTokenAmount > 0
      ? { method: "sendTokens", params: [p.initialShortTokenAddress, depositVaultAddress, p.shortTokenAmount] }
      : undefined,

    {
      method: "createDeposit",
      params: [
        {
          receiver: p.account,
          callbackContract: ethers.ZeroAddress,
          market: p.marketTokenAddress,
          initialLongToken: initialLongTokenAddress,
          initialShortToken: initialShortTokenAddress,
          longTokenSwapPath: p.longTokenSwapPath,
          shortTokenSwapPath: p.shortTokenSwapPath,
          minMarketTokens: minMarketTokens,
          shouldUnwrapNativeToken: shouldUnwrapNativeToken,
          executionFee: p.executionFee,
          callbackGasLimit: 0n,
          uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? ethers.ZeroAddress,
        },
      ],
    },
  ];

  const encodedPayload = multicall
    .filter(Boolean)
    .map((call) => contract.interface.encodeFunctionData(call!.method, call!.params));

  if (!p.skipSimulation) {
    await simulateExecuteTxn(chainId, {
      account: p.account,
      primaryPriceOverrides: {},
      tokensData: p.tokensData,
      createMulticallPayload: encodedPayload,
      method: "simulateExecuteDeposit",
      errorTitle: t`Deposit error.`,
      value: wntAmount,
    });
  }

  return callContract(chainId, contract, "multicall", [encodedPayload], {
    value: wntAmount,
    hideSentMsg: true,
    hideSuccessMsg: true,
    setPendingTxns: p.setPendingTxns,
  }).then(() => {
    p.setPendingDeposit({
      account: p.account,
      marketAddress: p.marketTokenAddress,
      initialLongTokenAddress,
      initialShortTokenAddress,
      longTokenSwapPath: p.longTokenSwapPath,
      shortTokenSwapPath: p.shortTokenSwapPath,
      initialLongTokenAmount: p.longTokenAmount,
      initialShortTokenAmount: p.shortTokenAmount,
      minMarketTokens: minMarketTokens,
      shouldUnwrapNativeToken,
    });
  });
}

// interface GlvParams {
//   account: account,
//   glv: params.glv,
//   receiver: params.receiver,
//   callbackContract: params.callbackContract,
//   uiFeeReceiver: params.uiFeeReceiver,
//   market: params.market,
//   initialLongToken: params.initialLongToken,
//   initialShortToken: params.initialShortToken,
//   longTokenSwapPath: params.longTokenSwapPath,
//   shortTokenSwapPath: params.shortTokenSwapPath

// export async function createGlvDepositTxn(chainId: number, signer: Signer, p: GlvParams) {
//   const contract = getContract(chainId, "GlvRouter");
//   return useMulticall(chainId, "createGlvDepositTxn", {
//     refreshInterval: null,
//     key: ["createGlvDepositTxn"],
//     request: () => {
//       return {
//         glvs: {
//           contractAddress: contract,
//           abi: GlvRouter.abi,
//           calls: {
//             list: {
//               methodName: "createGlvDeposit",
//               // {
//               //   "internalType": "address",
//               //   "name": "receiver",
//               //   "type": "address"
//               // },
//               // {
//               //   "internalType": "address",
//               //   "name": "callbackContract",
//               //   "type": "address"
//               // },
//               // {
//               //   "internalType": "address",
//               //   "name": "uiFeeReceiver",
//               //   "type": "address"
//               // },
//               // {
//               //   "internalType": "address",
//               //   "name": "market",
//               //   "type": "address"
//               // },
//               // {
//               //   "internalType": "address",
//               //   "name": "glv",
//               //   "type": "address"
//               // },
//               // {
//               //   "internalType": "address[]",
//               //   "name": "longTokenSwapPath",
//               //   "type": "address[]"
//               // },
//               // {
//               //   "internalType": "address[]",
//               //   "name": "shortTokenSwapPath",
//               //   "type": "address[]"
//               // },
//               // {
//               //   "internalType": "uint256",
//               //   "name": "minLongTokenAmount",
//               //   "type": "uint256"
//               // },
//               // {
//               //   "internalType": "uint256",
//               //   "name": "minShortTokenAmount",
//               //   "type": "uint256"
//               // },
//               // {
//               //   "internalType": "bool",
//               //   "name": "shouldUnwrapNativeToken",
//               //   "type": "bool"
//               // },
//               // {
//               //   "internalType": "uint256",
//               //   "name": "executionFee",
//               //   "type": "uint256"
//               // },
//               // {
//               //   "internalType": "uint256",
//               //   "name": "callbackGasLimit",
//               //   "type": "uint256"
//               // }
//               params: [{
//                 receiver: p.account,
//               }

//               ],
//             },
//           },
//         },
//       };
//     },
//     parseResponse(result) {
//       return result.data.glvs.list.returnValues as GlvList;
//     },
//   });
// }
