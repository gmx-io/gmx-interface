import { getBestNonce } from "../contracts/utils";

// Mocks for Wallet providers
class MockWallet {
  nonce: number;
  success: boolean;
  timeout: number;

  constructor(nonce, success = true, timeout = 0) {
    this.nonce = nonce;
    this.success = success;
    this.timeout = timeout;
  }

  getNonce() {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (this.success) {
          resolve(this.nonce);
        } else {
          reject(new Error("Failed to get nonce"));
        }
      }, this.timeout);
    });
  }
}

describe("getBestNonce", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, "error").mockImplementation(jest.fn());
  });

  test("Case 1", async () => {
    const providers: any[] = [new MockWallet(1, true, 100), new MockWallet(2, true, 200), new MockWallet(3, true, 300)];
    const res = getBestNonce(providers);
    jest.advanceTimersByTime(400);
    expect(res).resolves.toBe(3);
  });

  test("Case 2", async () => {
    const providers: any[] = [
      new MockWallet(1, true, 100),
      new MockWallet(2, true, 200),
      new MockWallet(3, false, 300),
    ];
    const res = getBestNonce(providers);
    jest.advanceTimersByTime(400);
    expect(res).resolves.toBe(2);
  });

  test("Case 3", async () => {
    const providers: any[] = [
      new MockWallet(1, false, 100),
      new MockWallet(2, true, 200),
      new MockWallet(3, false, 300),
    ];
    const res = getBestNonce(providers);
    jest.advanceTimersByTime(400);
    expect(res).resolves.toBe(2);
  });

  test("Case 4", async () => {
    const providers: any[] = [
      new MockWallet(1, false, 100),
      new MockWallet(2, false, 200),
      new MockWallet(3, false, 300),
    ];
    const res = getBestNonce(providers);
    jest.advanceTimersByTime(400);
    res.catch((error) => {
      expect(error).toBeDefined();
    });
  });

  test("Case 5", async () => {
    const providers: any[] = [
      new MockWallet(1, true, 100),
      new MockWallet(2, true, 200),
      new MockWallet(3, true, 1300),
    ];
    const res = getBestNonce(providers);
    jest.advanceTimersByTime(300);
    await waitOneTick();
    jest.advanceTimersByTime(1200);
    expect(res).resolves.toBe(2);
  });

  test("Case 6", async () => {
    const providers: any[] = [
      new MockWallet(1, true, 100),
      new MockWallet(2, false, 900),
      new MockWallet(3, true, 1000),
    ];
    const res = getBestNonce(providers);
    jest.advanceTimersByTime(1100);
    expect(res).resolves.toBe(3);
  });

  test("Case 7", async () => {
    const providers: any[] = [
      new MockWallet(1, true, 100),
      new MockWallet(2, false, 900),
      new MockWallet(3, false, 1000),
    ];
    const res = getBestNonce(providers);
    jest.advanceTimersByTime(1100);
    expect(res).resolves.toBe(1);
  });

  test("Case 8", async () => {
    const providers: any[] = [
      new MockWallet(1, false, 100),
      new MockWallet(2, false, 200),
      new MockWallet(3, true, 4800),
    ];
    const res = getBestNonce(providers);
    jest.advanceTimersByTime(4900);
    expect(res).resolves.toBe(3);
  });

  test("Case 9", async () => {
    const providers: any[] = [
      new MockWallet(1, true, 100),
      new MockWallet(2, false, 300),
      new MockWallet(3, true, 1300),
    ];
    const res = getBestNonce(providers);
    jest.advanceTimersByTime(200);
    await waitOneTick();
    jest.advanceTimersByTime(1200);
    expect(res).resolves.toBe(1);
  });

  test("Case 10", async () => {
    const providers: any[] = [
      new MockWallet(1, true, 4000),
      new MockWallet(2, true, 5800),
      new MockWallet(3, true, 6700),
    ];
    const res = getBestNonce(providers);
    jest.advanceTimersByTime(4100);
    await waitOneTick();
    jest.advanceTimersByTime(6800);
    await await expect(res).resolves.toBe(1);
  });

  test("Case 11", async () => {
    const providers: any[] = [
      new MockWallet(1, true, 4900),
      new MockWallet(2, true, 6100),
      new MockWallet(3, true, 6200),
    ];
    const res = getBestNonce(providers);
    jest.advanceTimersByTime(4950);
    await waitOneTick();
    jest.advanceTimersByTime(6000);
    expect(res).resolves.toBe(1);
  });

  test("Case 12", async () => {
    const providers: any[] = [
      new MockWallet(1, true, 6000),
      new MockWallet(2, true, 7000),
      new MockWallet(3, true, 8000),
    ];
    const res = getBestNonce(providers);
    jest.advanceTimersByTime(5100);
    res.catch((error) => {
      expect(error).toBeDefined();
    });
  });

  test("Case 13", async () => {
    const providers: any[] = [new MockWallet(1, true, 100)];
    const res = getBestNonce(providers);
    jest.advanceTimersByTime(200);
    expect(res).resolves.toBe(1);
  });

  test("Case 14", async () => {
    const providers: any[] = [new MockWallet(1, true, 4900)];
    const res = getBestNonce(providers);
    jest.advanceTimersByTime(4950);
    await waitOneTick();
    jest.advanceTimersByTime(5000);
    expect(res).resolves.toBe(1);
  });

  test("Case 15", async () => {
    const providers: any[] = [new MockWallet(1, true, 100), new MockWallet(2, true, 200)];
    const res = getBestNonce(providers);
    jest.advanceTimersByTime(300);
    expect(res).resolves.toBe(2);
  });

  test("Case 16", async () => {
    const providers: any[] = [new MockWallet(1, true, 100), new MockWallet(2, true, 1000)];
    const res = getBestNonce(providers);
    jest.advanceTimersByTime(1100);
    expect(res).resolves.toBe(2);
  });

  test("Case 17", async () => {
    const providers: any[] = [
      new MockWallet(1, true, 100),
      new MockWallet(2, true, 200),
      new MockWallet(3, true, 300),
      new MockWallet(4, true, 500),
    ];
    const res = getBestNonce(providers);
    jest.advanceTimersByTime(400);
    expect(res).resolves.toBe(3);
  });

  // Clean up timers after each test
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });
});

async function waitOneTick() {
  jest.useRealTimers();
  await new Promise((resolve) => queueMicrotask(() => resolve(null)));
  jest.useFakeTimers();
}
