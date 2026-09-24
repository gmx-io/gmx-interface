import { getRpcEndpoint } from '@/hooks/utilsHooks/useMultipleRpcLatency';
import { RpcEndpointType } from '@/zustand/slices/settingsSlice';
import { checkRpcEndpoint } from '@/utils/rpc/checkRpcEndpoint';

export async function resolveEffectiveRpcUrl(
  type: RpcEndpointType,
  customUrl: string
): Promise<string> {
  const heliusUrl = getRpcEndpoint('helius', '');

  if (type !== 'custom') {
    return heliusUrl;
  }

  const trimmedUrl = customUrl.trim();
  if (!trimmedUrl) {
    return heliusUrl;
  }

  const check = await checkRpcEndpoint(trimmedUrl);
  return check.ok ? trimmedUrl : heliusUrl;
}
