import { addressToBytes32 } from "@layerzerolabs/lz-v2-utilities";
import { Address, concatHex, encodeAbiParameters, Hex, isHex, toHex, zeroAddress } from "viem";

import { TransferRequests } from "domain/multichain/types";
import type { RelayParamsPayload } from "domain/synthetics/express";
import {
  CreateDepositParamsStruct,
  CreateGlvDepositParamsStruct,
  CreateGlvWithdrawalParamsStruct,
  CreateWithdrawalParamsStruct,
} from "domain/synthetics/markets/types";
import type { ContractsChainId, SettlementChainId } from "sdk/configs/chains";
import { getContract } from "sdk/configs/contracts";
import { hashString } from "sdk/utils/hash";

import {
  BRIDGE_OUT_PARAMS,
  CREATE_DEPOSIT_PARAMS_TYPE,
  CREATE_GLV_DEPOSIT_PARAMS_TYPE,
  CREATE_GLV_WITHDRAWAL_PARAMS_TYPE,
  CREATE_WITHDRAWAL_PARAMS_TYPE,
  RELAY_PARAMS_TYPE,
  TRANSFER_REQUESTS_TYPE,
} from "./hashParamsAbiItems";

export enum MultichainActionType {
  None = 0,
  Deposit = 1,
  GlvDeposit = 2,
  BridgeOut = 3,
  SetTraderReferralCode = 4,
  Withdrawal = 5,
  GlvWithdrawal = 6,
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
  transferRequests: TransferRequests;
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
  secondaryProvider: string;
  secondaryProviderData: string;
  secondaryMinAmountOut: bigint;
};

type BridgeOutAction = {
  actionType: MultichainActionType.BridgeOut;
  actionData: BridgeOutActionData;
};

type GlvDepositActionData = CommonActionData & {
  transferRequests: TransferRequests;
  params: CreateGlvDepositParamsStruct;
};

type GlvDepositAction = {
  actionType: MultichainActionType.GlvDeposit;
  actionData: GlvDepositActionData;
};

type WithdrawalActionData = CommonActionData & {
  transferRequests: TransferRequests;
  params: CreateWithdrawalParamsStruct;
};

type WithdrawalAction = {
  actionType: MultichainActionType.Withdrawal;
  actionData: WithdrawalActionData;
};

type GlvWithdrawalActionData = CommonActionData & {
  transferRequests: TransferRequests;
  params: CreateGlvWithdrawalParamsStruct;
};

type GlvWithdrawalAction = {
  actionType: MultichainActionType.GlvWithdrawal;
  actionData: GlvWithdrawalActionData;
};

export type MultichainAction =
  | SetTraderReferralCodeAction
  | DepositAction
  | BridgeOutAction
  | GlvDepositAction
  | WithdrawalAction
  | GlvWithdrawalAction;

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

  // TODO MLTCH make this type safe
  public static encodeMultichainActionData(action: MultichainAction): string {
    let actionData: Hex | undefined;
    if (action.actionType === MultichainActionType.SetTraderReferralCode) {
      actionData = encodeAbiParameters(
        [RELAY_PARAMS_TYPE, { type: "bytes32" }],
        [
          { ...(action.actionData.relayParams as any), signature: action.actionData.signature as Hex },
          action.actionData.referralCode as Hex,
        ]
      );
    } else if (action.actionType === MultichainActionType.Deposit) {
      actionData = encodeAbiParameters(
        [RELAY_PARAMS_TYPE, TRANSFER_REQUESTS_TYPE, CREATE_DEPOSIT_PARAMS_TYPE],
        [
          { ...(action.actionData.relayParams as any), signature: action.actionData.signature as Hex },
          action.actionData.transferRequests as any,
          action.actionData.params as any,
        ]
      );
    } else if (action.actionType === MultichainActionType.BridgeOut) {
      if (action.actionData.secondaryProvider === zeroAddress || action.actionData.secondaryProviderData === "0x") {
        actionData = encodeAbiParameters(
          [
            { type: "uint256", name: "desChainId" },
            { type: "uint256", name: "deadline" },
            { type: "address", name: "provider" },
            { type: "bytes", name: "providerData" },
            { type: "uint256", name: "minAmountOut" },
          ],
          [
            BigInt(action.actionData.desChainId),
            action.actionData.deadline,
            action.actionData.provider as Address,
            action.actionData.providerData as Hex,
            action.actionData.minAmountOut,
          ]
        );
      } else {
        actionData = encodeAbiParameters(
          [BRIDGE_OUT_PARAMS],
          [
            {
              desChainId: BigInt(action.actionData.desChainId),
              deadline: action.actionData.deadline,
              provider: action.actionData.provider as Address,
              providerData: action.actionData.providerData as Hex,
              minAmountOut: action.actionData.minAmountOut,
              secondaryProvider: action.actionData.secondaryProvider as Address,
              secondaryProviderData: action.actionData.secondaryProviderData as Hex,
              secondaryMinAmountOut: action.actionData.secondaryMinAmountOut,
            },
          ]
        );
      }
    } else if (action.actionType === MultichainActionType.GlvDeposit) {
      actionData = encodeAbiParameters(
        [RELAY_PARAMS_TYPE, TRANSFER_REQUESTS_TYPE, CREATE_GLV_DEPOSIT_PARAMS_TYPE],
        [
          { ...(action.actionData.relayParams as any), signature: action.actionData.signature as Hex },
          action.actionData.transferRequests as any,
          action.actionData.params as any,
        ]
      );
    } else if (action.actionType === MultichainActionType.Withdrawal) {
      actionData = encodeAbiParameters(
        [RELAY_PARAMS_TYPE, TRANSFER_REQUESTS_TYPE, CREATE_WITHDRAWAL_PARAMS_TYPE],
        [
          { ...(action.actionData.relayParams as any), signature: action.actionData.signature as Hex },
          action.actionData.transferRequests as any,
          action.actionData.params as any,
        ]
      );
    } else if (action.actionType === MultichainActionType.GlvWithdrawal) {
      actionData = encodeAbiParameters(
        [RELAY_PARAMS_TYPE, TRANSFER_REQUESTS_TYPE, CREATE_GLV_WITHDRAWAL_PARAMS_TYPE],
        [
          { ...(action.actionData.relayParams as any), signature: action.actionData.signature as Hex },
          action.actionData.transferRequests as any,
          action.actionData.params as any,
        ]
      );
    }

    if (!actionData) {
      throw new Error("Unsupported multichain action type");
    }

    const data = encodeAbiParameters([{ type: "uint8" }, { type: "bytes" }], [action.actionType, actionData]);

    return data;
  }
}
