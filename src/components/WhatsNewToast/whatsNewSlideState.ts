export type SlideDirection = 1 | -1;

export type WhatsNewSlideState = {
  index: number;
  direction: SlideDirection;
};

export const INITIAL_SLIDE_STATE: WhatsNewSlideState = { index: 0, direction: 1 };

export function stepSlide(state: WhatsNewSlideState, step: SlideDirection, count: number): WhatsNewSlideState {
  if (count <= 1) return state;
  return { index: (state.index + step + count) % count, direction: step };
}

export function jumpToSlide(state: WhatsNewSlideState, index: number): WhatsNewSlideState {
  if (index === state.index) return state;
  return { index, direction: index > state.index ? 1 : -1 };
}
