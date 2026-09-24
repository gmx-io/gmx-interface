import deepLiquidityCard from '@/img/new-landing/deep-liquidity-card.png';
import deepLiquidityCardMobile from '@/img/new-landing/deep-liquidity-card-mobile.png';
import { useFeatureCardIsHovered } from '../hooks/useFeatureCardIsHovered';
import '../scss/leverageCard.scss';
import type { FeatureCardRenderContext } from './FeatureCard';
import { useMedia } from 'react-use';

type DeepLiquidityProps = Partial<FeatureCardRenderContext>;

export default function DeepLiquidity({
  isHovered = false,
}: DeepLiquidityProps) {
  const showHovered = useFeatureCardIsHovered(isHovered);
  const isMobile = useMedia('(max-width: 767px)');
  return (
    <div
      className={`deep-liquidity-card-container ${showHovered ? 'is-hovered' : ''}`}
    >
      <img
        src={isMobile ? deepLiquidityCardMobile : deepLiquidityCard}
        alt="Deep Liquidity Card"
        className="deep-liquidity-card-image"
      />
      <MidPriceButton />
    </div>
  );
}

const MidPriceButton = () => {
  return (
    <div className="mid-price-button-container">
      <button className="mid-price-button">
        Mid Price
      </button>
    </div>
  );
};
