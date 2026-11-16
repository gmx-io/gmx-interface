import { describe, expect, it } from "vitest";

import { USD_DECIMALS } from "config/factors";
import { AccountType } from "lib/wallets/useAccountType";
import { expandDecimals } from "sdk/utils/numbers";

import { getDefaultReceiveToGmxAccount } from "./useInitCollateralCloseDestination";

const BELOW_THRESHOLD_USD = expandDecimals(5, USD_DECIMALS);
const ABOVE_THRESHOLD_USD = expandDecimals(100, USD_DECIMALS);

describe("getDefaultReceiveToGmxAccount", () => {
  it("keeps an EOA with a small GMX Account balance on the wallet", () => {
    expect(
      getDefaultReceiveToGmxAccount({
        accountType: AccountType.EOA,
        canSignTypedData: true,
        gmxAccountUsd: BELOW_THRESHOLD_USD,
      })
    ).toBe(false);
  });

  it("moves an EOA with a funded GMX Account to the GMX Account", () => {
    expect(
      getDefaultReceiveToGmxAccount({
        accountType: AccountType.EOA,
        canSignTypedData: true,
        gmxAccountUsd: ABOVE_THRESHOLD_USD,
      })
    ).toBe(true);
  });

  it("defaults a smart wallet to the GMX Account regardless of its balance", () => {
    expect(
      getDefaultReceiveToGmxAccount({
        accountType: AccountType.SmartAccount,
        canSignTypedData: true,
        gmxAccountUsd: 0n,
      })
    ).toBe(true);
  });

  it("keeps a smart wallet that cannot sign on the balance rule, since receiving to the GMX Account needs express", () => {
    expect(
      getDefaultReceiveToGmxAccount({
        accountType: AccountType.SmartAccount,
        canSignTypedData: false,
        gmxAccountUsd: BELOW_THRESHOLD_USD,
      })
    ).toBe(false);
  });

  it("treats an EIP-7702 delegated EOA as an EOA", () => {
    expect(
      getDefaultReceiveToGmxAccount({
        accountType: AccountType.PostEip7702EOA,
        canSignTypedData: true,
        gmxAccountUsd: BELOW_THRESHOLD_USD,
      })
    ).toBe(false);
  });

  it("falls back to the balance rule when the account type is unknown", () => {
    expect(
      getDefaultReceiveToGmxAccount({
        accountType: undefined,
        canSignTypedData: true,
        gmxAccountUsd: ABOVE_THRESHOLD_USD,
      })
    ).toBe(true);
  });
});
