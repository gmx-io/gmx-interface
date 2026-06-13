import { API_ROLLOUT_BUCKET_KEY } from "config/localStorage";

const BUCKET_RANGE = 100;

let cachedBucket: number | undefined;

function generateBucket(): number {
  return Math.floor(Math.random() * BUCKET_RANGE);
}

/**
 * Returns a stable user bucket in [0, 100). Persisted in localStorage so the
 * user consistently falls into or out of percentage rollouts across reloads.
 */
export function getApiRolloutBucket(): number {
  if (cachedBucket !== undefined) return cachedBucket;

  const raw = localStorage.getItem(API_ROLLOUT_BUCKET_KEY);
  const parsed = raw === null ? NaN : Number(raw);

  if (!Number.isInteger(parsed) || parsed < 0 || parsed >= BUCKET_RANGE) {
    cachedBucket = generateBucket();
    localStorage.setItem(API_ROLLOUT_BUCKET_KEY, String(cachedBucket));
  } else {
    cachedBucket = parsed;
  }

  return cachedBucket;
}
