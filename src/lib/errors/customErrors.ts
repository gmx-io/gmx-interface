import { decodeErrorResult } from "viem";

import { SignedTokenPermit } from "domain/tokens";
import { abis } from "sdk/abis";

import { ErrorData, ErrorLike, extendError, parseError } from ".";

export const INVALID_PERMIT_SIGNATURE_ERROR = "Invalid permit signature";

export function getIsPermitSignatureError(error: ErrorLike) {
  const parsedError = parseError(error);

  return parsedError?.errorMessage?.includes(INVALID_PERMIT_SIGNATURE_ERROR);
}

export function getIsPermitSignatureErrorOnSimulation(error: ErrorLike) {
  const parsedError = parseError(error);

  if (!parsedError || parsedError.errorContext !== "simulation" || parsedError.contractError !== "ExternalCallFailed") {
    return false;
  }

  const decodedExternalCallFailed = decodeErrorResult({
    abi: abis.CustomErrors,
    data: parsedError.contractErrorArgs[0],
  });

  const errorArg = decodedExternalCallFailed?.args[0];

  return typeof errorArg === "string" && errorArg.includes("invalid signature");
}

export function getInvalidPermitSignatureError({
  recoveredAddress,
  error,
  permit,
}: {
  recoveredAddress: string | undefined;
  error: ErrorData | undefined;
  permit: SignedTokenPermit;
}) {
  return extendError(new Error(INVALID_PERMIT_SIGNATURE_ERROR), {
    data: {
      originalError: error,
      recoveredAddress,
      owner: permit.owner,
      spender: permit.spender,
      value: permit.value,
      deadline: permit.deadline,
      onchainParams: {
        name: permit.onchainParams.name,
        version: permit.onchainParams.version,
        nonce: permit.onchainParams.nonce,
      },
    },
  });
}

export function getIsPossibleExternalSwapError(error: ErrorLike) {
  const parsedError = parseError(error);

  const isExternalCallError = parsedError?.contractError === "ExternalCallFailed";

  const isPayloadRelatedError = parsedError?.errorMessage?.includes("execution reverted");

  return isExternalCallError || isPayloadRelatedError;
}
