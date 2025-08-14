import { addressToBytes32 } from "@layerzerolabs/lz-v2-utilities";
import { Address, concatHex, encodeAbiParameters, Hex, isHex, toHex } from "viem";

import type { RelayParamsPayload } from "domain/synthetics/express";
import { CreateDepositParamsStruct, CreateGlvDepositParamsStruct } from "domain/synthetics/markets/types";
import type { ContractsChainId, SettlementChainId } from "sdk/configs/chains";
import { getContract } from "sdk/configs/contracts";
import { hashString } from "sdk/utils/hash";
import type { IRelayUtils } from "typechain-types/MultichainGmRouter";

import {
  CREATE_DEPOSIT_PARAMS_TYPE,
  CREATE_GLV_DEPOSIT_PARAMS_TYPE,
  RELAY_PARAMS_TYPE,
  TRANSFER_REQUESTS_TYPE,
} from "./hashParamsAbiItems";

export enum MultichainActionType {
  None = 0,
  Deposit = 1,
  GlvDeposit = 2,
  BridgeOut = 3,
  SetTraderReferralCode = 4,
}

type CommonActionData = {
  relayParams: RelayParamsPayload;
  signature: string;
};

type SetTraderReferralCodeActionData = CommonActionData & {
  referralCode: string;
};

type SetTraderReferralCodeAction = {
  actionType: MultichainActionType.SetTraderReferralCode;
  actionData: SetTraderReferralCodeActionData;
};

type DepositActionData = CommonActionData & {
  transferRequests: IRelayUtils.TransferRequestsStruct;
  params: CreateDepositParamsStruct;
};

type DepositAction = {
  actionType: MultichainActionType.Deposit;
  actionData: DepositActionData;
};

type BridgeOutActionData = {
  desChainId: ContractsChainId;
  deadline: bigint;
  provider: string;
  providerData: string;
  minAmountOut: bigint;
};

type BridgeOutAction = {
  actionType: MultichainActionType.BridgeOut;
  actionData: BridgeOutActionData;
};

type GlvDepositActionData = CommonActionData & {
  transferRequests: IRelayUtils.TransferRequestsStruct;
  params: CreateGlvDepositParamsStruct;
};

type GlvDepositAction = {
  actionType: MultichainActionType.GlvDeposit;
  actionData: GlvDepositActionData;
};

export type MultichainAction = SetTraderReferralCodeAction | DepositAction | BridgeOutAction | GlvDepositAction;

export const GMX_DATA_ACTION_HASH = hashString("GMX_DATA_ACTION");
// TODO MLTCH also implement     bytes32 public constant MAX_DATA_LENGTH = keccak256(abi.encode("MAX_DATA_LENGTH"));

export class CodecUiHelper {
  public static encodeDepositMessage(account: string, data?: string): string {
    return encodeAbiParameters([{ type: "address" }, { type: "bytes" }], [account as Address, (data as Hex) ?? "0x"]);
  }

  public static encodeComposeMsg(composeFromAddress: string, msg: string) {
    if (!isHex(msg)) {
      throw new Error("msg must start with 0x");
    }

    const composeFrom = toHex(addressToBytes32(composeFromAddress));

    const composeFromWithMsg = concatHex([composeFrom, msg]);

    return composeFromWithMsg;
  }

  public static composeDepositMessage(dstChainId: SettlementChainId, account: string, data?: string) {
    const msg = CodecUiHelper.encodeDepositMessage(account, data);
    return CodecUiHelper.encodeComposeMsg(CodecUiHelper.getLzEndpoint(dstChainId), msg);
  }

  public static getLzEndpoint(chainId: ContractsChainId): Address {
    const layerZeroEndpoint = getContract(chainId, "LayerZeroEndpoint");

    return layerZeroEndpoint;
  }

  public static encodeMultichainActionData(action: MultichainAction): string {
    if (action.actionType === MultichainActionType.SetTraderReferralCode) {
      const actionData = encodeAbiParameters(
        [RELAY_PARAMS_TYPE, { type: "bytes32" }],
        [
          { ...(action.actionData.relayParams as any), signature: action.actionData.signature as Hex },
          action.actionData.referralCode as Hex,
        ]
      );

      const data = encodeAbiParameters([{ type: "uint8" }, { type: "bytes" }], [action.actionType, actionData]);

      return data;
    } else if (action.actionType === MultichainActionType.Deposit) {
      const actionData = encodeAbiParameters(
        [RELAY_PARAMS_TYPE, TRANSFER_REQUESTS_TYPE, CREATE_DEPOSIT_PARAMS_TYPE],
        [
          { ...(action.actionData.relayParams as any), signature: action.actionData.signature as Hex },
          action.actionData.transferRequests,
          action.actionData.params,
        ]
      );

      const data = encodeAbiParameters([{ type: "uint8" }, { type: "bytes" }], [action.actionType, actionData]);

      return data;
    } else if (action.actionType === MultichainActionType.BridgeOut) {
      const actionData = encodeAbiParameters(
        [{ type: "uint256" }, { type: "uint256" }, { type: "address" }, { type: "bytes" }, { type: "uint256" }],
        [
          BigInt(action.actionData.desChainId),
          action.actionData.deadline,
          action.actionData.provider as Address,
          action.actionData.providerData as Hex,
          action.actionData.minAmountOut,
        ]
      );

      const data = encodeAbiParameters([{ type: "uint8" }, { type: "bytes" }], [action.actionType, actionData]);

      return data;
    } else if (action.actionType === MultichainActionType.GlvDeposit) {
      const actionData = encodeAbiParameters(
        [RELAY_PARAMS_TYPE, TRANSFER_REQUESTS_TYPE, CREATE_GLV_DEPOSIT_PARAMS_TYPE],
        [
          { ...(action.actionData.relayParams as any), signature: action.actionData.signature as Hex },
          action.actionData.transferRequests,
          action.actionData.params,
        ]
      );

      const data = encodeAbiParameters([{ type: "uint8" }, { type: "bytes" }], [action.actionType, actionData]);

      return data;
    }

    throw new Error("Unsupported multichain action type");
  }
}
