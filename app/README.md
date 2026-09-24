# GMSOL Interface

## RPC configuration

Do not put Helius API keys in frontend env files. Vite exposes every `VITE_*`
value in the browser bundle.

Use the Cloudflare Worker RPC proxy for Solana RPC:

```dotenv
VITE_HELIUS_RPC_URL=https://rpc-1.gmtrade.xyz/
VITE_HELIUS_WSS_ENDPOINT=wss://rpc-1.gmtrade.xyz/
```

Do not use `VITE_SOLANA_ENDPOINT` for Helius URLs. Any `VITE_*` value can be
inlined into the production bundle.

For local development, copy an example file and fill in local values:

```sh
cp app/.env.example app/.env.local
```

Real `.env` files are ignored by git. Commit only `.env*.example` templates.
