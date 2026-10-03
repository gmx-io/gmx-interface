import { withdrawAccount } from "./account";
import { withdrawBridge } from "./bridge";
import { unstake } from "./earn";
import { liquidityRequestKeys, withdrawLiquidity } from "./liquidity";
import type { FundedSession } from "./session";

export async function cleanupResources(session: FundedSession) {
  await session.revokeOneClick();
  if (session.active.actions.some((a) => a.purpose === "bridge-deposit" && a.state !== "failed"))
    await withdrawBridge(session);
  await withdrawAccount(session);
  await withdrawLiquidity(session, "gm", true);
  await withdrawLiquidity(session, "glv", true);
  await unstake(session);
  for (const kind of ["gm", "glv"] as const) {
    if (!session.active.inventory?.[`${kind}Token`]) continue;
    for (const withdrawal of [false, true]) {
      if ((await liquidityRequestKeys(session, kind, withdrawal)).length)
        throw new Error("Liquidity requests remain after cleanup; do not start another run");
    }
  }
}
