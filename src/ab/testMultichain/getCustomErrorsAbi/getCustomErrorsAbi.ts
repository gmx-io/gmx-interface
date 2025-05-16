import { getIsFlagEnabled } from "config/ab";
import { abis } from "sdk/abis";

export const CustomErrorsAbi = getIsFlagEnabled("testMultichain")
  ? abis.CustomErrorsArbitrumSepolia
  : abis.CustomErrors;
