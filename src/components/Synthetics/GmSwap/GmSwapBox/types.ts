export enum Operation {
  Deposit = "Deposit",
  Withdrawal = "Withdrawal",
  Shift = "Shift",
}

export enum Mode {
  Single = "Single",
  Pair = "Pair",
}

export function isOperation(operation: string): operation is Operation {
  return Object.values(Operation).includes(operation as Operation);
}

export function isMode(mode: string): mode is Mode {
  return Object.values(Mode).includes(mode as Mode);
}
