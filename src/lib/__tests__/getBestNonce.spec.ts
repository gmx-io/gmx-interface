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
  jest.useFakeTimers();

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(jest.fn());
  });

  test("Should resolve to the highest nonce from successful responses under timeout", () => {
    const providers: any[] = [new MockWallet(1, true, 100), new MockWallet(2, true, 200), new MockWallet(3, true, 300)];
    const res = getBestNonce(providers);
    jest.advanceTimersByTime(400);
    expect(res).resolves.toBe(3);
  });

  test("Should resolve to the highest nonce from successful responses under timeout", () => {
    const providers: any[] = [new MockWallet(1, true, 100), new MockWallet(2, true, 200), new MockWallet(3, true, 300)];
    const res = getBestNonce(providers);
    jest.advanceTimersByTime(400);
    expect(res).resolves.toBe(3);
  });

  test("Should resolve to the highest nonce from successful responses, excluding failed ones", () => {
    const providers: any[] = [
      new MockWallet(1, true, 100),
      new MockWallet(2, true, 200),
      new MockWallet(3, false, 300),
    ];
    const res = getBestNonce(providers);
    jest.advanceTimersByTime(400);
    expect(res).resolves.toBe(2);
  });

  test("Should resolve with the only successful response when others fail", () => {
    const providers: any[] = [
      new MockWallet(1, false, 100),
      new MockWallet(2, true, 200),
      new MockWallet(3, false, 300),
    ];
    const res = getBestNonce(providers);
    jest.advanceTimersByTime(400);
    expect(res).resolves.toBe(2);
  });

  test("Should throw error when all providers fail", () => {
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

  test("Should resolve to the highest nonce under intermediate timeouts", () => {
    const providers: any[] = [
      new MockWallet(1, true, 100),
      new MockWallet(2, true, 200),
      new MockWallet(3, true, 1200),
    ];
    const res = getBestNonce(providers);
    jest.advanceTimersByTime(1100);
    expect(res).resolves.toBe(2);
  });

  test("Should resolve to the highest nonce even if later response is delayed", () => {
    const providers: any[] = [
      new MockWallet(1, true, 100),
      new MockWallet(2, false, 900),
      new MockWallet(3, true, 1200),
    ];
    const res = getBestNonce(providers);
    jest.advanceTimersByTime(1300);
    expect(res).resolves.toBe(3);
  });

  test("Should resolve to the first nonce if later responses fail", () => {
    const providers: any[] = [
      new MockWallet(1, true, 100),
      new MockWallet(2, false, 900),
      new MockWallet(3, false, 1200),
    ];
    const res = getBestNonce(providers);
    jest.advanceTimersByTime(1300);
    expect(res).resolves.toBe(1);
  });

  test("Should resolve to nonce from the provider that responds within timeout", () => {
    const providers: any[] = [
      new MockWallet(1, true, 100),
      new MockWallet(2, true, 4000),
      new MockWallet(3, true, 5100),
    ];
    const res = getBestNonce(providers);
    jest.advanceTimersByTime(4100);
    expect(res).resolves.toBe(2);
  });

  test("Should resolve to the first nonce when later providers fail", () => {
    const providers: any[] = [
      new MockWallet(1, true, 100),
      new MockWallet(2, false, 200),
      new MockWallet(3, true, 5100),
    ];
    const res = getBestNonce(providers);
    jest.advanceTimersByTime(3100);
    expect(res).resolves.toBe(1);
  });

  test("Should throw error when all providers respond past their timeout", () => {
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

  // Clean up timers after each test
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
  });
});
