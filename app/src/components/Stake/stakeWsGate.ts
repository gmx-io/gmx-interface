export interface StakeWsGateStatus {
  isConnected: boolean;
}

type StakeWsGateListener = (status: StakeWsGateStatus) => void;

const stakeWsGateStatus: StakeWsGateStatus = {
  isConnected: false,
};

const listeners: StakeWsGateListener[] = [];

export function getStakeWsGateStatus() {
  return { ...stakeWsGateStatus };
}

export function subscribeToStakeWsGate(listener: StakeWsGateListener) {
  listeners.push(listener);

  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
}

export function setStakeWsGateConnected(isConnected: boolean) {
  if (stakeWsGateStatus.isConnected === isConnected) return;

  stakeWsGateStatus.isConnected = isConnected;
  const nextStatus = getStakeWsGateStatus();
  listeners.forEach((listener) => listener(nextStatus));
}
