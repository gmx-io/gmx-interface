import { encodePacked, Hex, toBytes, bytesToBigInt, bytesToHex } from "viem";

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
  public static encode(_nonce: bigint, _srcEid: number, _amountLD: bigint, _composeMsg: string): Hex {
    return encodePacked(["uint64", "uint32", "uint256", "bytes"], [_nonce, _srcEid, _amountLD, _composeMsg]);
  }

  /**
   * @dev Retrieves the nonce from the composed message.
   * @param _msg The message.
   * @return The nonce value.
   */
  public static nonce(_msg: Hex): bigint {
    const bytes = toBytes(_msg);
    return bytesToBigInt(bytes.slice(0, OFTComposeMsgCodec.NONCE_OFFSET));
  }

  /**
   * @dev Retrieves the source endpoint ID from the composed message.
   * @param _msg The message.
   * @return The source endpoint ID.
   */
  public static srcEid(_msg: Hex): bigint {
    const bytes = toBytes(_msg);
    return bytesToBigInt(bytes.slice(OFTComposeMsgCodec.NONCE_OFFSET, OFTComposeMsgCodec.SRC_EID_OFFSET));
  }

  /**
   * @dev Retrieves the amount in local decimals from the composed message.
   * @param _msg The message.
   * @return The amount in local decimals.
   */
  public static amountLD(_msg: Hex): bigint {
    const bytes = toBytes(_msg);
    return bytesToBigInt(bytes.slice(OFTComposeMsgCodec.SRC_EID_OFFSET, OFTComposeMsgCodec.AMOUNT_LD_OFFSET));
  }

  /**
   * @dev Retrieves the composeFrom value from the composed message.
   * @param _msg The message.
   * @return The composeFrom value.
   */
  public static composeFrom(_msg: Hex): Hex {
    const bytes = toBytes(_msg);
    return bytesToHex(bytes.slice(OFTComposeMsgCodec.AMOUNT_LD_OFFSET, OFTComposeMsgCodec.COMPOSE_FROM_OFFSET));
  }

  /**
   * @dev Retrieves the composed message.
   * @param _msg The message.
   * @return The composed message.
   */
  public static composeMsg(_msg: Hex): Hex {
    const bytes = toBytes(_msg);
    return bytesToHex(bytes.slice(OFTComposeMsgCodec.COMPOSE_FROM_OFFSET));
  }
}
