import { useMedia } from 'react-use';

export function useFeatureCardIsHovered(isHovered = false) {
  const isXl = useMedia('(min-width: 1280px)');
  return isXl ? isHovered : true;
}
