import { getContract } from "configs/contracts";
import { Module } from "../base";

import GovToken from "sdk/abis/GovToken.json";

export class Accounts extends Module {
  get govTokenAddress() {
    let govTokenAddress;

    try {
      govTokenAddress = getContract(this.chainId, "GovToken");
    } catch (e) {
      govTokenAddress = null;
    }

    return govTokenAddress;
  }

  getGovTokenDelegates(account?: string) {
    if (!this.govTokenAddress) {
      return Promise.resolve([]);
    }

    return this.sdk
      .executeMulticall({
        govToken: {
          contractAddress: this.govTokenAddress,
          abi: GovToken.abi,
          calls: {
            delegates: {
              methodName: "delegates",
              params: [account ?? this.account],
            },
          },
        },
      })
      .then((res) => {
        return res.data.govToken.delegates.returnValues[0];
      });
  }
}
