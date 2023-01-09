export function addByKey<T>(state: { [key: string]: T }, key: string, data: T) {
  return { ...state, [key]: data };
}

export function updateByKey<T>(state: { [key: string]: T }, key: string, data: Partial<T>) {
  if (!state[key]) return state;

  return { ...state, [key]: { ...state[key], ...data } };
}
