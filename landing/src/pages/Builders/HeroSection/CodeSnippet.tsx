import cx from "classnames";

const KEYWORD = "text-blue-300";
const STRING = "text-light-150";
const IDENT = "text-blue-100";

function CodeLine({ children }: { children: React.ReactNode }) {
  return <div className="whitespace-pre">{children}</div>;
}

export function CodeSnippet({ className }: { className?: string }) {
  return (
    <div className={cx("w-full overflow-hidden rounded-16 border-1/2 border-slate-600/50 bg-slate-900/50", className)}>
      <div className="mx-4 mt-4 flex h-44 items-center gap-8 rounded-12 bg-blue-300/10 px-16">
        <span className="size-10 rounded-full bg-slate-600" />
        <span className="size-10 rounded-full bg-slate-600" />
        <span className="size-10 rounded-full bg-slate-600" />
        <span className="ml-8 text-12 font-medium tracking-[0.864px] text-slate-500">ROUTE-TRADE.TS</span>
      </div>
      <div className="font-code overflow-x-auto p-20 pb-[22px] pt-12 text-16 leading-[28px] -tracking-[0.8px] text-slate-500">
        <CodeLine>
          <span className={KEYWORD}>import</span> {"{ "}
          <span className={IDENT}>GmxApiSdk</span>
          {" } "}
          <span className={KEYWORD}>from</span> <span className={STRING}>&quot;@gmx-io/sdk/v2&quot;</span>;
        </CodeLine>
        <CodeLine>
          <span className={KEYWORD}>const</span> sdk = <span className={KEYWORD}>new</span>{" "}
          <span className={IDENT}>GmxApiSdk</span>
          {"({ chainId: "}
          <span className={STRING}>42161</span>
          {" });"}
        </CodeLine>
        <CodeLine>&nbsp;</CodeLine>
        <CodeLine>{"// route a trade through your referral code"}</CodeLine>
        <CodeLine>
          <span className={KEYWORD}>await</span>
          {" sdk."}
          <span className={IDENT}>executeExpressOrder</span>
          {"({"}
        </CodeLine>
        <CodeLine>
          {"  kind: "}
          <span className={STRING}>&quot;increase&quot;</span>,
        </CodeLine>
        <CodeLine>
          {"  symbol: "}
          <span className={STRING}>&quot;ETH/USD [WETH-USDC]&quot;</span>,
        </CodeLine>
        <CodeLine>
          {"  orderType: "}
          <span className={STRING}>&quot;market&quot;</span>,
        </CodeLine>
        <CodeLine>
          {"  size: "}
          <span className={STRING}>25_000n</span>
          {" * "}
          <span className={STRING}>10n</span>
          {" ** "}
          <span className={STRING}>30n</span>, {"// $25k long"}
        </CodeLine>
        <CodeLine>{"  collateralToPay:"}</CodeLine>
        <CodeLine>
          {"    { amount: "}
          <span className={STRING}>5_000_000_000n</span>
          {", token: "}
          <span className={STRING}>&quot;USDC&quot;</span>
          {" },"}
        </CodeLine>
        <CodeLine>
          {"  referralCode: "}
          <span className={STRING}>&quot;your-code&quot;</span>,
        </CodeLine>
        <CodeLine>
          {"  mode: "}
          <span className={STRING}>&quot;express&quot;</span>,
        </CodeLine>
        <CodeLine>
          {"  from: "}
          <span className={IDENT}>account</span>,
        </CodeLine>
        <CodeLine>
          {"}, "}
          <span className={IDENT}>signer</span>
          {"); // you just earned on this trade"}
        </CodeLine>
      </div>
    </div>
  );
}
