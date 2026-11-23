import { t } from "@lingui/macro";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { PropsWithChildren } from "react";

import { NOTIFICATIONS_CHAIN_ID } from "config/notifications";
import {
  getIsInvalidSignatureError,
  getIsRegistrationLimitError,
  readStoredNotificationsDevice,
  registerThisDevice,
  type StoredNotificationsDevice,
  writeStoredNotificationsDevice,
} from "domain/notifications/deviceRegistration";
import {
  type NotificationsTurnOnResult,
  sendNotificationsDailyStateEvent,
  sendNotificationsTurnOffEvent,
  sendNotificationsTurnOnResultEvent,
} from "domain/notifications/notificationsAnalytics";
import {
  NotificationsApiError,
  sendTestNotification,
  unregisterNotificationsDevice,
} from "domain/notifications/notificationsApi";
import {
  getExistingPushSubscription,
  getNotificationPermission,
  getNotificationsSupport,
  type NotificationsSupport,
} from "domain/notifications/pushSubscription";
import { helperToast } from "lib/helperToast";
import { signMessage } from "lib/wallets/signing";
import { useIsWalletInitializing } from "lib/wallets/useIsWalletInitializing";
import useWallet from "lib/wallets/useWallet";

/** The states of this device in DES-86, plus the progress and the device-limit states. */
export type NotificationsStatus =
  | "unsupported"
  | "iosNotInstalled"
  | "blocked"
  | "noWallet"
  | "notAsked"
  | "off"
  | "turningOn"
  | "turningOff"
  | "on"
  | "turnOnFailed"
  | "limitReached"
  | "walletSwitchFailed";

export type NotificationsTestState = "sending" | "sent" | "cooldown" | "notRegistered" | "failed";

type Operation = "turningOn" | "turningOff";

// `retry` is a wallet switch the user tries again from the tab, so it shows no toast. `resubscribe` replaces the
// subscription the browser dropped on blocking, so when it fails no wallet gets notifications and it shows as a failed
// turn-on.
type RegistrationKind = "turnOn" | "open" | "walletSwitch" | "retry" | "resubscribe";

type Issue =
  | { type: "turnOnFailed"; error: string }
  | { type: "limitReached"; account: string; error?: string }
  | { type: "walletSwitchFailed"; account: string; error: string }
  // The device may still be registered, so it stays on; the debug controls show the error.
  | { type: "syncFailed"; error: string };

export type NotificationsContextValue = {
  status: NotificationsStatus;
  /** The user turned notifications on for this device and has not turned them off. */
  isTurnedOn: boolean;
  /** The wallet that gets notifications on this device, also with no wallet connected. */
  receivingAccount: string | undefined;
  /** The wallet notifications did not move to, or that needs a signature to add this device. */
  pendingAccount: string | undefined;
  error: string | undefined;
  testState: NotificationsTestState | undefined;
  turnOn: () => void;
  turnOff: () => void;
  /** Also asks the connected wallet for a signature at the device limit. */
  retry: () => void;
  sendTest: () => void;
};

const noop = () => undefined;

const NotificationsContext = createContext<NotificationsContextValue>({
  status: "unsupported",
  isTurnedOn: false,
  receivingAccount: undefined,
  pendingAccount: undefined,
  error: undefined,
  testState: undefined,
  turnOn: noop,
  turnOff: noop,
  retry: noop,
  sendTest: noop,
});

export function useNotificationsContext() {
  return useContext(NotificationsContext);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

// A new wallet that needs a signature at the device limit is a failed switch too: the previous wallet keeps receiving.
function getIsFailedWalletSwitch(issue: Issue | undefined, stored: StoredNotificationsDevice) {
  return (
    issue?.type === "walletSwitchFailed" ||
    (issue?.type === "limitReached" && stored.enabled && issue.account !== stored.account)
  );
}

function useNotificationPermission(isSupported: boolean) {
  const [permission, setPermission] = useState(getNotificationPermission);

  useEffect(() => {
    if (!isSupported) {
      return;
    }

    const update = () => setPermission(getNotificationPermission());
    let permissionStatus: PermissionStatus | undefined;
    let isUnmounted = false;

    // Users change the permission in browser settings, outside the app.
    document.addEventListener("visibilitychange", update);
    navigator.permissions
      ?.query({ name: "notifications" })
      .then((status) => {
        if (!isUnmounted) {
          permissionStatus = status;
          status.onchange = update;
        }
      })
      .catch(noop);

    return () => {
      isUnmounted = true;
      document.removeEventListener("visibilitychange", update);
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, [isSupported]);

  return [permission, setPermission] as const;
}

function getStatus({
  support,
  operation,
  permission,
  issue,
  stored,
  account,
}: {
  support: NotificationsSupport;
  operation: Operation | undefined;
  permission: NotificationPermission;
  issue: Issue | undefined;
  stored: StoredNotificationsDevice;
  account: string | undefined;
}): NotificationsStatus {
  if (support !== "supported") {
    return support;
  }

  if (operation) {
    return operation;
  }

  if (permission === "denied") {
    return "blocked";
  }

  // An enabled device whose permission was reset gets nothing until it is turned on again.
  const isOn = stored.enabled && permission === "granted";

  if (isOn && getIsFailedWalletSwitch(issue, stored)) {
    return "walletSwitchFailed";
  }

  if (issue?.type === "limitReached" || issue?.type === "turnOnFailed") {
    return issue.type;
  }

  if (isOn) {
    return "on";
  }

  if (!account && !stored.account) {
    return "noWallet";
  }

  return permission === "default" ? "notAsked" : "off";
}

export function NotificationsContextProvider({ children }: PropsWithChildren) {
  const support = useMemo(getNotificationsSupport, []);
  const [permission, setPermission] = useNotificationPermission(support === "supported");
  const { account, signer } = useWallet();
  const isWalletInitializing = useIsWalletInitializing();

  const [stored, setStored] = useState(readStoredNotificationsDevice);
  const [operation, setOperation] = useState<Operation>();
  // Set in the same tick as the click, so a second click before the next render starts nothing.
  const operationRef = useRef<Operation>();
  const [issue, setIssue] = useState<Issue>();
  const [testState, setTestState] = useState<NotificationsTestState>();

  // Operations run one at a time and read the latest state, so a slow request for an earlier wallet cannot land last.
  const storedRef = useRef(stored);
  const accountRef = useRef(account);
  accountRef.current = account;
  const queueRef = useRef(Promise.resolve());

  const enqueue = useCallback((operation: () => Promise<unknown>) => {
    queueRef.current = queueRef.current.then(operation).then(noop, noop);
  }, []);

  const updateStored = useCallback((update: Partial<StoredNotificationsDevice>) => {
    const next = { ...storedRef.current, ...update };
    storedRef.current = next;
    writeStoredNotificationsDevice(next);
    setStored(next);
  }, []);

  const register = useCallback(
    async (
      targetAccount: string,
      kind: RegistrationKind,
      sign?: (message: string) => Promise<string>
    ): Promise<NotificationsTurnOnResult | undefined> => {
      let isSigning = false;

      // A newer wallet switch already replaced this one.
      if ((kind === "walletSwitch" || kind === "retry") && accountRef.current && accountRef.current !== targetAccount) {
        return undefined;
      }

      try {
        const { endpoint } = await registerThisDevice({
          account: targetAccount,
          stored: storedRef.current,
          sign:
            sign &&
            (async (message) => {
              isSigning = true;
              const signature = await sign(message);
              isSigning = false;
              return signature;
            }),
          onSigned: (signature) => updateStored({ signature }),
        });
        updateStored({ enabled: true, account: targetAccount, endpoint });
        setIssue(undefined);

        if (kind === "turnOn") {
          // The confirmation. A refused test, e.g. within the API's one-minute limit, does not undo turning on.
          sendTestNotification(endpoint).catch(noop);
        }

        return "on";
      } catch (error) {
        const message = getErrorMessage(error);

        if (kind === "walletSwitch") {
          helperToast.error(t`Notifications didn't move to your new wallet`);
        }

        if (getIsInvalidSignatureError(error)) {
          updateStored({ signature: undefined });
        }

        if (getIsRegistrationLimitError(error) || getIsInvalidSignatureError(error)) {
          setIssue({
            type: "limitReached",
            account: targetAccount,
            error: getIsInvalidSignatureError(error) ? message : undefined,
          });
        } else if (isSigning) {
          // The wallet did not sign.
          setIssue({ type: "limitReached", account: targetAccount, error: message });
        } else if (kind === "walletSwitch" || kind === "retry") {
          setIssue({ type: "walletSwitchFailed", account: targetAccount, error: message });
        } else if (kind === "open") {
          setIssue({ type: "syncFailed", error: message });
        } else {
          setIssue({ type: "turnOnFailed", error: message });
        }

        if (isSigning) {
          return "signatureRefused";
        }

        return getIsRegistrationLimitError(error) && !sign ? "limitNoWallet" : "failed";
      }
    },
    [updateStored]
  );

  const unregisterLeftEndpoint = useCallback(
    async (endpoint: string) => {
      try {
        await unregisterNotificationsDevice(endpoint);
      } catch (error) {
        // Kept for the next app open unless the API will never take it.
        if (!(error instanceof NotificationsApiError && error.status === 400)) {
          return;
        }
      }

      if (storedRef.current.unregisterEndpoint === endpoint) {
        updateStored({ unregisterEndpoint: undefined });
      }
    },
    [updateStored]
  );

  const runOperation = useCallback(
    (nextOperation: Operation, run: () => Promise<unknown>) => {
      operationRef.current = nextOperation;
      setOperation(nextOperation);
      setIssue(undefined);
      enqueue(async () => {
        try {
          await run();
        } finally {
          operationRef.current = undefined;
          setOperation(undefined);
        }
      });
    },
    [enqueue]
  );

  // Only a click of the user may open a signature request, and only the wallet that gets notifications can sign.
  const getSign = useCallback(
    (targetAccount: string) =>
      signer && account === targetAccount
        ? (message: string) => signMessage({ signer, message, verificationChainId: NOTIFICATIONS_CHAIN_ID })
        : undefined,
    [account, signer]
  );

  const startTurnOn = useCallback(
    (isRetry: boolean) => {
      const targetAccount = account ?? storedRef.current.account;

      if (support !== "supported" || operationRef.current || !targetAccount) {
        return;
      }

      // Asked straight from the click: Safari ignores a permission request made after an await.
      const permissionRequest =
        getNotificationPermission() === "default" ? Promise.resolve(Notification.requestPermission()) : undefined;

      runOperation("turningOn", async () => {
        await permissionRequest?.catch(noop);
        const nextPermission = getNotificationPermission();
        setPermission(nextPermission);

        let result: NotificationsTurnOnResult | undefined;
        if (nextPermission === "granted") {
          result = await register(targetAccount, "turnOn", getSign(targetAccount));
        } else {
          // A closed prompt leaves the permission at "default".
          result = nextPermission === "denied" ? "permissionRefused" : "promptClosed";
        }

        if (result) {
          sendNotificationsTurnOnResultEvent(result, isRetry);
        }
      });
    },
    [account, getSign, register, runOperation, setPermission, support]
  );

  const turnOn = useCallback(() => startTurnOn(false), [startTurnOn]);

  const retry = useCallback(() => {
    if (operationRef.current) {
      return;
    }

    // Without a wallet the tab asks to connect one; turning on again would only re-add the previous wallet.
    if (getIsFailedWalletSwitch(issue, storedRef.current)) {
      if (account) {
        runOperation("turningOn", () => register(account, "retry", getSign(account)));
      }
      return;
    }

    const storedAccount = storedRef.current.account;
    if (issue?.type === "syncFailed" && storedAccount) {
      const targetAccount = account ?? storedAccount;
      runOperation("turningOn", () => register(targetAccount, "open", getSign(targetAccount)));
      return;
    }

    startTurnOn(true);
  }, [account, getSign, issue, register, runOperation, startTurnOn]);

  const turnOff = useCallback(() => {
    if (operationRef.current) {
      return;
    }

    sendNotificationsTurnOffEvent();
    runOperation("turningOff", async () => {
      const { endpoint, unregisterEndpoint } = storedRef.current;
      const endpointToUnregister = endpoint ?? unregisterEndpoint;
      updateStored({
        enabled: false,
        endpoint: undefined,
        unregisterEndpoint: endpointToUnregister,
        signature: undefined,
      });

      // Without its browser subscription the device gets nothing, even while the API still has the endpoint.
      const subscription = await getExistingPushSubscription().catch(() => null);
      await subscription?.unsubscribe().catch(noop);

      if (endpointToUnregister) {
        await unregisterLeftEndpoint(endpointToUnregister);
      }
    });
  }, [runOperation, unregisterLeftEndpoint, updateStored]);

  const sendTest = useCallback(() => {
    const { endpoint } = storedRef.current;

    if (!endpoint || testState === "sending") {
      return;
    }

    setTestState("sending");
    sendTestNotification(endpoint)
      .then(() => setTestState("sent"))
      .catch((error) => {
        const status = error instanceof NotificationsApiError ? error.status : undefined;

        if (status === 429) {
          setTestState("cooldown");
        } else if (status === 404 || status === 410 || status === 422) {
          setTestState("notRegistered");
        } else {
          setTestState("failed");
        }
      });
  }, [testState]);

  const hasSyncedOnOpenRef = useRef(false);

  useEffect(
    function syncDevice() {
      if (support !== "supported" || isWalletInitializing) {
        return;
      }

      const current = storedRef.current;
      // A device that never turned on sends nothing to the API.
      const canRegister = current.enabled && getNotificationPermission() === "granted";

      if (!hasSyncedOnOpenRef.current) {
        hasSyncedOnOpenRef.current = true;

        const { unregisterEndpoint } = current;
        if (unregisterEndpoint && unregisterEndpoint !== current.endpoint) {
          enqueue(() => unregisterLeftEndpoint(unregisterEndpoint));
        }

        // Also brings back a subscription the browser dropped, e.g. while the service worker was switched off.
        const targetAccount = account ?? current.account;
        if (canRegister && targetAccount) {
          enqueue(() => register(targetAccount, targetAccount === current.account ? "open" : "walletSwitch"));
        }
        return;
      }

      // A disconnect keeps the last wallet, and a device that is off stays off.
      if (canRegister && account && account !== current.account) {
        enqueue(() => register(account, "walletSwitch"));
      } else if (account && account === current.account) {
        // Back on the wallet that gets notifications: a failed move to another one no longer matters.
        setIssue((prev) =>
          (prev?.type === "walletSwitchFailed" || prev?.type === "limitReached") && prev.account !== account
            ? undefined
            : prev
        );
      }
    },
    [account, enqueue, isWalletInitializing, register, support, unregisterLeftEndpoint]
  );

  const previousPermissionRef = useRef(permission);

  useEffect(
    function resubscribeWhenAllowedAgain() {
      const previousPermission = previousPermissionRef.current;
      previousPermissionRef.current = permission;

      // Browsers drop the push subscription when notifications get blocked, and allowing them again doesn't bring it
      // back. A turn-on and the first sync after app open register by themselves.
      if (
        permission !== "granted" ||
        previousPermission === "granted" ||
        operationRef.current ||
        !hasSyncedOnOpenRef.current
      ) {
        return;
      }

      const current = storedRef.current;
      const targetAccount = accountRef.current ?? current.account;
      if (current.enabled && targetAccount) {
        enqueue(() => register(targetAccount, "resubscribe"));
      }
    },
    [enqueue, permission, register]
  );

  const value = useMemo((): NotificationsContextValue => {
    const status = getStatus({ support, operation, permission, issue, stored, account });

    return {
      status,
      isTurnedOn: stored.enabled,
      receivingAccount: stored.account,
      pendingAccount:
        issue?.type === "walletSwitchFailed" || issue?.type === "limitReached" ? issue.account : undefined,
      error: issue && "error" in issue ? issue.error : undefined,
      testState,
      turnOn,
      turnOff,
      retry,
      sendTest,
    };
  }, [account, issue, operation, permission, retry, sendTest, stored, support, testState, turnOff, turnOn]);

  const hasSentDailyStateRef = useRef(false);

  useEffect(
    function sendDailyState() {
      // Before the wallet is known, a device with a wallet would show as having none.
      if (isWalletInitializing || hasSentDailyStateRef.current) {
        return;
      }

      hasSentDailyStateRef.current = true;
      sendNotificationsDailyStateEvent(value.status);
    },
    [isWalletInitializing, value.status]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
