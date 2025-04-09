/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Interface, type ContractRunner } from "ethers";
import type { MultichainOrderRouterUtils, MultichainOrderRouterUtilsInterface } from "../MultichainOrderRouterUtils";

const _abi = [
  {
    inputs: [],
    name: "RelayPriceOutdated",
    type: "error",
  },
  {
    inputs: [],
    name: "UnableToPayOrderFee",
    type: "error",
  },
  {
    inputs: [],
    name: "UnableToPayOrderFeeFromCollateral",
    type: "error",
  },
] as const;

export class MultichainOrderRouterUtils__factory {
  static readonly abi = _abi;
  static createInterface(): MultichainOrderRouterUtilsInterface {
    return new Interface(_abi) as MultichainOrderRouterUtilsInterface;
  }
  static connect(address: string, runner?: ContractRunner | null): MultichainOrderRouterUtils {
    return new Contract(address, _abi, runner) as unknown as MultichainOrderRouterUtils;
  }
}
