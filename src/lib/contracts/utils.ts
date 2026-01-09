import { BaseContract, Contract } from "ethers";

/**
 * @deprecated use estimateGasLimit instead
 */
export async function getGasLimit(
  contract: Contract | BaseContract,
  method,
  params: any[] = [],
  value?: bigint | number,
  from?: string
) {
  const defaultValue = 0n;

  if (value === undefined) {
    value = defaultValue;
  }

  let gasLimit = 0n;
  try {
    gasLimit = await contract[method].estimateGas(...params, { value, from });
  } catch (error) {
    // this call should throw another error instead of the `error`
    await contract[method].staticCall(...params, { value, from });

    // if not we throw estimateGas error
    throw error;
  }

  if (gasLimit < 22000) {
    gasLimit = 22_000n;
  }

  return (gasLimit * 11n) / 10n; // add a 10% buffer
}
