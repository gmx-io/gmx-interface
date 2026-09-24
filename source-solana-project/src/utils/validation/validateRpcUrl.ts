import { t } from '@lingui/macro';

export interface RpcUrlValidationResult {
  valid: boolean;
  error?: string;
}

const PRIVATE_IP_PREFIXES = [
  '10.',
  '172.16.', '172.17.', '172.18.', '172.19.',
  '172.20.', '172.21.', '172.22.', '172.23.',
  '172.24.', '172.25.', '172.26.', '172.27.',
  '172.28.', '172.29.', '172.30.', '172.31.',
  '192.168.',
];

const FORBIDDEN_HOSTS = ['127.0.0.1', '0.0.0.0', '[::1]'];

function isPrivateHost(hostname: string): boolean {
  if (FORBIDDEN_HOSTS.includes(hostname)) return true;
  return PRIVATE_IP_PREFIXES.some((prefix) => hostname.startsWith(prefix));
}

export function validateRpcUrl(url: string): RpcUrlValidationResult {
  const trimmed = url.trim();

  if (!trimmed) {
    return { valid: false, error: t`URL cannot be empty` };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: t`Invalid URL format` };
  }

  const isDev = import.meta.env.DEV;
  const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
  const isLoopbackHttp =
    parsed.protocol === 'http:' && LOOPBACK_HOSTS.includes(parsed.hostname);

  if (parsed.protocol !== 'https:') {
    if (isDev && isLoopbackHttp) {
      // Dev environment allows loopback HTTP (localhost / 127.0.0.1 / [::1])
    } else {
      return { valid: false, error: t`RPC URL must use HTTPS` };
    }
  }

  // Block private/internal network addresses (skip loopback in dev)
  if (!isDev && isPrivateHost(parsed.hostname)) {
    return {
      valid: false,
      error: t`Internal network addresses are not allowed`,
    };
  }

  return { valid: true };
}
