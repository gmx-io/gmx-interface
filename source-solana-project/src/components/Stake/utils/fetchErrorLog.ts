import { GMX_SOLANA_API_ENDPOINT } from '@/config/url';
import { fetchWithTimeoutLog } from '@/utils/fetchWithTimeoutLog';

/**
 * Sends error logs to the server via POST request.
 * @param error - The error message or stack trace to log.
 * @param metadata - Optional additional context (e.g., userId, route, version).
 */
export async function errorLogRequest(
  error: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  const url = new URL(`${GMX_SOLANA_API_ENDPOINT}/log/p`);
  // const url = new URL(`${GMX_SOLANA_API_ENDPOINT}/v2/cache/prices/candles`);

  // Set a 5-second timeout for the request
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  const payload = {
    message: error,
    ...metadata,
    timestamp: new Date().toISOString(),
  };

  url.searchParams.append('s', JSON.stringify(payload));

  try {
    const response = await fetchWithTimeoutLog(url.toString(), {
      method: 'GET',
      headers: {
        // 'Content-Type': 'application/json',
      },
      // Using body instead of URL parameters for security and capacity
      // body: JSON.stringify({
      //   s: JSON.stringify(payload)
      // }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }

    // Optional: Handle response if needed
  } catch (err: any) {
    const message =
      err.name === 'AbortError' ? 'Request timed out' : err.message;
    console.error('[Logger Error]:', message);
  } finally {
    // Always clear the timeout to prevent memory leaks
    clearTimeout(timeoutId);
  }
}
