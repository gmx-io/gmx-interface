import assert from "node:assert/strict";
import { test } from "node:test";
import { getContract } from "../../../sdk/src/configs/contracts";
import { address } from "./fundedQuote";
import { USD } from "./economy";
import type { FundedAction } from "./journal";
import { submitUiRelay, reconcileUiRelay } from "./uiRelay";
import type { FundedSession } from "./session";

const url = "https://arbitrum.gmxapi.io/v1/relay/submit";
const payload = { to: getContract(42161, "SubaccountGelatoRelayRouter"), data: "0x1234" as const };
function fixture() {
  const actions: FundedAction[] = [];
  const events: string[] = [];
  const session = {
    address,
    active: { actions },
    previousAction: async () => {
      const action = actions[0];
      if (action && action.state !== "settled") await reconcileUiRelay(session as unknown as FundedSession, action);
      return action;
    },
    gate: async () => {
      events.push("gate");
    },
    save: async () => {
      events.push("saved");
    },
  };
  return { session: session as unknown as FundedSession, actions, events };
}

const response = (ok: boolean, body: unknown) => ({ ok: () => ok, json: async () => body });

test("relay writes are journaled before HTTP and an uncertain response is never resubmitted", async () => {
  const { session, events, actions } = fixture();
  let submissions = 0;
  const send = async () => {
    submissions++;
    assert.deepEqual(events, ["gate", "saved"]);
    assert.equal(actions[0].state, "pending");
    assert.ok(actions[0].uiRelay?.calldataHash);
    throw new Error("lost response");
  };
  await assert.rejects(
    submitUiRelay(session, url, payload, "ui:create", false, USD / 2n, "one-click:create", send),
    /lost response/
  );
  await assert.rejects(
    submitUiRelay(session, url, payload, "ui:create", false, USD / 2n, "one-click:create", send),
    /uncertain outcome/
  );
  assert.equal(submissions, 1);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].feeUsd, (USD / 2n).toString());
});

test("the relay's own response is returned for the app after its task ID is saved", async () => {
  const { session, events, actions } = fixture();
  const real = response(true, { taskId: "real-task", status: "pending" });
  const result = await submitUiRelay(session, url, payload, "ui:create", false, USD, "one-click:create", async () => {
    events.push("sent");
    return real;
  });
  assert.equal(result.response, real);
  assert.equal(result.action, actions[0]);
  assert.equal(actions[0].uiRelay?.taskId, "real-task");
  assert.equal(actions[0].state, "pending");
  assert.deepEqual(events, ["gate", "saved", "sent", "saved"]);
});

test("a refused or malformed relay response is rejected and left unresolved", async () => {
  for (const [ok, body] of [
    [false, { taskId: "refused" }],
    [true, {}],
    [true, { taskId: "" }],
    [true, { taskId: 1 }],
  ] as const) {
    const { session, actions } = fixture();
    await assert.rejects(
      submitUiRelay(session, url, payload, "ui:create", false, USD, "one-click:create", async () => response(ok, body))
    );
    assert.equal(actions.length, 1);
    assert.equal(actions[0].state, "pending");
    assert.equal(actions[0].uiRelay?.taskId, undefined);
  }
});

test("relay does not write when the gas or fee gate fails", async () => {
  const { session, actions } = fixture();
  session.gate = async () => {
    throw new Error("gas ceiling");
  };
  let sent = false;
  await assert.rejects(
    submitUiRelay(session, url, payload, "ui:create", false, USD, "one-click:create", async () => {
      sent = true;
      throw new Error("Unexpected network write");
    }),
    /gas ceiling/
  );
  assert.equal(sent, false);
  assert.equal(actions.length, 0);
});

test("confirmed relay failure is saved so recovery can continue without repeating the failed operation", async (context) => {
  const t = context as unknown as { after: (run: () => void) => void };
  const { session, actions } = fixture();
  const action: FundedAction = {
    id: "failed",
    purpose: "ui:create",
    feeUsd: "1",
    state: "pending",
    uiRelay: { apiUrl: "https://arbitrum.gmxapi.io", to: payload.to, calldataHash: "hash", taskId: "failed-task" },
  };
  actions.push(action);
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = async (request) => {
    assert.ok(String(request).endsWith("/v1/relay/status"));
    return new Response(JSON.stringify({ taskId: "failed-task", status: "reverted" }), { status: 200 });
  };
  await assert.rejects(reconcileUiRelay(session, action), /must not be resubmitted/);
  assert.equal(action.state, "failed");
  assert.ok(action.failureReason && action.finishedAt);
});

test("a successful relay needs independent transaction receipt evidence", async (context) => {
  const t = context as unknown as { after: (run: () => void) => void };
  const { session, actions } = fixture();
  const hash = `0x${"14".repeat(32)}` as const;
  const action: FundedAction = {
    id: "success",
    purpose: "ui:create",
    feeUsd: "1",
    state: "pending",
    uiRelay: { apiUrl: "https://arbitrum.gmxapi.io", to: payload.to, calldataHash: "hash", taskId: "done-task" },
  };
  actions.push(action);
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ taskId: "done-task", status: "executed", txHash: hash }), { status: 200 });
  let receiptChecked = false;
  Object.assign(session, {
    rpc: {
      waitForTransactionReceipt: async (args: { hash: string }) => {
        assert.equal(args.hash, hash);
        receiptChecked = true;
        return { status: "success", logs: [] };
      },
    },
  });
  await reconcileUiRelay(session, action);
  assert.equal(receiptChecked, true);
  assert.equal(action.state, "settled");
  assert.equal(action.txHash, hash);
  assert.equal(action.gasPaidUsd, undefined);
});
