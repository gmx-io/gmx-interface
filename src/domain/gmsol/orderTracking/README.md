# Solana order outcome evidence

The decoder accepts the Anchor CPI event envelope and IDL at
`c6778dc9bf6444f9037c3b0d2dc219c857e1b45d`. The four event discriminators
and all 15 referenced Borsh type layouts were also compared with the SDK
0.11.0-beta.1 source at `7fe4008292ffc09061f3a733ad9b5cd2e6235fa8`: they
are structurally identical after excluding IDL documentation. The latter IDL
SHA-256 is `fece132b79a631793ff86d9b2fd7ea29e31094a3afdcea9d72028f85b1838383`.
This source comparison does not establish the deployed program identity or
change the historical fixture provenance. The envelope, discriminator and Borsh layouts are
stored in `orderEventLayout.json`. Unknown/truncated events and failed
transaction metadata cannot supply successful execution evidence.

`getCreatedOrderActions` binds creation receipts to order addresses obtained
from the validated transaction, then takes the action id and context from the
matching `OrderUpdated(is_create)` event. A confirmed signature alone does not
identify a filled order. A receipt indexing delay must not turn a successful
send into a failed send.

`readOrderLifecycle` reads the history of this specific order through the
configured GMX RPC, collecting through the full creation slot and requiring its
creation signature as an anchor. It never enumerates a
wallet's orders. The read is bounded to 500 signatures and a 20-second deadline;
missing history or receipts remain unresolved. Same-slot observations require
transaction ordering from the block's signature list. `watchOrderLifecycle`
retries unresolved observations for up to five minutes and supports cancellation.
The notification consumer supports one primary market order per submission,
with optional attached triggers; it does not infer a whole batch's outcome from
one completed member. Limit/trigger creation does not wait for execution.

A matching trade may precede account closure. Conversely, account closure or a
`Completed` removal without the position trade is insufficient proof of a fill.
Cancellation states and reasons are independent from submission confirmation.
The lifecycle semantics follow protocol PR
https://github.com/gmsol-labs/gmx-solana/pull/492; unlike that Rust reader's
original scope, this decoder explicitly excludes failed transactions.

The committed fixtures preserve historical finalized mainnet receipts captured
on 2026-10-27 and their source/IDL hashes. Their metadata records that historical
binary-to-source identity is unproven and business acceptance was not evaluated.
They exercise the supported decoder contract, not current deployment acceptance.
Synthetic test mutations are state-machine edge cases, not additional observed
mainnet transactions. Verify deployment compatibility and live order/toast
behavior before release; offline tests do not authorize signing or broadcasting.

The sender reports confirmed `trackingRequests` without waiting for transaction
indexing. `watchSubmittedOrders` retries the creation receipt for up to one
minute to recover typed identities, then starts lifecycle tracking. This keeps
confirmation feedback independent from indexing and API refresh latency.

Shared order-entry consumers use
`useSolanaOrderNotifications().begin({ title, trackExecution })`, call
`submitted({ signatures, orders, trackingRequests })` at confirmation, and pass
caught submission errors to `failed(error)`. Known chain failures, wallet
rejections and ambiguous broadcasts are distinct. Notifications reuse the GMX
status and transaction-row components with explicit Solana explorer links.
Dismissing a toast, switching owner/network or unmounting the consumer cancels
its tracking. A tracking deadline leaves a visible unconfirmed outcome, never a
fabricated fill or failure. Live browser acceptance of newly submitted orders
remains separate from historical RPC replay and offline fixture verification.

## Shared entry integration

FESOL-20 owns the sender identity, immediate submission callback, lifecycle
tracking and notification contracts used here. The FESOL-19 TradeBox consumes
this implementation with `trackExecution: true` for market orders and `false`
for limit and TP/SL creation. Its current integrated delivery therefore includes
the FESOL-20 contract as a code prerequisite, alongside the FESOL-56 sender.
A submission-only consumer passes `false`: the notification completes on
submission and does not load or run the lifecycle watcher. Submission
confirmation and execution evidence remain separate in either mode.
