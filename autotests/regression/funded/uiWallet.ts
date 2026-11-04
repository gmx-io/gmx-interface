import assert from "node:assert/strict";
import { expect, type BrowserContext, type Locator } from "@playwright/test";
import { decodeFunctionData, encodeFunctionData, erc20Abi, getAddress, type Hex } from "viem";

import { installInjectedWallet, type WalletRequest } from "../fixtures/injectedWallet";
import { fundedErrorMessage } from "./errors";
import type { FundedAction } from "./journal";
import type { FundedSession } from "./session";
import { getContract } from "../../../sdk/src/configs/contracts";
import { GMX_SIMULATION_ORIGIN } from "../../../sdk/src/configs/dataStore";
import { assertRelayEndpoint, reconcileUiRelay, type UiRelayPayload } from "./uiRelay";
import type { UiTransaction } from "./uiOrderGuard";

export type UiActionPlan = {
  purpose: string;
  beforeClick?: () => Promise<void>;
  afterClick?: () => Promise<void>;
  cleanup?: boolean;
  chainId?: 42161 | 8453;
  sign?: (request: WalletRequest) => Promise<Hex>;
  inspectRelay?: (
    payload: UiRelayPayload,
    state: Awaited<ReturnType<FundedSession["snapshot"]>>
  ) => Promise<{ extraFeeUsd: bigint; uiOrder?: FundedAction["uiOrder"] }>;

  approval?: { token: string; spender: string; amount: bigint };
  preflight: (state: Awaited<ReturnType<FundedSession["snapshot"]>>) => void | Promise<void>;
  inspect: (
    tx: UiTransaction,
    state: Awaited<ReturnType<FundedSession["snapshot"]>>
  ) => { extraFeeUsd: bigint; uiOrder?: FundedAction["uiOrder"] };
};

type WalletResult = { kind: "approval" | "action"; action: FundedAction } | { error: string };
const readMethods = new Set([
  "eth_getBalance",
  "eth_getCode",
  "eth_call",
  "eth_blockNumber",
  "eth_getBlockByNumber",
  "eth_getBlockByHash",
  "eth_getTransactionReceipt",
  "eth_getTransactionByHash",
  "eth_getTransactionCount",
  "eth_estimateGas",
  "eth_gasPrice",
  "eth_maxPriorityFeePerGas",
  "eth_feeHistory",
]);

export class UiWallet {
  private plan?: UiActionPlan;
  readonly relaySimulations: UiTransaction[] = [];
  private handling = false;
  private results: WalletResult[] = [];
  private pending?: Promise<unknown>;
  private signaturePlan?: (request: WalletRequest) => Promise<Hex>;
  private signedCount = 0;
  private signatureError?: string;

  constructor(private readonly session: FundedSession) {}

  async install(context: BrowserContext, origin: string) {
    await this.protectRelay(context, origin);
    return installInjectedWallet(context, {
      address: this.session.address,
      chainId: 42161,
      allowedOrigin: new URL(origin).origin,
      request: (request, chainId) => this.request(request, chainId),
    });
  }

  observeRpcRequest(body: unknown) {
    for (const request of Array.isArray(body) ? body : [body]) {
      const tx = request?.params?.[0];
      if (!["eth_call", "eth_estimateGas"].includes(request?.method) || !tx?.to || !tx?.from || !tx?.data) continue;
      if (
        getAddress(tx.to) !== getAddress(getContract(42161, "MultichainTransferRouter")) ||
        getAddress(tx.from) !== getAddress(GMX_SIMULATION_ORIGIN)
      )
        continue;
      if (typeof tx.data !== "string" || tx.data.length > 128_000) continue;
      this.relaySimulations.push({ to: getAddress(tx.to), data: tx.data as Hex, value: BigInt(tx.value ?? 0) });
      if (this.relaySimulations.length > 20) this.relaySimulations.shift();
    }
  }

  async protectRelay(context: BrowserContext, origin: string) {
    await context.route("**/*", async (route) => {
      const request = route.request();
      if (
        request.method() === "POST" &&
        !request.frame().parentFrame() &&
        new URL(request.frame().url()).origin === new URL(origin).origin
      ) {
        try {
          this.observeRpcRequest(request.postDataJSON());
        } catch {
          /* Not an RPC simulation. */
        }
      }
      await route.fallback();
    });
    await context.route(/\/v1\/relay\/submit(?:\?|$)/, async (route) => {
      let acquired = false;
      let fulfilled = false;
      try {
        assertRelayEndpoint(route.request().url());
        const frame = route.request().frame();
        assert.equal(frame.parentFrame(), null);
        assert.equal(new URL(frame.url()).origin, new URL(origin).origin);
        assert.equal(route.request().method(), "POST");
        const plan = this.plan;
        assert.ok(plan?.inspectRelay, "No UI relay operation is authorized");
        assert.ok(!this.handling, "Concurrent relay submissions are prohibited");
        const payload = route.request().postDataJSON() as UiRelayPayload;
        assert.deepEqual(Object.keys(payload).sort(), ["data", "to"]);
        assert.ok(typeof payload.to === "string" && typeof payload.data === "string");
        this.handling = acquired = true;
        this.pending = (async () => {
          const state = await this.session.snapshot();
          await plan.preflight(state);
          const checked = await plan.inspectRelay!(payload, state);
          const { action, response } = await this.session.relayUiTransaction(
            route.request().url(),
            payload,
            `ui:${plan.purpose}`,
            !!plan.cleanup,
            checked.extraFeeUsd,
            () => route.fetch({ maxRedirects: 0, maxRetries: 0, timeout: 20_000 }),
            checked.uiOrder
          );
          assert.ok(action.uiRelay?.taskId, "UI relay action has no task ID");
          // A replayed step is not sent again; the app polls the recorded task instead.
          await route.fulfill(response ? { response } : { json: { taskId: action.uiRelay.taskId } });
          fulfilled = true;
          // Continue only after the harness verifies execution.
          if (action.state === "pending") await reconcileUiRelay(this.session, action);
          this.results.push({ kind: "action", action });
        })();
        await this.pending;
      } catch (error) {
        this.results.push({ error: fundedErrorMessage(error) });
        if (!fulfilled)
          await route
            .fulfill({ status: 400, json: { error: "Funded UI relay guard rejected the request" } })
            .catch(() => undefined);
      } finally {
        if (acquired) this.handling = false;
      }
    });
  }

  async authorize(button: Locator, inspectAndSign: (request: WalletRequest) => Promise<Hex>, count: number) {
    assert.ok(!this.plan && !this.signaturePlan && !this.handling);
    this.signaturePlan = inspectAndSign;
    this.signatureError = undefined;
    const initial = this.signedCount;
    try {
      await button.click();
      await expect
        .poll(
          () => {
            if (this.signatureError) throw new Error(this.signatureError);
            return this.signedCount - initial;
          },
          { timeout: 60_000 }
        )
        .toBe(count);
    } finally {
      if (this.pending) await this.pending.catch(() => undefined);
      this.signaturePlan = undefined;
    }
  }

  async submit(plan: UiActionPlan, button: Locator) {
    const previous = await this.session.previousAction(`ui:${plan.purpose}`);
    if (previous) return previous;
    assert.ok(!this.plan && !this.handling, "UI wallet already has an active operation");
    await plan.preflight(await this.session.snapshot());
    this.plan = plan;
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const index = this.results.length;
        await expect(button).toBeEnabled({ timeout: 45_000 });
        await plan.beforeClick?.();
        await button.click({ timeout: 45_000 });
        await plan.afterClick?.();
        await expect
          .poll(() => this.results.length, {
            timeout: 180_000,
            message: `No completed wallet request for ${plan.purpose}`,
          })
          .toBeGreaterThan(index);
        const result = this.results[index];
        if ("error" in result) throw new Error(result.error);
        if (result.kind === "action") return result.action;
        button = button.filter({ hasNotText: /Approve|Approving/ });
      }
      throw new Error("Unexpected additional approval request");
    } finally {
      // A browser timeout must not release the operation while its submission is still in flight.
      if (this.pending) await this.pending.catch(() => undefined);
      this.plan = undefined;
    }
  }

  async request(request: WalletRequest, chainId: number): Promise<unknown> {
    const index = this.results.length;
    try {
      return await this.handleRequest(request, chainId);
    } catch (error) {
      if (!readMethods.has(request.method) && this.results.length === index && (this.plan || this.signaturePlan)) {
        const message = fundedErrorMessage(error);
        this.signatureError = message;
        this.results.push({ error: message });
      }
      throw error;
    }
  }

  private async handleRequest(request: WalletRequest, chainId: number): Promise<unknown> {
    assert.ok(chainId === 42161 || chainId === 8453, "Unsupported UI wallet chain");
    if (readMethods.has(request.method)) {
      try {
        const rpc = chainId === 8453 ? this.session.sourceRpc : this.session.rpc;
        return await rpc.request(request as Parameters<typeof rpc.request>[0]);
      } catch {
        throw new Error("UI wallet read failed");
      }
    }
    if (request.method === "personal_sign" || request.method === "eth_signTypedData_v4") {
      const sign = this.signaturePlan ?? this.plan?.sign;
      assert.ok(sign && !this.handling, "Unexpected UI signature request");
      assert.equal(chainId, this.plan?.chainId ?? 42161, `Unexpected signing chain ${chainId}`);
      this.handling = true;
      this.pending = (async () => {
        try {
          const signature = await sign(request);
          this.signedCount++;
          return signature;
        } catch (error) {
          this.signatureError = fundedErrorMessage(error);
          this.results.push({ error: this.signatureError });
          throw new Error(this.signatureError);
        } finally {
          this.handling = false;
        }
      })();
      return this.pending;
    }
    if (request.method !== "eth_sendTransaction") throw new Error(`Unsupported UI wallet operation: ${request.method}`);
    assert.ok(this.plan, "No UI transaction has been authorized by the current test step");
    assert.ok(!this.handling, "Concurrent wallet submissions are prohibited");
    assert.equal(chainId, this.plan.chainId ?? 42161);
    this.handling = true;
    this.pending = this.send(request);
    return this.pending;
  }

  private async send(request: WalletRequest) {
    const plan = this.plan!;
    try {
      assert.equal(request.params?.length, 1);
      const raw = request.params[0] as Record<string, unknown>;
      assert.ok(raw && typeof raw.from === "string" && typeof raw.to === "string" && typeof raw.data === "string");
      assert.equal(getAddress(raw.from), getAddress(this.session.address));
      assert.ok(raw.chainId === undefined || BigInt(raw.chainId as string) === BigInt(plan.chainId ?? 42161));
      assert.match(raw.data, /^0x(?:[\da-fA-F]{2})+$/);
      const tx = {
        to: getAddress(raw.to),
        data: raw.data as Hex,
        value: raw.value === undefined ? 0n : BigInt(raw.value as string),
      };
      let approval: ReturnType<typeof decodeFunctionData<typeof erc20Abi>> | undefined;
      try {
        approval = decodeFunctionData({ abi: erc20Abi, data: tx.data });
      } catch {
        /* not an ERC-20 call */
      }
      if (approval?.functionName === "approve") {
        const permitted = plan.approval;
        assert.ok(permitted && permitted.amount > 0n, "Unexpected token approval");
        assert.equal(tx.to, getAddress(permitted.token));
        assert.equal(getAddress(approval.args[0]), getAddress(permitted.spender));
        assert.ok(approval.args[1] >= permitted.amount, "Approval is smaller than the planned action");
        assert.equal(tx.value, 0n);
        await plan.preflight(await this.session.snapshot());
        // Leave room for the main action before an approval can spend gas.
        await this.session.gate(this.session.feePolicy.actionFeeLimitUsd, !!plan.cleanup, plan.chainId ?? 42161);
        // Wallet-side spending cap: the UI's unlimited allowance is never signed.
        tx.data = encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [getAddress(permitted.spender), permitted.amount],
        });
        const action = await this.session.nativeTransaction(
          tx,
          `ui:${plan.purpose}:approve:${tx.to}:${permitted.spender}`,
          !!plan.cleanup,
          0n,
          plan.chainId ?? 42161
        );
        this.results.push({ kind: "approval", action });
        return action.txHash;
      }
      const state = await this.session.snapshot();
      await plan.preflight(state);
      const checked = plan.inspect(tx, state);
      const action = await this.session.nativeTransaction(
        tx,
        `ui:${plan.purpose}`,
        !!plan.cleanup,
        checked.extraFeeUsd,
        plan.chainId ?? 42161,
        checked.uiOrder
      );
      this.results.push({ kind: "action", action });
      return action.txHash;
    } catch (error) {
      const message = fundedErrorMessage(error);
      this.results.push({ error: message });
      throw new Error(message);
    } finally {
      this.handling = false;
    }
  }
}
