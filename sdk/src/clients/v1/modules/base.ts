import type { GmxSdk } from "..";

export class Module {
  constructor(public sdk: GmxSdk) {
    this.sdk = sdk;
  }

  get oracle() {
    return this.sdk.oracle;
  }

  get chainId() {
    return this.sdk.chainId;
  }

  get account() {
    return this.sdk.account;
  }
}
