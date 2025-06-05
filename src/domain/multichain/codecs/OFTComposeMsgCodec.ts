import { BigNumberish, BytesLike, getBytes, solidityPacked, toBigInt } from "ethers";
import type { Hex } from "viem";

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
