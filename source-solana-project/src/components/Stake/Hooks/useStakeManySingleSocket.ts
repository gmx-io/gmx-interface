import { useRef, useState, useCallback } from 'react';
import { wsClient } from '../wsClient';
import { print } from 'graphql';
import { gql } from "@apollo/client";
import { useWsLastUpdatedAtStore } from '@/zustand/wsLastUpdatedAtStore';

const CREATE_STAKE = gql`
  subscription CreateLpTokenStaking($params: LpTokenStakingParams!) {
    createLpTokenStaking(params: $params) {
      eventType
      sessionId
      owner
      amount
      lpTokenKind
      lpTokenMint
      status
      isCompleted
      isFailed
      createdAt
      transactions
      postTransactions
      stakeTransactions
      closeTransactions
    }
  }
`;

const COMPLETE_STAKE = gql`
  mutation completeLpTokenStaking($sessionId: String!, $signedPostTransactions: [[String!]!]!, $signedStakeTransactions: [[String!]!]!, $signedCloseTransactions: [[String!]!]!) {
    completeLpTokenStaking(
      sessionId: $sessionId
      signedPostTransactions: $signedPostTransactions
      signedStakeTransactions: $signedStakeTransactions
      signedCloseTransactions: $signedCloseTransactions
    ) {
      postResult {
        success
        signatures {
          signature
          slot
          error
        }
      }
      stakeResult {
        success
        signatures {
          signature
          slot
          error
        }
      }
      closeResult {
        success
        signatures {
          signature
          slot
          error
        }
      }
    }
  }
`;

export function useStakeManySingleSocket() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksComplete, setTasksComplete] = useState<any[]>([]);
  const [runningStatus, setRunningStatus] = useState<
    "idle" | "running" | "paused" | "completed" | "stopped"
  >("idle");

  const isPaused = useRef(false);
  const stopRequested = useRef(false);

  /**
   * stake socket
   */
  
  const stakeMany = useCallback(async (items: any[]) => {
    const MAX_CONCURRENCY = items.length;
    setRunningStatus("running");
    stopRequested.current = false;
    isPaused.current = false;

    setTasks([]);
    const results: any[] = [];
    let runningCount = 0;
    let currentIndex = 0;

    return new Promise((resolve) => {

      const runNext = () => {
        if (stopRequested.current) {
          setRunningStatus("stopped");
          return resolve(results);
        }

        if (isPaused.current) {
          setRunningStatus("paused");
          return;
        }

        if (currentIndex >= items.length && runningCount === 0) {
          setRunningStatus("completed");
          return resolve(results);
        }

        if (runningCount >= MAX_CONCURRENCY) return;

        if (currentIndex >= items.length) return;

        const p = items[currentIndex++];
        runningCount++;
        setRunningStatus("running");

        const execTask = new Promise((resolveTask) => {
          const unsubscribe = wsClient.subscribe(
            {
              query: print(CREATE_STAKE),
              variables: { params: p },
            },
            {
              next: (data) => {
                const e = data?.data?.createLpTokenStaking;
                if (!e) return;
                useWsLastUpdatedAtStore
                  .getState()
                  .setWsLastUpdatedAt('stake');
                // console.log('stake update:', useWsLastUpdatedAtStore.getState().stakeLastUpdatedAt)
                resolveTask(e);
                // unsubscribe();
              },
              error: (err) => {
                console.log('err', err)
                resolveTask({ error: err });
                unsubscribe();
              }
            }
          );
        });

        execTask.then((r) => {
          results.push(r);
          console.log('Current subscription status', results, MAX_CONCURRENCY)
          if (results.length === MAX_CONCURRENCY) {
            console.log('All the information has been received, and the results data is returned.', results);
            setTasks(results);
          }
        }).finally(() => {
          runningCount--;
          runNext();
        });

        runNext();
      };

      for (let i = 0; i < MAX_CONCURRENCY; i++) {
        runNext();
      }
    });

  }, []);
  
  const stakeComplete = useCallback(async (items: any[]) => {
    const MAX_CONCURRENCY = items.length;
    setRunningStatus("running");
    stopRequested.current = false;
    isPaused.current = false;
    setTasksComplete([]);

    const results: any[] = [];
    let runningCount = 0;
    let currentIndex = 0;

    return new Promise((resolve) => {

      const runNext = () => {
        if (stopRequested.current) {
          setRunningStatus("stopped");
          return resolve(results);
        }

        if (isPaused.current) {
          setRunningStatus("paused");
          return;
        }

        if (currentIndex >= items.length && runningCount === 0) {
          setRunningStatus("completed");
          return resolve(results);
        }

        if (runningCount >= MAX_CONCURRENCY) return;
        if (currentIndex >= items.length) return;

        const p = items[currentIndex++];
        runningCount++;
        setRunningStatus("running");

        const execTask = new Promise((resolveTask) => {
          const variables = {
            sessionId: p?.sessionId,
            signedPostTransactions: p?.signedPostTransactions,
            signedStakeTransactions: p?.signedStakeTransactions,
            signedCloseTransactions: p?.signedCloseTransactions
          };

          const unsubscribe = wsClient.subscribe(
            {
              query: print(COMPLETE_STAKE),
              variables,
            },
            {
              next: (data) => {
                console.log('data', data);
                const e = data?.data?.completeLpTokenStaking;
                if (!e) {
                  resolve([{ isError: true, error: 'Empty response from server', raw: data }]);
                  unsubscribe();
                  return;
                }
                useWsLastUpdatedAtStore
                  .getState()
                  .setWsLastUpdatedAt('stake');
                  // console.log('stake update:', useWsLastUpdatedAtStore.getState().stakeLastUpdatedAt)
                const { closeResult, postResult, stakeResult } = e || {};
                if (!closeResult?.success || !postResult?.success || !stakeResult?.success) {
                  resolveTask(e);
                  // unsubscribe();
                }
              },
              error: (err) => {
                resolveTask({ error: err });
                unsubscribe();
              },
            }
          );
        });

        execTask.then((r) => {
          results.push(r);
          // setTasksComplete(prev => [...prev, r]);
          if (results.length === MAX_CONCURRENCY) {
            setTasksComplete(results);
          }
        }).catch((error) => {
          console.log('error', error)
          // return new Error
        }).finally(() => {
          runningCount--;
          runNext();
        });

        runNext();
      };

      for (let i = 0; i < MAX_CONCURRENCY; i++) {
        runNext();
      }
    });

  }, []);

  const pause = () => {
    isPaused.current = true;
    setRunningStatus("paused");
  };

  const resume = () => {
    isPaused.current = false;
    setRunningStatus("running");
  };

  const stop = () => {
    stopRequested.current = true;
    setRunningStatus("stopped");
  };

  const reset = () => {
    setTasks([]);
    setTasksComplete([]);
    setRunningStatus("idle");
    stopRequested.current = false;
    isPaused.current = false;
  };

  return {
    tasks,
    tasksComplete,
    runningStatus,
    stakeMany,
    stakeComplete,
    pause,
    resume,
    stop,
    reset,
  };
}
