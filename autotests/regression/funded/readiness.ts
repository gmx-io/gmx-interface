import assert from "node:assert/strict";
import { erc20Abi, getAddress, parseAbi } from "viem";

import { getContract } from "../../../sdk/src/configs/contracts";
import { accountBalance } from "./account";
import { baseStableBalance } from "./bridge";
import type { FundedCase } from "./catalog";
import { stakedGmx } from "./earn";
import {
  checkFeeBudget,
  dollars,
  economy,
  feePolicy,
  rebalanceTarget,
  startingReserves,
  USD,
  type FeeProfile,
} from "./economy";
import { fundedErrorMessage } from "./errors";
import { checkGasPrice } from "./gasGuard";
import { readJournal } from "./journal";
import { liquidityRequestKeys, lpBalance, planLiquidity } from "./liquidity";
import type { FundedSession } from "./session";
import { validateFundedTarget } from "./target";
import { quoteTrigger, quoteTwap } from "./trading";

export type ReadinessCheck = { scope: string; check: string; ok: boolean; detail: string };

// Reads and unsigned quotes only. Never creates a journal or changes wallet state.
export async function fundedReadiness(
  session: FundedSession,
  selected: readonly FundedCase[],
  profileFor: (scenario: FundedCase) => FeeProfile = () => "economy"
) {
  const checks: ReadinessCheck[] = [];
  const check = async (scope: string, name: string, read: () => Promise<string | void>) => {
    try {
      checks.push({ scope, check: name, ok: true, detail: (await read()) || "Available" });
    } catch (error) {
      checks.push({ scope, check: name, ok: false, detail: fundedErrorMessage(error) });
    }
  };
  await check("all", "deployment URL", async () => validateFundedTarget(process.env.REGRESSION_BASE_URL));
  await check("all", "previous run", async () => {
    const previous = await readJournal(session.directory);
    assert.ok(!previous || previous.completed, "Unfinished funded run; run funded:cleanup --execute before a new run");
  });
  await check("all", "Arbitrum gas", async () => {
    const gas = await checkGasPrice({
      chainId: 42161,
      rpcUrl: session.rpcUrl,
      reader: session.rpc,
      maxGasGwei: process.env.REGRESSION_MAX_GAS_GWEI || process.env.REGRESSION_ARBITRUM_MAX_GAS_GWEI,
    });
    assert.ok(gas.allowed, gas.reason);
  });
  let state: Awaited<ReturnType<FundedSession["snapshot"]>> | undefined;
  await check("all", "live wallet and oracle", async () => {
    state = await session.snapshot();
  });
  if (state) {
    const snapshot = state;
    await check("all", "empty inventory", async () => {
      assert.ok(
        !snapshot.positions.length &&
          !snapshot.orders.length &&
          !snapshot.onchainPositionCount &&
          !snapshot.onchainOrderCount &&
          snapshot.wrappedAmount === 0n,
        "Positions, orders or WETH remain; complete the previous cleanup first"
      );
    });
    await check("all", "50/50 allocation", async () => {
      const allocation = rebalanceTarget({
        ...snapshot,
        initialNativeUsd: snapshot.nativeUsd,
        initialStableUsd: snapshot.stableUsd,
        targetNativeBps: economy.targetNativeBps,
      });
      assert.equal(
        allocation.direction,
        "none",
        "ETH/USDC allocation is outside tolerance; complete cleanup or prepare 50/50 before a new run"
      );
    });
    for (const scenario of selected) {
      const policy = feePolicy(profileFor(scenario));
      await check(scenario.id, "reserves", async () => {
        const reserves = startingReserves({
          ...snapshot,
          collateralUsd: economy.collateralLimitUsd,
          profile: profileFor(scenario),
        });
        assert.ok(
          reserves.sufficient,
          `Insufficient starting reserves: USDC short $${dollars(reserves.shortfallUsd.USDC)}, ETH short $${dollars(reserves.shortfallUsd.ETH)}`
        );
      });
      await check(scenario.id, "scenario prerequisites", async () => {
        const { id, group } = scenario;
        const opening = async (isLong: boolean, parts = 1) => {
          const quote = await session.quoteIncrease(snapshot, isLong, parts);
          checkFeeBudget(0n, quote.feeUsd + USD / 20n, false, policy);
          if (group === "trading")
            assert.ok(
              quote.collateralUsd + snapshot.market.minPositionSizeUsd / 2n + USD / 4n <= economy.collateralLimitUsd,
              "Increase/deposit would exceed the collateral cap"
            );
          return `Opening quote validated; fee reservation $${dollars(quote.feeUsd)}`;
        };
        if (id === "smoke-refresh" || group === "trading" || id === "tp-sl")
          return opening(id !== "market-short", group === "trading" ? 2 : 1);
        if (id === "twap") {
          const quote = await quoteTwap(session, snapshot);
          checkFeeBudget(0n, quote.feeUsd + USD / 20n, false, policy);
          return "Both TWAP parts and bounded classic calldata validated";
        }
        if (group === "orders" || id === "one-click") {
          const quote = await quoteTrigger(
            session,
            snapshot,
            !id.endsWith("short"),
            id.startsWith("stop") ? "stop-market" : "limit"
          );
          checkFeeBudget(0n, quote.feeUsd + USD / 20n, false, policy);
          return id === "one-click"
            ? "Limit quote validated; authorization is checked at activation"
            : "Trigger quote validated";
        }
        if (id === "swap") {
          const buy = await session.quoteSwap(snapshot, 1_000_000n, true, false);
          const sell = await session.quoteSwap(
            snapshot,
            (USD * 10n ** 18n) / snapshot.weth.prices.maxPrice,
            false,
            false
          );
          checkFeeBudget(0n, buy.feeUsd + USD / 20n, false, policy);
          checkFeeBudget(buy.feeUsd + USD / 20n, sell.feeUsd + USD / 20n, true, policy);
          return "Both pinned swap routes validated";
        }
        if (id === "account" || id === "bridge") {
          assert.equal(await accountBalance(session, snapshot.usdc.address), 0n, "Use an empty GMX Account");
          if (id === "account") return "GMX Account is empty";
          const [stable, native, gas] = await Promise.all([
            baseStableBalance(session),
            session.sourceRpc.getBalance({ address: session.address }),
            checkGasPrice({
              chainId: 8453,
              rpcUrl: session.sourceRpcUrl,
              reader: session.sourceRpc,
              maxGasGwei: process.env.REGRESSION_BASE_MAX_GAS_GWEI,
            }),
          ]);
          const missing: string[] = [];
          if (stable < 3_000_000n) missing.push("3 USDC on Base");
          if ((native * snapshot.weth.prices.minPrice) / 10n ** 18n < USD + policy.actionFeeLimitUsd)
            missing.push("at least $2 of ETH on Base ($1 reserve plus fees)");
          if (!gas.allowed) missing.push(`Base gas: ${gas.reason}`);
          assert.equal(missing.length, 0, `Bridge requires ${missing.join("; ")}`);
          const quote = await session.sdk.prepareCrossChainDeposit({
            srcChainId: 8453,
            account: session.address,
            tokenSymbol: "USDC",
            amount: 3_000_000n,
          });
          assert.ok(quote.composeGas > 0n && quote.composeGas <= 3_000_000n, "Unbounded bridge compose gas");
          return "Base funds, gas and deposit quote checked; return quote requires credited account funds";
        }
        if (id === "gm" || id === "glv") {
          const quote = await planLiquidity(session, id, policy);
          assert.ok(quote.withinKeeperBudget, "Liquidity keeper fees exceed the selected fee profile");
          assert.equal(await lpBalance(session, getAddress(quote.token)), 0n, "Existing LP tokens must not be swept");
          for (const withdrawal of [false, true])
            assert.deepEqual(
              await liquidityRequestKeys(session, id, withdrawal),
              [],
              "Existing liquidity requests must settle first"
            );
          return `Deposit/withdrawal keeper quotes $${quote.depositKeeperFeeUsd} / $${quote.withdrawalKeeperFeeUsd}`;
        }
        if (id === "staking") {
          const [balance, staked, tokens] = await Promise.all([
            session.rpc.readContract({
              abi: erc20Abi,
              address: getContract(42161, "GMX"),
              functionName: "balanceOf",
              args: [session.address],
            }),
            stakedGmx(session),
            session.sdk.fetchTokensData(),
          ]);
          assert.equal(staked, 0n, "Existing stakes must not be changed by regression");
          const price = tokens.find((t) => t.symbol === "GMX")?.prices.maxPrice;
          assert.ok(balance > 0n && price && price > 0n, "Staking requires an existing GMX balance and a valid price");
          return "Existing GMX can fund a stake capped at $1";
        }
        if (id === "claims") {
          const rewards = await Promise.all(
            ["FeeGmxTracker", "FeeGlpTracker"].map((name) =>
              session.rpc.readContract({
                address: getContract(42161, name as "FeeGmxTracker" | "FeeGlpTracker"),
                abi: parseAbi(["function claimable(address) view returns (uint256)"]),
                functionName: "claimable",
                args: [session.address],
              })
            )
          );
          const claimable = rewards.reduce((a, b) => a + b, 0n);
          assert.ok(claimable > 0n, "No staking rewards to claim; staking during this run does not guarantee rewards");
          assert.ok((claimable * snapshot.weth.prices.maxPrice) / 10n ** 18n <= 2n * USD, "Claim exceeds the $2 limit");
          return "Existing claimable rewards are within the $2 cap";
        }
        throw new Error("No prerequisite check for selected funded case");
      });
    }
  }
  const ready = checks.every((c) => c.ok);
  return {
    ready,
    transactionsSubmitted: 0,
    checks,
    cases: selected.map((s) => ({
      id: s.id,
      status: checks.some((c) => !c.ok && (c.scope === "all" || c.scope === s.id))
        ? "blocked"
        : "prerequisites-checked",
    })),
    verification:
      "Read-only prerequisites and unsigned quotes; not proof of transaction settlement. Quotes, gas and balances are checked again during execution.",
  };
}

export function requireFundedReadiness(report: Awaited<ReturnType<typeof fundedReadiness>>) {
  if (!report.ready)
    throw new Error(
      `Funded preflight blocked before spending: ${report.checks
        .filter((c) => !c.ok)
        .map((c) => `${c.scope}: ${c.detail}`)
        .join("; ")}`
    );
}
