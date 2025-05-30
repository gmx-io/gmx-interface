import { addressToBytes32 } from "@layerzerolabs/lz-v2-utilities";
import { AbiCoder, hexlify, ParamType } from "ethers";
import { Address, concatHex, Hex } from "viem";

import { MultichainRelayParamsPayload } from "domain/synthetics/express";
import type { UiContractsChain, UiSettlementChain } from "sdk/configs/chains";
import { getContract } from "sdk/configs/contracts";

export enum MultichainActionType {
  None = 0,
  Deposit = 1,
  GlvDeposit = 2,
  BridgeOut = 3,
  SetTraderReferralCode = 4,
}

type CommonActionData = {
  relayParams: MultichainRelayParamsPayload;
  signature: string;
};

type SetTraderReferralCodeActionData = CommonActionData & {
  referralCode: string;
};

type SetTraderReferralCodeAction = {
  actionType: MultichainActionType.SetTraderReferralCode;
  actionData: SetTraderReferralCodeActionData;
};

// const RELAY_PARAMS_TYPE_RAW = `tuple(
//     tuple(
//       address[] tokens,
//       address[] providers,
//       bytes[] data
//     ) oracleParams,
//     tuple(
//       address[] sendTokens,
//       uint256[] sendAmounts,
//       address[] externalCallTargets,
//       bytes[] externalCallDataList,
//       address[] refundTokens,
//       address[] refundReceivers
//     ) externalCalls,
//     tuple(
//       address owner,
//       address spender,
//       uint256 value,
//       uint256 deadline,
//       address token
//     )[] tokenPermits,
//     tuple(
//       address feeToken,
//       uint256 feeAmount,
//       address[] feeSwapPath
//     ) fee,
//     uint256 userNonce,
//     uint256 deadline,
//     bytes signature,
//     uint256 desChainId
//   )`;
// console.log(RELAY_PARAMS_TYPE.format("full"));

const RELAY_PARAMS_TYPE = ParamType.from({
  type: "tuple",
  name: "",
  components: [
    {
      type: "tuple",
      name: "oracleParams",
      components: [
        { type: "address[]", name: "tokens" },
        { type: "address[]", name: "providers" },
        { type: "bytes[]", name: "data" },
      ],
    },
    {
      type: "tuple",
      name: "externalCalls",
      components: [
        { type: "address[]", name: "sendTokens" },
        { type: "uint256[]", name: "sendAmounts" },
        { type: "address[]", name: "externalCallTargets" },
        { type: "bytes[]", name: "externalCallDataList" },
        { type: "address[]", name: "refundTokens" },
        { type: "address[]", name: "refundReceivers" },
      ],
    },
    {
      type: "tuple[]",
      name: "tokenPermits",
      components: [
        { type: "address", name: "owner" },
        { type: "address", name: "spender" },
        { type: "uint256", name: "value" },
        { type: "uint256", name: "deadline" },
        { type: "address", name: "token" },
      ],
    },
    {
      type: "tuple",
      name: "fee",
      components: [
        { type: "address", name: "feeToken" },
        { type: "uint256", name: "feeAmount" },
        { type: "address[]", name: "feeSwapPath" },
      ],
    },
    { type: "uint256", name: "userNonce" },
    { type: "uint256", name: "deadline" },
    { type: "bytes", name: "signature" },
    { type: "uint256", name: "desChainId" },
  ],
});

// const RELAY_PARAMS_TYPE = ParamType.from(RELAY_PARAMS_TYPE_RAW);

// console.log(RELAY_PARAMS_TYPE.format("json"));

export type MultichainAction = SetTraderReferralCodeAction;

export class CodecUiHelper {
  public static encodeDepositMessage(account: string, data?: string): string {
    return AbiCoder.defaultAbiCoder().encode(["address", "bytes"], [account, data ?? "0x"]);
  }

  public static encodeComposeMsg(composeFromAddress: string, msg: string) {
    if (!msg.startsWith("0x")) {
      throw new Error("msg must start with 0x");
    }

    const composeFrom = hexlify(addressToBytes32(composeFromAddress));

    const composeFromWithMsg = concatHex([composeFrom as Hex, msg as Hex]);

    return composeFromWithMsg;
  }

  // public static decodeDepositMessage(message: BytesLike): { account: string; data: string } {
  //   const result = AbiCoder.defaultAbiCoder().decode(["address", "bytes"], message, false);
  //   return { account: result[0], data: result[1] };
  // }

  public static composeDepositMessage(dstChainId: UiSettlementChain, account: string, data?: string) {
    const msg = CodecUiHelper.encodeDepositMessage(account, data);
    return CodecUiHelper.encodeComposeMsg(CodecUiHelper.getLzEndpoint(dstChainId), msg);
  }

  public static getLzEndpoint(chainId: UiContractsChain): Address {
    const layerZeroEndpoint = getContract(chainId, "LayerZeroEndpoint");

    return layerZeroEndpoint;
  }

  public static encodeMultichainActionData(action: MultichainAction): string {
    if (action.actionType === MultichainActionType.SetTraderReferralCode) {
      const actionData = AbiCoder.defaultAbiCoder().encode(
        [RELAY_PARAMS_TYPE, "bytes32"],
        [{ ...action.actionData.relayParams, signature: action.actionData.signature }, action.actionData.referralCode]
      );

      const data = AbiCoder.defaultAbiCoder().encode(["uint8", "bytes"], [action.actionType, actionData]);

      return data;
    }

    throw new Error("Unsupported multichain action type");
  }
}
