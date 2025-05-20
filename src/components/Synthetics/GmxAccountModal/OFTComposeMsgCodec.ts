import { addressToBytes32 } from "@layerzerolabs/lz-v2-utilities";
import { AbiCoder, BigNumberish, BytesLike, getBytes, hexlify, solidityPacked, toBigInt } from "ethers";
import { Address, Hex, concatHex } from "viem";

import type { UiContractsChain, UiSettlementChain, UiSourceChain } from "sdk/configs/chains";
import { getContract } from "sdk/configs/contracts";

export class OFTComposeMsgCodec {
  // Offset constants for decoding composed messages
  private static readonly NONCE_OFFSET = 8;
  private static readonly SRC_EID_OFFSET = 12;
  private static readonly AMOUNT_LD_OFFSET = 44;
  private static readonly COMPOSE_FROM_OFFSET = 76;

  /**
   * @dev Encodes a OFT composed message.
   * @param _nonce The nonce value.
   * @param _srcEid The source endpoint ID.
   * @param _amountLD The amount in local decimals.
   * @param _composeMsg The composed message. `0x[composeFrom][composeMsg]`
   * @return _msg The encoded Composed message.
   */
  public static encode(
    _nonce: BigNumberish,
    _srcEid: BigNumberish,
    _amountLD: BigNumberish,
    _composeMsg: BytesLike
  ): Hex {
    return solidityPacked(["uint64", "uint32", "uint256", "bytes"], [_nonce, _srcEid, _amountLD, _composeMsg]) as Hex;
  }

  /**
   * @dev Retrieves the nonce from the composed message.
   * @param _msg The message.
   * @return The nonce value.
   */
  public static nonce(_msg: BytesLike): bigint {
    const bytes = getBytes(_msg);
    return toBigInt(bytes.slice(0, OFTComposeMsgCodec.NONCE_OFFSET));
  }

  /**
   * @dev Retrieves the source endpoint ID from the composed message.
   * @param _msg The message.
   * @return The source endpoint ID.
   */
  public static srcEid(_msg: BytesLike): bigint {
    const bytes = getBytes(_msg);
    return toBigInt(bytes.slice(OFTComposeMsgCodec.NONCE_OFFSET, OFTComposeMsgCodec.SRC_EID_OFFSET));
  }

  /**
   * @dev Retrieves the amount in local decimals from the composed message.
   * @param _msg The message.
   * @return The amount in local decimals.
   */
  public static amountLD(_msg: BytesLike): bigint {
    const bytes = getBytes(_msg);
    return toBigInt(bytes.slice(OFTComposeMsgCodec.SRC_EID_OFFSET, OFTComposeMsgCodec.AMOUNT_LD_OFFSET));
  }

  /**
   * @dev Retrieves the composeFrom value from the composed message.
   * @param _msg The message.
   * @return The composeFrom value.
   */
  public static composeFrom(_msg: BytesLike): BytesLike {
    const bytes = getBytes(_msg);
    return bytes.slice(OFTComposeMsgCodec.AMOUNT_LD_OFFSET, OFTComposeMsgCodec.COMPOSE_FROM_OFFSET);
  }

  /**
   * @dev Retrieves the composed message.
   * @param _msg The message.
   * @return The composed message.
   */
  public static composeMsg(_msg: BytesLike): BytesLike {
    const bytes = getBytes(_msg);
    return bytes.slice(OFTComposeMsgCodec.COMPOSE_FROM_OFFSET);
  }
}

export class CodecUiHelper {
  public static encodeDepositMessage(account: string, srcChainId: UiSourceChain): string {
    return AbiCoder.defaultAbiCoder().encode(["address", "uint256", "bytes"], [account, srcChainId, "0x"]);
  }

  public static encodeComposeMsg(composeFromAddress: string, msg: string) {
    if (!msg.startsWith("0x")) {
      throw new Error("msg must start with 0x");
    }

    const composeFrom = hexlify(addressToBytes32(composeFromAddress));

    const composeFromWithMsg = concatHex([composeFrom as Hex, msg as Hex]);

    return composeFromWithMsg;
  }

  public static decodeDepositMessage(message: BytesLike): { account: string; srcChainId: UiSourceChain; data: string } {
    const result = AbiCoder.defaultAbiCoder().decode(["address", "uint256", "bytes"], message, false);
    return { account: result[0], srcChainId: result[1], data: result[2] };
  }

  public static composeMessage(dstChainId: UiSettlementChain, account: string, srcChainId: UiSourceChain) {
    const msg = CodecUiHelper.encodeDepositMessage(account, srcChainId);
    return CodecUiHelper.encodeComposeMsg(CodecUiHelper.getLzEndpoint(dstChainId), msg);
  }

  public static getLzEndpoint(chainId: UiContractsChain): Address {
    const layerZeroEndpoint = getContract(chainId, "LayerZeroEndpoint");

    return layerZeroEndpoint;
  }
}
