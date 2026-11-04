// The Tooltip Changelog as data: exact edits for the product repo, step by step (rendered by DocsChangelog).
import type { ChangelogStep } from "../DocsChangelog";

// Rules for all steps
export const TOOLTIP_CHANGELOG_NOTES: string[] = [
  'Scope: the shared tooltip blocks (TooltipBlocks.tsx), the places that link to the docs with "Read more", the network fee, lifetime earnings and claimed-amounts tooltips, and the tooltip timing in config/ui.ts.',
  "Apply on top of the Tooltip PR (#3142): the find texts come with it. Line numbers are from the Tooltip PR merged into design-system-v2.",
  "Each edit: replace the find text with the replace text; after earlier steps, match the find text.",
];

export const TOOLTIP_CHANGELOG_STEPS: ChangelogStep[] = [
  {
    id: "tooltip-read-more",
    title: "1. Read more and actions",
    goal: '"Read more" links get one block (TooltipReadMore): no underline, an arrow after the text that never wraps onto a line alone and is hidden from screen readers. Actions (TooltipAction) are grey and underlined, the same size as the text. Named links keep the underline.',
    dependsOn: ["The Tooltip PR (#3142)"],
    edits: [
      {
        file: "src/components/AprInfo/AprInfo.tsx",
        line: "18",
        find: "  TooltipLink,",
        replace: "  TooltipReadMore,",
      },
      {
        file: "src/components/AprInfo/AprInfo.tsx",
        line: "86-88",
        find: "            <TooltipLink href={isTbtcIncentive ? TBTC_INFORMATION_URL : getIncentivesV2Url(chainId)}>\n              <Trans>Read more</Trans>\n            </TooltipLink>",
        replace:
          "            <TooltipReadMore href={isTbtcIncentive ? TBTC_INFORMATION_URL : getIncentivesV2Url(chainId)} />",
      },
      {
        file: "src/components/Claims/ClaimableCard.tsx",
        line: "12",
        find: 'import { TooltipContent, TooltipLink, TooltipText } from "components/Tooltip/TooltipBlocks";',
        replace: 'import { TooltipContent, TooltipReadMore, TooltipText } from "components/Tooltip/TooltipBlocks";',
      },
      {
        file: "src/components/Claims/ClaimableCard.tsx",
        line: "55-57",
        find: "              <TooltipLink href={DOCS_LINKS.priceImpact}>\n                <Trans>Read more</Trans>\n              </TooltipLink>",
        replace: "              <TooltipReadMore href={DOCS_LINKS.priceImpact} />",
      },
      {
        file: "src/components/Claims/SettleAccruedCard.tsx",
        line: "12",
        find: 'import { TooltipContent, TooltipLink, TooltipText } from "components/Tooltip/TooltipBlocks";',
        replace: 'import { TooltipContent, TooltipReadMore, TooltipText } from "components/Tooltip/TooltipBlocks";',
      },
      {
        file: "src/components/Claims/SettleAccruedCard.tsx",
        line: "57-59",
        find: "              <TooltipLink href={DOCS_LINKS.priceImpact}>\n                <Trans>Read more</Trans>\n              </TooltipLink>",
        replace: "              <TooltipReadMore href={DOCS_LINKS.priceImpact} />",
      },
      {
        file: "src/components/ExitPriceRow/ExitPriceRow.tsx",
        line: "11",
        find: 'import { TooltipContent, TooltipLink, TooltipText } from "components/Tooltip/TooltipBlocks";',
        replace: 'import { TooltipContent, TooltipReadMore, TooltipText } from "components/Tooltip/TooltipBlocks";',
      },
      {
        file: "src/components/ExitPriceRow/ExitPriceRow.tsx",
        line: "46-48",
        find: "              <TooltipLink href={DOCS_LINKS.priceImpact}>\n                <Trans>Read more</Trans>\n              </TooltipLink>",
        replace: "              <TooltipReadMore href={DOCS_LINKS.priceImpact} />",
      },
      {
        file: "src/components/GmxAccountModal/GmxAccountModalShared.tsx",
        line: "12",
        find: 'import { TooltipContent, TooltipLink, TooltipText } from "components/Tooltip/TooltipBlocks";',
        replace: 'import { TooltipContent, TooltipReadMore, TooltipText } from "components/Tooltip/TooltipBlocks";',
      },
      {
        file: "src/components/GmxAccountModal/GmxAccountModalShared.tsx",
        line: "64-70",
        find: "        <Trans>GMX Account is not available on {chainName}. To use GMX Account, switch to Arbitrum.</Trans>\n      </TooltipText>\n      <TooltipLink href={DOCS_MULTICHAIN_URL}>\n        <Trans>Read more</Trans>\n      </TooltipLink>\n    </TooltipContent>\n  );",
        replace:
          "        <Trans>GMX Account is not available on {chainName}. To use GMX Account, switch to Arbitrum.</Trans>\n      </TooltipText>\n      <TooltipReadMore href={DOCS_MULTICHAIN_URL} />\n    </TooltipContent>\n  );",
      },
      {
        file: "src/components/GmxAccountModal/GmxAccountModalShared.tsx",
        line: "123-129",
        find: "        </Trans>\n      </TooltipText>\n      <TooltipLink href={DOCS_MULTICHAIN_URL}>\n        <Trans>Read more</Trans>\n      </TooltipLink>\n    </TooltipContent>\n  );",
        replace:
          "        </Trans>\n      </TooltipText>\n      <TooltipReadMore href={DOCS_MULTICHAIN_URL} />\n    </TooltipContent>\n  );",
      },
      {
        file: "src/components/HighPriceImpactOrFeesWarningCard/HighPriceImpactOrFeesWarningCard.tsx",
        line: "12",
        find: 'import { TooltipContent, TooltipLink, TooltipText } from "components/Tooltip/TooltipBlocks";',
        replace: 'import { TooltipContent, TooltipReadMore, TooltipText } from "components/Tooltip/TooltipBlocks";',
      },
      {
        file: "src/components/HighPriceImpactOrFeesWarningCard/HighPriceImpactOrFeesWarningCard.tsx",
        line: "57-59",
        find: "            <TooltipLink href={DOCS_LINKS.priceImpact}>\n              <Trans>Read more</Trans>\n            </TooltipLink>",
        replace: "            <TooltipReadMore href={DOCS_LINKS.priceImpact} />",
      },
      {
        file: "src/components/MarketsList/NetFeeHeaderTooltipContent.tsx",
        line: "5",
        find: 'import { TooltipContent, TooltipLink, TooltipText, TooltipTitledText } from "components/Tooltip/TooltipBlocks";',
        replace:
          'import { TooltipContent, TooltipReadMore, TooltipText, TooltipTitledText } from "components/Tooltip/TooltipBlocks";',
      },
      {
        file: "src/components/MarketsList/NetFeeHeaderTooltipContent.tsx",
        line: "17-19",
        find: "        <TooltipLink href={DOCS_LINKS.fundingFees}>\n          <Trans>Read more</Trans>\n        </TooltipLink>",
        replace: "        <TooltipReadMore href={DOCS_LINKS.fundingFees} />",
      },
      {
        file: "src/components/MarketsList/NetFeeHeaderTooltipContent.tsx",
        line: "25-27",
        find: "        <TooltipLink href={DOCS_LINKS.borrowingFees}>\n          <Trans>Read more</Trans>\n        </TooltipLink>",
        replace: "        <TooltipReadMore href={DOCS_LINKS.borrowingFees} />",
      },
      {
        file: "src/components/OrderEditor/OrderEditor.tsx",
        line: "146",
        find: 'import { TooltipAction, TooltipContent, TooltipLink, TooltipRow, TooltipText } from "components/Tooltip/TooltipBlocks";',
        replace:
          'import {\n  TooltipAction,\n  TooltipContent,\n  TooltipReadMore,\n  TooltipRow,\n  TooltipText,\n} from "components/Tooltip/TooltipBlocks";',
      },
      {
        file: "src/components/OrderEditor/OrderEditor.tsx",
        line: "755-757",
        find: '            <TooltipLink href="https://docs.gmx.io/docs/trading/order-types/#max-leverage">\n              <Trans>Read more</Trans>\n            </TooltipLink>',
        replace: '            <TooltipReadMore href="https://docs.gmx.io/docs/trading/order-types/#max-leverage" />',
      },
      {
        file: "src/components/PositionEditor/usePositionEditorButtonState.tsx",
        line: "101",
        find: 'import { TooltipAction, TooltipContent, TooltipLink, TooltipText } from "components/Tooltip/TooltipBlocks";',
        replace:
          'import { TooltipAction, TooltipContent, TooltipReadMore, TooltipText } from "components/Tooltip/TooltipBlocks";',
      },
      {
        file: "src/components/PositionEditor/usePositionEditorButtonState.tsx",
        line: "525-527",
        find: '          <TooltipLink href="https://docs.gmx.io/docs/trading/order-types/#max-leverage">\n            <Trans>Read more</Trans>\n          </TooltipLink>',
        replace: '          <TooltipReadMore href="https://docs.gmx.io/docs/trading/order-types/#max-leverage" />',
      },
      {
        file: "src/components/PositionItem/PositionItem.tsx",
        line: "50",
        find: "  TooltipLink,",
        replace: "  TooltipReadMore,",
      },
      {
        file: "src/components/PositionItem/PositionItem.tsx",
        line: "488-490",
        find: "            <TooltipLink href={OFF_HOURS_DOCS_URL}>\n              <Trans>Read more</Trans>\n            </TooltipLink>",
        replace: "            <TooltipReadMore href={OFF_HOURS_DOCS_URL} />",
      },
      {
        file: "src/components/PositionSeller/PositionSeller.tsx",
        line: "128",
        find: 'import { TooltipContent, TooltipLink, TooltipText } from "components/Tooltip/TooltipBlocks";',
        replace: 'import { TooltipContent, TooltipReadMore, TooltipText } from "components/Tooltip/TooltipBlocks";',
      },
      {
        file: "src/components/PositionSeller/PositionSeller.tsx",
        line: "932-934",
        find: '          <TooltipLink href="https://docs.gmx.io/docs/trading/order-types/#max-leverage">\n            <Trans>Read more</Trans>\n          </TooltipLink>',
        replace: '          <TooltipReadMore href="https://docs.gmx.io/docs/trading/order-types/#max-leverage" />',
      },
      {
        file: "src/components/PositionSeller/rows/AllowedSlippageRow.tsx",
        line: "9",
        find: 'import { TooltipContent, TooltipLink, TooltipText } from "components/Tooltip/TooltipBlocks";',
        replace: 'import { TooltipContent, TooltipReadMore, TooltipText } from "components/Tooltip/TooltipBlocks";',
      },
      {
        file: "src/components/PositionSeller/rows/AllowedSlippageRow.tsx",
        line: "41-43",
        find: '                <TooltipLink href="https://docs.gmx.io/docs/trading/fees/#slippage">\n                  <Trans>Read more</Trans>\n                </TooltipLink>',
        replace: '                <TooltipReadMore href="https://docs.gmx.io/docs/trading/fees/#slippage" />',
      },
      {
        file: "src/components/PositionSeller/rows/PositionSellerPriceImpactFeesRow.tsx",
        line: "13",
        find: 'import { TooltipContent, TooltipLink, TooltipText } from "components/Tooltip/TooltipBlocks";',
        replace: 'import { TooltipContent, TooltipReadMore, TooltipText } from "components/Tooltip/TooltipBlocks";',
      },
      {
        file: "src/components/PositionSeller/rows/PositionSellerPriceImpactFeesRow.tsx",
        line: "64-66",
        find: "                <TooltipLink href={DOCS_LINKS.priceImpact}>\n                  <Trans>Read more</Trans>\n                </TooltipLink>",
        replace: "                <TooltipReadMore href={DOCS_LINKS.priceImpact} />",
      },
      {
        file: "src/components/Referrals/affiliates/dashboard/AffiliatesOverviewChartCards.tsx",
        line: "16",
        find: 'import { TooltipContent, TooltipLink, TooltipText } from "components/Tooltip/TooltipBlocks";',
        replace: 'import { TooltipContent, TooltipReadMore, TooltipText } from "components/Tooltip/TooltipBlocks";',
      },
      {
        file: "src/components/Referrals/affiliates/dashboard/AffiliatesOverviewChartCards.tsx",
        line: "142-144",
        find: "          <TooltipLink href={REFERRALS_DOCS_URL}>\n            <Trans>Read more</Trans>\n          </TooltipLink>",
        replace: "          <TooltipReadMore href={REFERRALS_DOCS_URL} />",
      },
      {
        file: "src/components/Referrals/traders/dashboard/ReferralsTradersContent.tsx",
        line: "41",
        find: 'import { TooltipContent, TooltipLink, TooltipText } from "components/Tooltip/TooltipBlocks";',
        replace: 'import { TooltipContent, TooltipReadMore, TooltipText } from "components/Tooltip/TooltipBlocks";',
      },
      {
        file: "src/components/Referrals/traders/dashboard/ReferralsTradersContent.tsx",
        line: "318-320",
        find: "      <TooltipLink href={BALANCER_PROGRAM_URL}>\n        <Trans>Read more</Trans>\n      </TooltipLink>",
        replace: "      <TooltipReadMore href={BALANCER_PROGRAM_URL} />",
      },
      {
        file: "src/components/SettingsModal/DisplaySettings.tsx",
        line: "11",
        find: 'import { TooltipContent, TooltipLink, TooltipText } from "components/Tooltip/TooltipBlocks";',
        replace: 'import { TooltipContent, TooltipReadMore, TooltipText } from "components/Tooltip/TooltipBlocks";',
      },
      {
        file: "src/components/SettingsModal/DisplaySettings.tsx",
        line: "136-138",
        find: "                  <TooltipLink href={DOCS_LINKS.priceImpact}>\n                    <Trans>Read more</Trans>\n                  </TooltipLink>",
        replace: "                  <TooltipReadMore href={DOCS_LINKS.priceImpact} />",
      },
      {
        file: "src/components/SettingsModal/TradingSettings.tsx",
        line: "38",
        find: 'import { TooltipContent, TooltipLink, TooltipText } from "components/Tooltip/TooltipBlocks";',
        replace: 'import { TooltipContent, TooltipReadMore, TooltipText } from "components/Tooltip/TooltipBlocks";',
      },
      {
        file: "src/components/SettingsModal/TradingSettings.tsx",
        line: "323-325",
        find: '              <TooltipLink href="https://docs.gmx.io/docs/trading/fees/#slippage">\n                <Trans>Read more</Trans>\n              </TooltipLink>',
        replace: '              <TooltipReadMore href="https://docs.gmx.io/docs/trading/fees/#slippage" />',
      },
      {
        file: "src/components/SettingsModal/TradingSettings.tsx",
        line: "354-356",
        find: '                <TooltipLink href="https://docs.gmx.io/docs/trading/fees/#network-fee">\n                  <Trans>Read more</Trans>\n                </TooltipLink>',
        replace: '                <TooltipReadMore href="https://docs.gmx.io/docs/trading/fees/#network-fee" />',
      },
      {
        file: "src/components/SettingsModal/TradingSettings.tsx",
        line: "391-393",
        find: '                <TooltipLink href="https://docs.gmx.io/docs/trading/order-types/#auto-cancel-tpsl">\n                  <Trans>Read more</Trans>\n                </TooltipLink>',
        replace:
          '                <TooltipReadMore href="https://docs.gmx.io/docs/trading/order-types/#auto-cancel-tpsl" />',
      },
      {
        file: "src/components/Tooltip/TooltipBlocks.tsx",
        line: "1",
        find: 'import cx from "classnames";',
        replace: 'import { t } from "@lingui/macro";\nimport cx from "classnames";',
      },
      {
        file: "src/components/Tooltip/TooltipBlocks.tsx",
        line: "119-121",
        find: '      <button type="button" className="link-underline text-left hover:text-blue-strong" onClick={onClick}>\n        {children}\n      </button>',
        replace:
          '      <button\n        type="button"\n        className="link-underline text-left text-textIcon-secondary hover:text-textIcon-primary"\n        onClick={onClick}\n      >\n        {children}\n      </button>\n    </div>\n  );\n}\n\n/**\n * "Read more" right under the text it explains: no underline and an arrow that never wraps onto a line alone.\n */\nexport function TooltipReadMore({ href }: { href: string }) {\n  return (\n    <div>\n      <ExternalLink href={href} className="whitespace-nowrap !no-underline">\n        {t`Read more`}\n        {/* The arrow is decoration: screen readers still read the link as "Read more" */}\n        <span aria-hidden="true">{"\\u00a0\\u2197"}</span>\n      </ExternalLink>',
      },
      {
        file: "src/components/TradeBox/SwapSlippageField.tsx",
        line: "16",
        find: 'import { TooltipContent, TooltipLink, TooltipText } from "components/Tooltip/TooltipBlocks";',
        replace: 'import { TooltipContent, TooltipReadMore, TooltipText } from "components/Tooltip/TooltipBlocks";',
      },
      {
        file: "src/components/TradeBox/SwapSlippageField.tsx",
        line: "129-131",
        find: '            <TooltipLink href="https://docs.gmx.io/docs/trading/fees/#slippage">\n              <Trans>Read more</Trans>\n            </TooltipLink>',
        replace: '            <TooltipReadMore href="https://docs.gmx.io/docs/trading/fees/#slippage" />',
      },
      {
        file: "src/components/TradeBox/TradeBoxRows/AllowedSlippageRow.tsx",
        line: "16",
        find: 'import { TooltipContent, TooltipLink, TooltipText } from "components/Tooltip/TooltipBlocks";',
        replace: 'import { TooltipContent, TooltipReadMore, TooltipText } from "components/Tooltip/TooltipBlocks";',
      },
      {
        file: "src/components/TradeBox/TradeBoxRows/AllowedSlippageRow.tsx",
        line: "53-55",
        find: '              <TooltipLink href="https://docs.gmx.io/docs/trading/fees/#slippage">\n                <Trans>Read more</Trans>\n              </TooltipLink>',
        replace: '              <TooltipReadMore href="https://docs.gmx.io/docs/trading/fees/#slippage" />',
      },
      {
        file: "src/components/TradeBox/TradeBoxRows/NextStoredImpactRows.tsx",
        line: "15",
        find: 'import { TooltipContent, TooltipLink, TooltipText } from "components/Tooltip/TooltipBlocks";',
        replace: 'import { TooltipContent, TooltipReadMore, TooltipText } from "components/Tooltip/TooltipBlocks";',
      },
      {
        file: "src/components/TradeBox/TradeBoxRows/NextStoredImpactRows.tsx",
        line: "38-40",
        find: "                <TooltipLink href={DOCS_LINKS.priceImpact}>\n                  <Trans>Read more</Trans>\n                </TooltipLink>",
        replace: "                <TooltipReadMore href={DOCS_LINKS.priceImpact} />",
      },
      {
        file: "src/components/TradeBox/TradeBoxRows/PriceImpactFeesRow.tsx",
        line: "24",
        find: 'import { TooltipContent, TooltipLink, TooltipText } from "components/Tooltip/TooltipBlocks";',
        replace: 'import { TooltipContent, TooltipReadMore, TooltipText } from "components/Tooltip/TooltipBlocks";',
      },
      {
        file: "src/components/TradeBox/TradeBoxRows/PriceImpactFeesRow.tsx",
        line: "130-136",
        find: "                    <Trans>Net price impact and fees from your trade.</Trans>\n                  </TooltipText>\n                  <TooltipLink href={DOCS_LINKS.priceImpact}>\n                    <Trans>Read more</Trans>\n                  </TooltipLink>\n                </TooltipContent>\n              }",
        replace:
          "                    <Trans>Net price impact and fees from your trade.</Trans>\n                  </TooltipText>\n                  <TooltipReadMore href={DOCS_LINKS.priceImpact} />\n                </TooltipContent>\n              }",
      },
      {
        file: "src/components/TradeBox/TradeBoxRows/PriceImpactFeesRow.tsx",
        line: "204-210",
        find: "                    <Trans>No price impact on increases — orders execute at mark price.</Trans>\n                  </TooltipText>\n                  <TooltipLink href={DOCS_LINKS.priceImpact}>\n                    <Trans>Read more</Trans>\n                  </TooltipLink>\n                </TooltipContent>\n              }",
        replace:
          "                    <Trans>No price impact on increases — orders execute at mark price.</Trans>\n                  </TooltipText>\n                  <TooltipReadMore href={DOCS_LINKS.priceImpact} />\n                </TooltipContent>\n              }",
      },
      {
        file: "src/components/TradeBox/hooks/useTradeButtonState.tsx",
        line: "116",
        find: 'import { TooltipAction, TooltipContent, TooltipLink, TooltipText } from "components/Tooltip/TooltipBlocks";',
        replace:
          'import { TooltipAction, TooltipContent, TooltipReadMore, TooltipText } from "components/Tooltip/TooltipBlocks";',
      },
      {
        file: "src/components/TradeBox/hooks/useTradeButtonState.tsx",
        line: "433-435",
        find: '              <TooltipLink href="https://docs.gmx.io/docs/trading/order-types/#max-leverage">\n                <Trans>Read more</Trans>\n              </TooltipLink>',
        replace: '              <TooltipReadMore href="https://docs.gmx.io/docs/trading/order-types/#max-leverage" />',
      },
      {
        file: "src/components/TradeFeesRow/TradeFeesRow.tsx",
        line: "25",
        find: "  TooltipLink,",
        replace: "  TooltipReadMore,",
      },
      {
        file: "src/components/TradeFeesRow/TradeFeesRow.tsx",
        line: "563-565",
        find: "                  <TooltipLink href={getIncentivesV2Url(chainId)}>\n                    <Trans>Read more</Trans>\n                  </TooltipLink>",
        replace: "                  <TooltipReadMore href={getIncentivesV2Url(chainId)} />",
      },
      {
        file: "src/components/TradeFeesRow/TradeFeesRow.tsx",
        line: "571-573",
        find: "                  <TooltipLink href={DOCS_LINKS.priceImpact}>\n                    <Trans>Read more</Trans>\n                  </TooltipLink>",
        replace: "                  <TooltipReadMore href={DOCS_LINKS.priceImpact} />",
      },
      {
        file: "src/components/TradeInfoIcon/TradeInfoIcon.tsx",
        line: "7",
        find: 'import { TooltipContent, TooltipLink, TooltipTitledText } from "components/Tooltip/TooltipBlocks";',
        replace:
          'import { TooltipContent, TooltipReadMore, TooltipTitledText } from "components/Tooltip/TooltipBlocks";',
      },
      {
        file: "src/components/TradeInfoIcon/TradeInfoIcon.tsx",
        line: "61-69",
        find: '            time.\n          </Trans>\n        </TooltipTitledText>\n        <TooltipLink href="https://docs.gmx.io/docs/trading/order-types/">\n          <Trans>Read more</Trans>\n        </TooltipLink>\n      </TooltipContent>\n    ),\n    [TradeType.Short]: (',
        replace:
          '            time.\n          </Trans>\n        </TooltipTitledText>\n        <TooltipReadMore href="https://docs.gmx.io/docs/trading/order-types/" />\n      </TooltipContent>\n    ),\n    [TradeType.Short]: (',
      },
      {
        file: "src/components/TradeInfoIcon/TradeInfoIcon.tsx",
        line: "93-101",
        find: '            specified time.\n          </Trans>\n        </TooltipTitledText>\n        <TooltipLink href="https://docs.gmx.io/docs/trading/order-types/">\n          <Trans>Read more</Trans>\n        </TooltipLink>\n      </TooltipContent>\n    ),\n    [TradeType.Swap]: (',
        replace:
          '            specified time.\n          </Trans>\n        </TooltipTitledText>\n        <TooltipReadMore href="https://docs.gmx.io/docs/trading/order-types/" />\n      </TooltipContent>\n    ),\n    [TradeType.Swap]: (',
      },
    ],
    verify: [
      'grep -rn "<TooltipLink" src --include=*.tsx finds only the two named links (FeeApyLabel, PerformanceLabel) and the design system pages',
      "yarn tsc and yarn lint pass",
    ],
    visible:
      'Every "Read more" in a tooltip reads "Read more ↗", without an underline, blue on hover; actions such as "Set max leverage" are grey.',
  },
  {
    id: "tooltip-dividers",
    title: "2. Dividers between blocks",
    goal: "A divider separates blocks that have no title: the network fee notes, the two lifetime earnings groups, and each market in the claimed amounts. Never between rows and the note that explains them.",
    dependsOn: ["The Tooltip PR (#3142)"],
    edits: [
      {
        file: "src/components/Claims/ClaimHistoryRow/ClaimCollateralHistoryRow.tsx",
        line: "3-4",
        find: 'import { useLingui } from "@lingui/react";\nimport React, { useCallback, useMemo } from "react";',
        replace:
          'import { useLingui } from "@lingui/react";\nimport cx from "classnames";\nimport React, { useCallback, useMemo } from "react";',
      },
      {
        file: "src/components/Claims/ClaimHistoryRow/ClaimCollateralHistoryRow.tsx",
        line: "105-109",
        find: '        ({ marketInfo: market, longTokenAmount, shortTokenAmount, longTokenAmountUsd, shortTokenAmountUsd }) => {\n          const indexName = getMarketIndexName(market);\n          const poolName = getMarketPoolName(market);\n          return (\n            <div key={market.indexTokenAddress} className="flex flex-col gap-4">',
        replace:
          '        ({ marketInfo: market, longTokenAmount, shortTokenAmount, longTokenAmountUsd, shortTokenAmountUsd }, index) => {\n          const indexName = getMarketIndexName(market);\n          const poolName = getMarketPoolName(market);\n          return (\n            <div\n              key={market.indexTokenAddress}\n              className={cx("flex flex-col gap-4", index > 0 && "border-t border-fill-accent pt-8")}\n            >',
      },
      {
        file: "src/components/Claims/ClaimHistoryRow/ClaimFundingFeesHistoryRow.tsx",
        line: "3-4",
        find: 'import { useLingui } from "@lingui/react";\nimport React, { useCallback, useMemo } from "react";',
        replace:
          'import { useLingui } from "@lingui/react";\nimport cx from "classnames";\nimport React, { useCallback, useMemo } from "react";',
      },
      {
        file: "src/components/Claims/ClaimHistoryRow/ClaimFundingFeesHistoryRow.tsx",
        line: "145",
        find: "          ({ marketInfo: market, longTokenAmount, shortTokenAmount, longTokenAmountUsd, shortTokenAmountUsd }) => {",
        replace:
          "          (\n            { marketInfo: market, longTokenAmount, shortTokenAmount, longTokenAmountUsd, shortTokenAmountUsd },\n            index\n          ) => {",
      },
      {
        file: "src/components/Claims/ClaimHistoryRow/ClaimFundingFeesHistoryRow.tsx",
        line: "150",
        find: '              <div key={market.indexTokenAddress} className="flex flex-col gap-4">',
        replace:
          '              <div\n                key={market.indexTokenAddress}\n                className={cx("flex flex-col gap-4", index > 0 && "border-t border-fill-accent pt-8")}\n              >',
      },
      {
        file: "src/components/Earn/Portfolio/EarningsOverview/LifetimeEarningsTooltip.tsx",
        line: "13-14",
        find: "  TooltipContent,\n  TooltipFootnote,",
        replace: "  TooltipContent,\n  TooltipDivider,\n  TooltipFootnote,",
      },
      {
        file: "src/components/Earn/Portfolio/EarningsOverview/LifetimeEarningsTooltip.tsx",
        line: "74-75",
        find: "\n      <Group title={<Trans>Lifetime LP rewards</Trans>}>",
        replace: "\n      <TooltipDivider />\n\n      <Group title={<Trans>Lifetime LP rewards</Trans>}>",
      },
      {
        file: "src/components/NetworkFeeRow/NetworkFeeRow.tsx",
        line: "28-29",
        find: "  TooltipFootnote,\n  TooltipLink,",
        replace: "  TooltipDivider,\n  TooltipFootnote,\n  TooltipReadMore,",
      },
      {
        file: "src/components/NetworkFeeRow/NetworkFeeRow.tsx",
        line: "230-234",
        find: '            {sourceExplanation && <TooltipFootnote>{sourceExplanation}</TooltipFootnote>}\n            {additionalOrdersMsg && <TooltipFootnote>{additionalOrdersMsg}</TooltipFootnote>}\n            <TooltipLink href="https://docs.gmx.io/docs/trading/fees/#network-fee">\n              <Trans>Read more</Trans>\n            </TooltipLink>',
        replace:
          '            <TooltipReadMore href="https://docs.gmx.io/docs/trading/fees/#network-fee" />\n            {(sourceExplanation || additionalOrdersMsg) && <TooltipDivider />}\n            {sourceExplanation && <TooltipFootnote>{sourceExplanation}</TooltipFootnote>}\n            {additionalOrdersMsg && <TooltipFootnote>{additionalOrdersMsg}</TooltipFootnote>}',
      },
    ],
    verify: [
      "The network fee tooltip shows a line above the wallet note",
      "Claimed amounts with two markets show a line between them",
    ],
    visible: "Separate parts of these tooltips are split by a 1px line with 8px above and below.",
  },
  {
    id: "tooltip-timing",
    title: "3. Opens faster",
    goal: "Standard tooltips wait 150 ms (was 200), fade in over 150 ms (was 200) and grow from 96% (was 94%).",
    dependsOn: [],
    edits: [
      {
        file: "src/config/ui.ts",
        line: "16-20",
        find: "export const TOOLTIP_STANDARD_OPEN_DELAY = 200; // ms\nexport const TOOLTIP_GROUP_TIMEOUT = 300; // ms\nexport const TOOLTIP_ENTER_DURATION = 200; // ms\nexport const TOOLTIP_EXIT_DURATION = 120; // ms\nexport const TOOLTIP_ENTER_SCALE = 0.94;",
        replace:
          "export const TOOLTIP_STANDARD_OPEN_DELAY = 150; // ms\nexport const TOOLTIP_GROUP_TIMEOUT = 300; // ms\nexport const TOOLTIP_ENTER_DURATION = 150; // ms\nexport const TOOLTIP_EXIT_DURATION = 120; // ms\nexport const TOOLTIP_ENTER_SCALE = 0.96;",
      },
    ],
    verify: ["config/ui.ts: TOOLTIP_STANDARD_OPEN_DELAY 150, TOOLTIP_ENTER_DURATION 150, TOOLTIP_ENTER_SCALE 0.96"],
    visible: "A tooltip is fully visible after about 300 ms instead of 400 ms.",
  },
];
