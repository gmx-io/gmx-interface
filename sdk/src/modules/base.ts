import type { GmxSdk } from "index";
import { Oracle } from "./oracle";

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
    return this.sdk.config.account;
  }
}
