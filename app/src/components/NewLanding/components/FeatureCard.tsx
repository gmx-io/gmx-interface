import {
  cloneElement,
  isValidElement,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useFeatureCardIsHovered } from '../hooks/useFeatureCardIsHovered';
import '../scss/featureCard.scss';

export type FeatureCardRenderContext = {
  isHovered: boolean;
};

type FeatureCardProps = {
  title: ReactNode;
  description: ReactNode;
  className?: string;
  children?: ReactNode | ((context: FeatureCardRenderContext) => ReactNode);
};

export default function FeatureCard({
  title,
  description,
  children,
  className = '',
}: FeatureCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const effectiveIsHovered = useFeatureCardIsHovered(isHovered);
  const context: FeatureCardRenderContext = { isHovered: effectiveIsHovered };

  const renderChildren = () => {
    if (!children) {
      return null;
    }

    if (typeof children === 'function') {
      return children(context);
    }

    if (isValidElement(children)) {
      return cloneElement(
        children as ReactElement<Partial<FeatureCardRenderContext>>,
        context
      );
    }

    return children;
  };

  return (
    <div
      className={`max-w-auto flex aspect-[327/100] w-full flex-row overflow-hidden rounded-[1.6rem] 
        border border-white/10 bg-[rgba(30,30,30,0.8)] transition-opacity 
        duration-500 md:aspect-auto md:h-[30rem] md:max-w-[24.8rem] md:flex-col 
        ${effectiveIsHovered ? 'opacity-100' : 'opacity-50'} ${className} rwa-card-bg`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="md:flex-unset relative h-full min-h-0 flex-1 shrink-0 md:h-auto">
        {renderChildren()}
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-[0.6rem] overflow-hidden px-[2.3rem] pb-[2.4rem] pt-[1.6rem] md:flex-none md:justify-start md:gap-[1.6rem]">
        <h3 className="text-[1.2rem] font-normal leading-normal tracking-[-0.02rem] text-white md:text-[2rem]">
          {title}
        </h3>
        <span className="text-[1rem] font-light leading-[1.5] tracking-[-0.014rem] text-white md:text-[1.4rem]">
          {description}
        </span>
      </div>
    </div>
  );
}
