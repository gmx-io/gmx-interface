import { BytesLike, ethers } from "ethers";

import { abis } from "sdk/abis";

const customErrors = new ethers.Contract(ethers.ZeroAddress, abis.CustomErrorsArbitrumSepolia);

export function tryGetError(reasonBytes: BytesLike): ReturnType<typeof customErrors.interface.parseError> | undefined {
  let error: ReturnType<typeof customErrors.interface.parseError> | undefined;

  try {
    error = customErrors.interface.parseError(reasonBytes);
  } catch (error) {
    return undefined;
  }

  return error;
}
