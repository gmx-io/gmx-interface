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
          <span className={IDENT}>GmxSdk</span>
          {" } "}
          <span className={KEYWORD}>from</span> <span className={STRING}>&quot;@gmx-io/sdk&quot;</span>;
        </CodeLine>
        <CodeLine>&nbsp;</CodeLine>
        <CodeLine>
          <span className={KEYWORD}>const</span> gmx = <span className={KEYWORD}>new</span>{" "}
          <span className={IDENT}>GmxSdk</span>
          {"({ chain: "}
          <span className={STRING}>&quot;arbitrum&quot;</span>
          {" });"}
        </CodeLine>
        <CodeLine>&nbsp;</CodeLine>
        <CodeLine>{"// route a trade through your builder code"}</CodeLine>
        <CodeLine>
          <span className={KEYWORD}>const</span> tx = <span className={KEYWORD}>await</span>
          {" gmx.orders."}
          <span className={IDENT}>createIncrease</span>
          {"({"}
        </CodeLine>
        <CodeLine>
          {"  market:      "}
          <span className={STRING}>&quot;ETH/USD&quot;</span>,
        </CodeLine>
        <CodeLine>
          {"  collateral:  "}
          <span className={STRING}>&quot;USDC&quot;</span>,
        </CodeLine>
        <CodeLine>
          {"  sizeUsd:     "}
          <span className={STRING}>25_000</span>,
        </CodeLine>
        <CodeLine>
          {"  leverage:    "}
          <span className={STRING}>5</span>,
        </CodeLine>
        <CodeLine>
          {"  builderCode: "}
          <span className={STRING}>&quot;your-code&quot;</span>,
        </CodeLine>
        <CodeLine>{"});"}</CodeLine>
        <CodeLine>&nbsp;</CodeLine>
        <CodeLine>
          <span className={KEYWORD}>await</span> {"tx."}
          <span className={IDENT}>wait</span>
          {"(); // you just earned on this trade"}
        </CodeLine>
      </div>
    </div>
  );
}
