import { Trans } from "@lingui/macro";

import AndrewAttachment from "img/social/attachment_andrew.png";
import ChainLinkAttachment from "img/social/attachment_chainlink_1.png";
import GMXAttachment from "img/social/attachment_gmx.png";
import LayerZeroAttachment from "img/social/attachment_layerzero.png";
import LuckyAttachment from "img/social/attachment_lucky.png";
import MoonboyAttachment from "img/social/attachment_moonboy.png";
import TokenTerminalAttachment from "img/social/attachment_tokenterminal.png";
import TradaoAttachment from "img/social/attachment_tradao.png";
import AndrewAvatar from "img/social/avatar_andrew.png";
import ChainLinkAvatar from "img/social/avatar_chainlink.png";
import GMXAvatar from "img/social/avatar_gmx.png";
import LayerZeroAvatar from "img/social/avatar_layerzero.png";
import LuckyAvatar from "img/social/avatar_lucky.png";
import MoonboyAvatar from "img/social/avatar_moonboy.png";
import TokenTerminalAvatar from "img/social/avatar_tokenterminal.png";
import TradaoAvatar from "img/social/avatar_tradao.png";

import { SocialCard } from "./SocialCard";

export function SocialSlider() {
  return (
    <div className="w-full">
      <div className="animate-scroll hover:animate-pause relative flex w-full flex-row gap-16 pr-16">
        <div className="to-transparent pointer-events-none absolute bottom-0 left-0 z-10 h-[60px] w-full bg-gradient-to-b from-[#05050D]/0 to-[#05050D] sm:h-[244px]" />
        <Slides />
        <Slides />
      </div>
    </div>
  );
}

function Slides() {
  return (
    <>
      <SocialCard
        author="Andrew Kang"
        avatarUrl={AndrewAvatar}
        username="Rewkang"
        postLink="https://x.com/Rewkang/status/1579864052834381825"
        date="5:58 PM · Oct 11, 2022"
      >
        <div className="flex-grow-1 flex h-full flex-col justify-between">
          <Trans>
            <p>
              Tried <span className="text-blue-100">@GMX_IO</span> for the first time.{" "}
            </p>
            <p> Pretty impressive experience - no slippage, fast execution </p>
            <p> Low size caps, but fun to do some degen gambling with </p>
          </Trans>
        </div>
        <img src={AndrewAttachment} alt="Andrew Attachment" className="radius-8 w-full object-cover" />
      </SocialCard>
      <SocialCard
        author="Lucky"
        avatarUrl={LuckyAvatar}
        username="LLuciano_BTC"
        postLink="https://x.com/LLuciano_BTC/status/1729126687915364713"
        date="2:15 PM · Nov 27, 2023"
      >
        <div className="flex-grow-1 flex h-full flex-col justify-between">
          <Trans>
            <p>
              <span className="text-blue-100">$GMX</span> has rightfully earned its title as the perpetual trading
              juggernaut, and the reasons behind this recognition are manifold.
            </p>
            <p>
              <span className="text-blue-100">@GMX_IO</span> stands out as a project that's navigated its path without
              relying on VC backing. Remarkably, it has risen to the top, securing the No. #1 spot by TVL on Arbitrum
              Chain at $488.34M and an impressive overall Rank #23 on DeFiLlama...{" "}
              <span className="text-blue-100">see more</span>
            </p>
          </Trans>
        </div>
        <img src={LuckyAttachment} alt="Lucky Attachment" className="radius-8 h-[70px] w-full object-cover sm:h-auto" />
      </SocialCard>
      <SocialCard
        author="Chainlink"
        avatarUrl={ChainLinkAvatar}
        username="chainlink"
        postLink="https://x.com/chainlink/status/1826716413249421376"
        date="10:21 PM · Aug 22, 2024"
      >
        <div className="flex-grow-1 flex h-full flex-col justify-between">
          <Trans>
            <p>
              ⬡ Chainlink Data Story ⬡ <br />
              <span className="text-blue-100">#Chainlink</span> Data Streams have secured over $56B in volume for the{" "}
              <span className="text-blue-100">@GMX_IO</span> V2 protocol.
            </p>
            <p>
              Data Streams’ low-latency delivery of high-quality market data has supercharged GMX's perpetual markets
              across <span className="text-blue-100">@arbitrum</span> and <span className="text-blue-100">@avax</span>.{" "}
              <span className="text-blue-100">https://dune.com/gmx-io/gmx-analytics#v2-volume</span>
            </p>
          </Trans>
        </div>
        <img src={ChainLinkAttachment} alt="ChainLink Attachment" className="radius-8 w-full object-cover" />
      </SocialCard>
      <SocialCard
        author="GMX"
        avatarUrl={GMXAvatar}
        username="GMX_IO"
        postLink="https://x.com/GMX_IO/status/1911726474442244304"
        date="5:49 PM · Apr 15, 2025"
      >
        <div className="flex-grow-1 flex h-full flex-col justify-between">
          <Trans>
            <p>🔷 24h Volume: $1.01 Billion.</p>
            <p>
              Thank you to the hundreds of thousands of GMX users who continue to support permissionless onchain
              trading.
            </p>
          </Trans>
        </div>
        <img src={GMXAttachment} alt="GMX Attachment" className="radius-8 w-full object-cover" />
      </SocialCard>
      <SocialCard
        author="LayerZero"
        avatarUrl={LayerZeroAvatar}
        username="LayerZero_Core"
        postLink="https://x.com/LayerZero_Labs/status/1911726474442244304"
        date="12:21 PM · Apr 14, 2025"
      >
        <div className="flex-grow-1 flex h-full flex-col justify-between">
          <Trans>
            <p>
              With a 75.5% majority vote, GMX has selected LayerZero as its messaging partner for multichain expansion!
              The integration brings GMX:
            </p>
            <ul className="list-disc pl-14">
              <li>The ability to expand to 125+ chains</li>
              <li>Full ownership of all contracts and security</li>
              <li>Fast, zero-slippage transfers</li>
              <li>
                Battle-tested rails already trusted by billions of dollars in assets and hundreds of applications...{" "}
                <span className="text-blue-100">see more</span>
              </li>
            </ul>
          </Trans>
        </div>
        <img src={LayerZeroAttachment} alt="LayerZero Attachment" className="radius-8 w-full object-cover" />
      </SocialCard>
      <SocialCard
        author="Token Terminal"
        avatarUrl={TokenTerminalAvatar}
        username="tokenterminal"
        postLink="https://x.com/tokenterminal/status/1905625374475583606"
        date="3:17 PM · Mar 28, 2025"
      >
        <div className="flex-grow-1 flex h-full flex-col justify-between">
          <Trans>
            <p>
              <span className="text-blue-100">@GMX_IO</span> enters into a Data Partnership with Token TerminalGMX is a
              leading permissionless perpetual exchange built on <span className="text-blue-100">@Arbitrum</span> and{" "}
              <span className="text-blue-100">@Avax</span>.
            </p>
            <p>The protocol serves as a foundational liquidity baselayer for multichain DeFi.</p>
            <p>
              With ~$280 billion in notional trading volume and counting, GMX recognized the need for reliable and
              data-driven stakeholder reporting.
            </p>
          </Trans>
        </div>
        <img src={TokenTerminalAttachment} alt="Token Terminal Attachment" className="radius-8 w-full object-cover" />
      </SocialCard>
      <SocialCard
        author="Tradao"
        avatarUrl={TradaoAvatar}
        username="Tradaoperp"
        postLink="https://x.com/Tradaoperp/status/1747957871969702061"
        date="1:23 PM · Jan 18, 2024"
      >
        <div className="flex-grow-1 flex h-full flex-col justify-between">
          <Trans>
            <p>
              <span className="text-blue-100">#GMX V2</span>'s OI looks great
            </p>
            <p>GMX V2 {">"} GMX V1 + Kwenta + Polynomial</p>
            <p>
              Check more: <span className="text-blue-100">https://tradao.xyz/#/open-interest</span>
            </p>
          </Trans>
        </div>
        <img src={TradaoAttachment} alt="Tradao Attachment" className="radius-8 w-full object-cover" />
      </SocialCard>
      <SocialCard
        author="PressieMoonBoy"
        avatarUrl={MoonboyAvatar}
        username="PressieMoonBoy"
        postLink="https://x.com/PressieMoonBoy/status/1530543648206626818"
        date="3:36 PM · May 28, 2022"
      >
        <div className="flex-grow-1 flex h-full flex-col justify-between">
          <Trans>
            <p>
              Have to keep an eye on <span className="text-blue-100">@GMX_IO</span> here. While all of DeFi is in
              shambles, GMX continues to show impressive sustained performance in users, AUM, volume/fees, open
              interest, and utilization of capital. Best place to swap between major assets on Arbitrum and exposure to
              the Arb airdrop
            </p>
          </Trans>
        </div>
        <img src={MoonboyAttachment} alt="Moonboy Attachment" className="radius-8 w-full object-cover" />
      </SocialCard>
    </>
  );
}
