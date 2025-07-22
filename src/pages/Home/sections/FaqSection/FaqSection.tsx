import { t, Trans } from "@lingui/macro";

import { FaqItem } from "./components/FaqItem";

export function FaqSection() {
  return (
    <section className="flex w-full bg-fiord-700 px-16 py-80 text-white sm:px-80 sm:py-[120px]">
      <div className="mx-auto flex w-[1200px] flex-col gap-36 overflow-hidden sm:flex-row sm:gap-[120px]">
        <div>
          <h2 className="text-heading-2 mb-20">
            <Trans>FAQ</Trans>
          </h2>
          <h3 className="leading-body-sm text-16 font-medium -tracking-[0.576px] text-slate-100 sm:text-18">
            <Trans>
              Clear answers to common questions <br />
              about the platform and its features
            </Trans>
          </h3>
        </div>
        <div className="flex w-full flex-col gap-12 sm:w-[800px]">
          <FaqItem title="What Makes GMX More Efficient and Reliable for Trades Compared with Other Perpetual Platforms?">
            <Trans>
              <p>
                GMX V2 routes every order against its own liquidity pools, which currently hold over $300 million, and
                quote the oracle index price rather than relying on an order book or external market makers. This
                architecture minimizes slippage and maintains deep liquidity, even for positions over $30 million.
              </p>
              <p>
                To ensure accurate pricing without wicks, GMX V2 uses Chainlink Data Streams oracles, so liquidations
                occur only at fair market prices. With the free GMX Express mode, orders are signed off-chain and sent
                through premium RPC endpoints, enabling near-instant, reliable execution with a user experience similar
                to a centralized exchange.
              </p>
              <p>
                GMX V2 uses a unique multi-asset AMM (Automated Market Maker) model that routes trades against a
                dynamically balanced liquidity pool instead of traditional order books. This design significantly
              </p>
            </Trans>
          </FaqItem>
          <FaqItem title={t`What Makes GMX One of the Best Places to Earn Yield on My Crypto?`}>
            <Trans>
              <p>
                Liquidity providers receive 63% of all trading and liquidation fees. By depositing WBTC, ETH, USDC, or
                other supported assets, you can earn up to ~35% annualized yield on the largest pools.
              </p>
              <ul className="list-disc pl-12">
                <li> GM Pools – choose single-market exposure for targeted returns</li>
                <li> GLV Vaults – auto-diversify across markets for a hands-off strategy</li>
              </ul>
              <p>
                Historically, both options have outperformed standard LP benchmarks. See live stats on the Pools page.
              </p>
            </Trans>
          </FaqItem>
          <FaqItem title={t`How Do I Get Started on GMX?`}>
            <Trans>
              <p>No KYC, no lengthy onboarding:</p>
              <ul className="list-decimal pl-12">
                <li>Connect any EVM wallet (MetaMask, Rabby, Coinbase Wallet, Ledger, etc.)</li>
                <li>Select a supported network where you have funds</li>
                <li>Trade</li>
              </ul>
              <p>
                You can trade directly using funds from Arbitrum, Avalanche, or Botanix, or deposit to your GMX Account
                to trade from any supported network.
              </p>
            </Trans>
          </FaqItem>
          <FaqItem title={t`Can I Build on Top of GMX or Integrate It into My DeFi App?`}>
            <Trans>
              <p>
                Absolutely. GMX is fully composable and already integrated with hundreds of protocols, including
                Dolomite, 1inch, and Odos. You can interact directly with the smart contracts or use the provided APIs
                and SDKs for trading, liquidity, or data feeds. Visit the GMX Developer Docs to get started.
              </p>
            </Trans>
          </FaqItem>
        </div>
      </div>
    </section>
  );
}
