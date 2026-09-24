import upLeverageCard from '@/img/new-landing/up-leverage-card.png';
import upLeverageCardBlack from '@/img/new-landing/up-leverage-card-black.png';
import upLeverageCardHover from '@/img/new-landing/up-leverage-card-hovered.png';
import upLeverageCardMobile from '@/img/new-landing/up-leverage-card-mobile.png';
import { useFeatureCardIsHovered } from '../hooks/useFeatureCardIsHovered';
import '../scss/leverageCard.scss';
import type { FeatureCardRenderContext } from './FeatureCard';
import { useMedia } from 'react-use';

type UpLeverageCardProps = Partial<FeatureCardRenderContext>;

export default function UpLeverageCard({
  isHovered = false,
}: UpLeverageCardProps) {
  const showHovered = useFeatureCardIsHovered(isHovered);
  const isMobile = useMedia('(max-width: 767px)');
  return (
    <div className={`up-leverage-card-container`}>
      <div
        className={`up-leverage-card-image-container ${showHovered ? 'is-hovered' : ''}`}
      >
        <img
          src={isMobile ? upLeverageCardMobile : upLeverageCardHover}
          alt="Leverage Card"
          className="up-leverage-card-image"
        />

        <img
          src={upLeverageCardBlack}
          alt="Leverage Card"
          className="up-leverage-card-image-black  "
        />
      </div>
    </div>
  );
}
