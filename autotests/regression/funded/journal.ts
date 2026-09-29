import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export type FundedAction = {
  id: string;
  purpose: string;
  feeUsd: string;
  requestId?: string;
  txHash?: `0x${string}`;
  orderKeys?: string[];
  state: "pending" | "created" | "settled" | "failed";
};

export type FundedJournal = {
  version: 1;
  id: string;
  chainId: 42161;
  address: string;
  createdAt: string;
  initialNativeUsd: string;
  initialStableUsd: string;
  marketAddress: string;
  ownedPositionKeys: string[];
  ownedOrderKeys: string[];
  actions: FundedAction[];
  completed: boolean;
};

// Outside Playwright output directories and shared by local workspaces.
export function walletDirectory(address: string, root = join(homedir(), ".local/state/gmx-regression")) {
  return join(root, `42161-${address}`);
}

export async function withWalletLock<T>(directory: string, use: () => Promise<T>): Promise<T> {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const lock = join(directory, "lock");
  const file = await open(lock, "wx", 0o600).catch(() => {
    throw new Error("Wallet is locked; another run or interrupted process must be resolved first");
  });
  try {
    await file.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
    await file.sync();
    return await use();
  } finally {
    await file.close();
    await rm(lock);
  }
}

export async function readJournal(directory: string): Promise<FundedJournal | undefined> {
  try {
    const value = JSON.parse(await readFile(join(directory, "active.json"), "utf8")) as FundedJournal;
    if (value.version !== 1 || value.chainId !== 42161 || !Array.isArray(value.actions)) {
      throw new Error("Invalid funded journal");
    }
    return value;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function writeJournal(directory: string, value: FundedJournal) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const temporary = join(directory, `${randomUUID()}.tmp`);
  const file = await open(temporary, "wx", 0o600);
  try {
    await file.writeFile(JSON.stringify(value, null, 2));
    await file.sync();
  } finally {
    await file.close();
  }
  await rename(temporary, join(directory, "active.json"));
  const folder = await open(directory, "r");
  try {
    await folder.sync();
  } finally {
    await folder.close();
  }
}

export function chargedFees(journal: FundedJournal) {
  // Reservations survive retries, failed receipts and uncertain submissions.
  return journal.actions.reduce((sum, action) => sum + BigInt(action.feeUsd), 0n);
}
