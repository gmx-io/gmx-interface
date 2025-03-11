/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Interface, type ContractRunner } from "ethers";
import type {
  OrderBookReader,
  OrderBookReaderInterface,
} from "../OrderBookReader";

const _abi = [
  {
    inputs: [
      {
        internalType: "address payable",
        name: "_orderBookAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_account",
        type: "address",
      },
      {
        internalType: "uint256[]",
        name: "_indices",
        type: "uint256[]",
      },
    ],
    name: "getDecreaseOrders",
    outputs: [
      {
        internalType: "uint256[]",
        name: "",
        type: "uint256[]",
      },
      {
        internalType: "address[]",
        name: "",
        type: "address[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address payable",
        name: "_orderBookAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_account",
        type: "address",
      },
      {
        internalType: "uint256[]",
        name: "_indices",
        type: "uint256[]",
      },
    ],
    name: "getIncreaseOrders",
    outputs: [
      {
        internalType: "uint256[]",
        name: "",
        type: "uint256[]",
      },
      {
        internalType: "address[]",
        name: "",
        type: "address[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address payable",
        name: "_orderBookAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_account",
        type: "address",
      },
      {
        internalType: "uint256[]",
        name: "_indices",
        type: "uint256[]",
      },
    ],
    name: "getSwapOrders",
    outputs: [
      {
        internalType: "uint256[]",
        name: "",
        type: "uint256[]",
      },
      {
        internalType: "address[]",
        name: "",
        type: "address[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export class OrderBookReader__factory {
  static readonly abi = _abi;
  static createInterface(): OrderBookReaderInterface {
    return new Interface(_abi) as OrderBookReaderInterface;
  }
  static connect(
    address: string,
    runner?: ContractRunner | null
  ): OrderBookReader {
    return new Contract(address, _abi, runner) as unknown as OrderBookReader;
  }
}
