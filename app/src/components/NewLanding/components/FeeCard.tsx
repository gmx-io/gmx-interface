import '../scss/feeCard.scss';
import type { ReactNode } from 'react';
import { useFeatureCardIsHovered } from '../hooks/useFeatureCardIsHovered';
import type { FeatureCardRenderContext } from './FeatureCard';

type FeeCardProps = Partial<FeatureCardRenderContext>;

export default function FeeCard({ isHovered = false }: FeeCardProps) {
  const showHovered = useFeatureCardIsHovered(isHovered);

  return (
    <div
      className={`fee-card-container relative h-full ${showHovered ? 'is-hovered' : ''}`}
    >
      <div className="fee-card-scene">
        <FeeCardContent
          title="Network Fee"
          value="~ $0.0008"
          isNet={true}
          className="fee-card-network"
        />
        <FeeCardContent
          title="Open/Close Fee"
          value="↓ 0.004%"
          className="fee-card-open-close"
        />
      </div>
    </div>
  );
}
const FeeCardContent = ({
  title,
  value,
  isNet,
  className,
}: {
  title: ReactNode;
  value: string;
  isNet?: boolean;
  className?: string;
}) => {
  return (
    <div className={`fee-card ${className}`}>
      <div className="fee-card-title">{title}</div>
      <div
        className="fee-card-value "
        style={{ color: isNet ? '#535353' : '#FFF' }}
      >
        {value}
      </div>
    </div>
  );
};
