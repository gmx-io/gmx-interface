import { Module } from "clients/v1/modules/base";
import { getContract } from "configs/contracts";

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
          abiId: "GovToken",
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
