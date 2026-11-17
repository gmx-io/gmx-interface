import { expect } from "@playwright/test";
import { decodeFunctionData, encodeFunctionResult, getAddress, stringToHex, type Hex } from "viem";

import ReferralStorage from "../../../sdk/src/abis/ReferralStorage";
import type { ContractsChainId } from "../../../sdk/src/configs/chains";
import { getContract } from "../../../sdk/src/configs/contracts";
import { test, type AccountState } from "../fixtures/accountState";

const OWNER = getAddress("0x1111111111111111111111111111111111111111");
const TIER = 1n;

// Only the ReferralStorage reads for this trader and the mocked code owner are replaced.
function mockReferralCode(accountState: AccountState, chainId: number, code: string, tier: [bigint, bigint]) {
  const storage = getAddress(getContract(chainId as ContractsChainId, "ReferralStorage"));
  const codeHash = stringToHex(code, { size: 32 }) as `0x${string}`;
  accountState.contractRead = (target, data): Hex | undefined => {
    if (target !== storage) return;
    let call: ReturnType<typeof decodeFunctionData<typeof ReferralStorage>>;
    try {
      call = decodeFunctionData({ abi: ReferralStorage, data });
    } catch {
      return;
    }
    const abi = ReferralStorage;
    if (call.functionName === "traderReferralCodes" && getAddress(call.args[0]) === accountState.address)
      return encodeFunctionResult({ abi, functionName: "traderReferralCodes", result: codeHash });
    if (call.functionName === "codeOwners" && call.args[0] === codeHash)
      return encodeFunctionResult({ abi, functionName: "codeOwners", result: OWNER });
    if (call.functionName === "referrerTiers" && getAddress(call.args[0]) === OWNER)
      return encodeFunctionResult({ abi, functionName: "referrerTiers", result: TIER });
    if (call.functionName === "referrerDiscountShares" && getAddress(call.args[0]) === OWNER)
      return encodeFunctionResult({ abi, functionName: "referrerDiscountShares", result: 0n });
    if (call.functionName === "tiers" && call.args[0] === TIER)
      return encodeFunctionResult({ abi, functionName: "tiers", result: tier });
  };
}

for (const { tier, discount } of [
  { tier: [1000n, 5000n] as [bigint, bigint], discount: 5 },
  { tier: [2000n, 5000n] as [bigint, bigint], discount: 10 },
]) {
  test(`15.03 trader with a tier ${discount}% referral code sees the discount on Trader Benefits`, async ({
    page,
    accountState,
    chainId,
  }) => {
    mockReferralCode(accountState, chainId, "REGRESSION_CODE", tier);
    await accountState.connect(page, "/referrals/traders");
    await expect(page.getByText("Active referral code", { exact: true })).toBeVisible();
    await expect(page.getByText("REGRESSION_CODE", { exact: true })).toBeVisible();
    await expect(page.getByText(`You're now receiving a ${discount}% discount on your trades!`)).toBeVisible();
    await expect(page.getByText("The reduced rate applies to every open and close fee.")).toBeVisible();
    await expect(
      page.getByText(/GMX assigned this protocol referral code|replaced with a GMX protocol code/)
    ).toHaveCount(0);
  });
}

for (const { code, tier, copy } of [
  {
    code: "EARNED_TRADER_DISCOUNT_5",
    tier: [1000n, 5000n] as [bigint, bigint],
    copy: "You've reached a trading volume threshold, so GMX assigned this protocol referral code. You're receiving a 5% discount on opening and closing fees.",
  },
  {
    code: "DIRECT_GMX_DISCOUNT_10",
    tier: [2000n, 5000n] as [bigint, bigint],
    copy: "Your previous referral code has been replaced with a GMX protocol code after your trades reached the referral program's graduation threshold. You keep your 10% discount on opening and closing fees.",
  },
]) {
  test(`15.07 protocol-assigned ${code} shows its explanatory copy`, async ({ page, accountState, chainId }) => {
    mockReferralCode(accountState, chainId, code, tier);
    await accountState.connect(page, "/referrals/traders");
    await expect(page.getByText(code, { exact: true })).toBeVisible();
    const explanation = page.getByText(copy);
    await expect(explanation).toBeVisible();
    await expect(explanation.getByRole("link", { name: "Read more" })).toHaveAttribute(
      "href",
      /docs\.gmx\.io\/docs\/referrals/
    );
    await expect(page.getByText(/You're now receiving a \d+% discount on your trades!/)).toHaveCount(0);
  });
}
