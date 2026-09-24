/**
 * FilterBox
 */

export interface TreeNode {
  key: string;
  
  label: string;
  
  value: string;
  
  children?: TreeNode[];
  
  disabled?: boolean;
  
  data?: Record<string, any>;
}

/**
 * FilterBox
 */
export interface FilterBoxProps {
  showSearch?: boolean;
  
  searchPlaceholder?: string;
  
  treeData: TreeNode[];
  
  selectedKeys?: string[];
  
  onChange?: (selectedKeys: string[]) => void;
  
  onSearch?: (searchTerm: string) => void;
  
  clearText?: string;
  
  maxHeight?: number | string;
}

export type CheckStatus = 'checked' | 'indeterminate' | 'unchecked';

export interface TreeNodeRenderProps {
  node: TreeNode;
  
  level: number;
  
  hasChildren: boolean;
  
  isExpanded: boolean;
  
  checkStatus: CheckStatus;
  
  onCheck: (node: TreeNode) => void;
  
  onToggleExpand: (key: string) => void;
}
export interface SearchConfig {
  searchTerm: string;
  
  caseSensitive?: boolean;
  
  matchFn?: (node: TreeNode, searchTerm: string) => boolean;
}

export interface TreeUtils {
  getAllChildKeys: (node: TreeNode) => string[];
  
  getAllDescendantKeys: (node: TreeNode) => string[];
  
  getCheckStatus: (node: TreeNode, selectedKeys: Set<string>) => CheckStatus;
  
  filterTreeNodes: (nodes: TreeNode[], searchTerm: string) => TreeNode[];
  
  getAllParentKeys: (nodes: TreeNode[]) => string[];
}

