export async function fetchEthCall({
  url,
  to,
  callData,
  blockTag = "latest",
  signal,
}: {
  url: string;
  to: string;
  callData: string;
  blockTag?: string;
  signal?: AbortSignal;
}) {
  // TODO: ttf?
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
