/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Interface, type ContractRunner } from "ethers";
import type { OrderExecutor, OrderExecutorInterface } from "../OrderExecutor";

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_vault",
        type: "address",
      },
      {
        internalType: "address",
        name: "_orderBook",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_address",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_orderIndex",
        type: "uint256",
      },
      {
        internalType: "address payable",
        name: "_feeReceiver",
        type: "address",
      },
    ],
    name: "executeDecreaseOrder",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_address",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_orderIndex",
        type: "uint256",
      },
      {
        internalType: "address payable",
        name: "_feeReceiver",
        type: "address",
      },
    ],
    name: "executeIncreaseOrder",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_account",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_orderIndex",
        type: "uint256",
      },
      {
        internalType: "address payable",
        name: "_feeReceiver",
        type: "address",
      },
    ],
    name: "executeSwapOrder",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "orderBook",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "vault",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export class OrderExecutor__factory {
  static readonly abi = _abi;
  static createInterface(): OrderExecutorInterface {
    return new Interface(_abi) as OrderExecutorInterface;
  }
  static connect(address: string, runner?: ContractRunner | null): OrderExecutor {
    return new Contract(address, _abi, runner) as unknown as OrderExecutor;
  }
}
