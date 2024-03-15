export type Item<T> = {
  /**
   * Localized item name
   */
  text: string;
  data: T;
};

export type Group<T> = {
  /**
   * Localized group name
   */
  groupName: string;
  items: Item<T>[];
};

export type FilteredGroup<T> = {
  groupName: string;
  isEverythingSelected?: boolean;
  isEverythingFilteredSelected?: boolean;
  isSomethingSelected?: boolean;
  items: Item<T>[];
};
