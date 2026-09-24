import transparentCard from '@/img/new-landing/transparent-card2.png';
import { useFeatureCardIsHovered } from '../hooks/useFeatureCardIsHovered';
import '../scss/leverageCard.scss';
import type { FeatureCardRenderContext } from './FeatureCard';

type TransparentProps = Partial<FeatureCardRenderContext>;

export default function Transparent({ isHovered = false }: TransparentProps) {
  const showHovered = useFeatureCardIsHovered(isHovered);

  return (
    <div
      className={`transparent-card-container ${showHovered ? 'is-hovered' : ''}`}
    >
      <img
        src={transparentCard}
        alt="Transparent Card"
        className="transparent-card-image"
      />
    </div>
  );
}
