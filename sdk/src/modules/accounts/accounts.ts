import { getContract } from "configs/contracts";
import { Module } from "../base";

import GovToken from "abis/GovToken.json";

export class Accounts extends Module {
  getGovTokenDelegates(account?: string) {
    let govTokenAddress;

    try {
      govTokenAddress = getContract(this.chainId, "GovToken");
    } catch (e) {
      govTokenAddress = null;
    }

    if (!govTokenAddress) {
      return Promise.resolve([]);
    }

    return this.sdk
      .executeMulticall({
        govToken: {
          contractAddress: govTokenAddress,
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
