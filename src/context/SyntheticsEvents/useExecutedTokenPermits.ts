import { useEffect, useRef } from "react";

import { useTokenPermitsContext } from "context/TokenPermitsContext/TokenPermitsContextProvider";
import { sendTokenPermitMetric } from "lib/metrics/tokenPermitMetrics";
import { StatusCode } from "sdk/utils/express";

import type { PendingExpressTxnParams, RelayTaskStatus } from "./types";

/**
 * Relay success is the one signal shared by every order batch (create, update, cancel), so permits are
 * counted as executed and forgotten here, once per relay task.
 */
export function useExecutedTokenPermits({
  chainId,
  pendingExpressTxns,
  relayTaskStatuses,
}: {
  chainId: number;
  pendingExpressTxns: { [key: string]: Partial<PendingExpressTxnParams> };
  relayTaskStatuses: { [taskId: string]: RelayTaskStatus };
}) {
  const { removeTokenPermits, accountType } = useTokenPermitsContext();
  // the chain and account type a task was sent with, in case the user switches before the relay answers
  const taskContextsRef = useRef(new Map<string, { chainId: number; accountType: typeof accountType }>());
  const handledTaskIdsRef = useRef(new Set<string>());

  useEffect(
    function handleExecutedTokenPermits() {
      Object.values(pendingExpressTxns).forEach(({ taskId, tokenPermits }) => {
        if (!taskId || !tokenPermits?.length || handledTaskIdsRef.current.has(taskId)) {
          return;
        }

        if (!taskContextsRef.current.has(taskId)) {
          taskContextsRef.current.set(taskId, { chainId, accountType });
        }

        const status = relayTaskStatuses[taskId]?.statusCode;

        if (status === undefined) {
          return;
        }

        handledTaskIdsRef.current.add(taskId);
        const taskContext = taskContextsRef.current.get(taskId)!;
        taskContextsRef.current.delete(taskId);

        if (status !== StatusCode.Success) {
          return;
        }

        removeTokenPermits(tokenPermits);
        tokenPermits.forEach((permit) => {
          sendTokenPermitMetric({
            outcome: "executed",
            chainId: taskContext.chainId,
            tokenAddress: permit.token,
            accountType: taskContext.accountType,
          });
        });
      });
    },
    [accountType, chainId, pendingExpressTxns, relayTaskStatuses, removeTokenPermits]
  );
}
