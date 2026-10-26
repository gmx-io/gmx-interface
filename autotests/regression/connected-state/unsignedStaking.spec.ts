import { expect } from "@playwright/test";
import { decodeFunctionData, getAddress, zeroAddress } from "viem";

import RewardRouter from "../../../sdk/src/abis/RewardRouter";
import { getContract } from "../../../sdk/src/configs/contracts";
import type { ContractsChainId } from "../../../sdk/src/configs/chains";
import { test } from "../fixtures/accountState";

test.use({ walletReviewMode: true, unsignedReviewMode: true });
test("unsigned GMX staking: exact amount reaches RewardRouter and rejection restores the form", async ({
  page,
  accountState,
  chainId,
  walletReviews,
}) => {
  const chain = chainId as ContractsChainId;
  const gmx = getAddress(getContract(chain, "GMX"));
  accountState.balances.set(gmx, 10n ** 18n);
  accountState.balances.set(zeroAddress, 10n ** 18n);
  accountState.allowances.set(gmx, new Map([[getAddress(getContract(chain, "StakedGmxTracker")), 10n ** 18n]]));
  await accountState.connect(page, "/earn/portfolio");
  await page.getByRole("button", { name: "Stake GMX", exact: true }).click();
  const modal = page.locator(".StakeModal .Modal-content");
  await modal.getByRole("textbox").fill("0.01");
  const submit = modal.getByRole("button", { name: "Stake", exact: true }).last();
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect.poll(() => walletReviews.length).toBe(1);
  expect(walletReviews[0].method).toBe("eth_sendTransaction");
  const tx = walletReviews[0].params![0] as { to: string; data: string; value?: string };
  expect(getAddress(tx.to)).toBe(getAddress(getContract(chain, "RewardRouter")));
  expect(BigInt(tx.value ?? "0")).toBe(0n);
  const call = decodeFunctionData({ abi: RewardRouter, data: tx.data });
  expect(call.functionName).toBe("stakeGmx");
  expect(call.args).toEqual([10n ** 16n]);
  await expect(submit).toBeEnabled();
  await expect(modal.getByRole("textbox")).toHaveValue("0.01");
});
