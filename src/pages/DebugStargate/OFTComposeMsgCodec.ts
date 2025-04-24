import { addressToBytes32 } from "@layerzerolabs/lz-v2-utilities";
import { AbiCoder, BigNumberish, BytesLike, getBytes, hexlify, solidityPacked, toBigInt } from "ethers";
import { Address, Hex, concatHex } from "viem";

import { ARBITRUM_SEPOLIA, UiSettlementChain } from "sdk/configs/chains";

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
    // _msg = abi.encodePacked(_nonce, _srcEid, _amountLD, _composeMsg);
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
    // return uint32(bytes4(_msg[NONCE_OFFSET:SRC_EID_OFFSET]));
    const bytes = getBytes(_msg);
    return toBigInt(bytes.slice(OFTComposeMsgCodec.NONCE_OFFSET, OFTComposeMsgCodec.SRC_EID_OFFSET));
  }

  /**
   * @dev Retrieves the amount in local decimals from the composed message.
   * @param _msg The message.
   * @return The amount in local decimals.
   */
  public static amountLD(_msg: BytesLike): bigint {
    // return uint256(bytes32(_msg[SRC_EID_OFFSET:AMOUNT_LD_OFFSET]));
    const bytes = getBytes(_msg);
    return toBigInt(bytes.slice(OFTComposeMsgCodec.SRC_EID_OFFSET, OFTComposeMsgCodec.AMOUNT_LD_OFFSET));
  }

  /**
   * @dev Retrieves the composeFrom value from the composed message.
   * @param _msg The message.
   * @return The composeFrom value.
   */
  public static composeFrom(_msg: BytesLike): BytesLike {
    // return bytes32(_msg[AMOUNT_LD_OFFSET:COMPOSE_FROM_OFFSET]);
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

const LZ_ENDPOINT_MAP: Record<UiSettlementChain, Address> = {
  [ARBITRUM_SEPOLIA]: "0x6EDCE65403992e310A62460808c4b910D972f10f",
};

export class CodecUiHelper {
  public static encodeDepositMessage(account: string, srcChainId: number): string {
    return AbiCoder.defaultAbiCoder().encode(["address", "uint256"], [account, srcChainId]);
  }

  public static encodeComposeMsg(composeFromAddress: string, msg: string) {
    if (!msg.startsWith("0x")) {
      throw new Error("msg must start with 0x");
    }

    const composeFrom = hexlify(addressToBytes32(composeFromAddress));

    const composeFromWithMsg = concatHex([composeFrom as Hex, msg as Hex]);

    return composeFromWithMsg;
  }

  public static decodeDepositMessage(message: BytesLike): { account: string; srcChainId: number } {
    const result = AbiCoder.defaultAbiCoder().decode(["address", "uint256"], message, false);
    return { account: result[0], srcChainId: result[1] };
  }

  public static composeMessage(dstChainId: number, account: string, srcChainId: number) {
    const msg = CodecUiHelper.encodeDepositMessage(account, srcChainId);
    return CodecUiHelper.encodeComposeMsg(CodecUiHelper.getLzEndpoint(dstChainId), msg);
  }

  public static getLzEndpoint(chainId: number): Address {
    if (!LZ_ENDPOINT_MAP[chainId]) {
      throw new Error(`LZ endpoint not found for chainId: ${chainId}`);
    }
    return LZ_ENDPOINT_MAP[chainId];
  }
}
