type RequestPriority = "high" | "low" | "auto";

export async function fetchEthCall({
  url,
  to,
  callData,
  blockTag = "latest",
  signal,
  priority = "auto",
}: {
  url: string;
  to: string;
  callData: string;
  blockTag?: string;
  signal?: AbortSignal;
  priority?: RequestPriority;
}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [
        {
          to,
          data: callData,
        },
        blockTag,
      ],
    }),
    signal,
    priority,
  });

  if (!response.ok) {
    throw new Error(`Network response was not ok: ${response.statusText}`);
  }

  const { result } = await response.json();

  if (!result) {
    throw new Error("No result in JSON-RPC response");
  }

  return { result };
}

export async function fetchBlockNumber({
  url,
  signal,
  priority = "auto",
}: {
  url: string;
  signal?: AbortSignal;
  priority?: RequestPriority;
}): Promise<{ blockNumber: number }> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_blockNumber",
      params: [],
    }),
    signal,
    priority,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`);
  }

  const { result } = await response.json();

  if (!result) {
    throw new Error("No result in JSON-RPC response");
  }

  const blockNumber = Number(BigInt(result));

  return { blockNumber };
}
