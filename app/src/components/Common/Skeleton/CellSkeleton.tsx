import React from 'react';

// Shimmer placeholder for a single value/cell while its data is loading.
// Relies on the global `skeleton-shimmer` keyframe defined in styles/animations.scss.
const CellSkeleton: React.FC<{
  width?: string | number;
  height?: string | number;
  radius?: string | number;
  as?: 'div' | 'span';
}> = ({ width = '100%', height = 16, radius = '6px', as = 'div' }) => {
  const Component = as;

  return (
    <Component
      style={{
        display: 'block',
        width,
        height,
        background: 'linear-gradient(90deg, #323232 0%, #535353 93%)',
        backgroundSize: '400% 100%',
        borderRadius: radius,
        animation: 'skeleton-shimmer 1.2s ease-in-out infinite',
      }}
    />
  );
};

export default CellSkeleton;
