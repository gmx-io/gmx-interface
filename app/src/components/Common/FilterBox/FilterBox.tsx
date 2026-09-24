import { ReactNode, useEffect, useMemo, useState } from 'react';
import { t } from '@lingui/macro';
import SearchIconComponent from '@/img/search.svg?react';
import closeIcons from '@/img/header/close.svg';
import './FilterBox.scss';

export interface TreeNode {
  key: string;
  label: string | ReactNode;
  value: string;
  children?: TreeNode[];
  disabled?: boolean;
  searchValue?: string;
}

interface FilterBoxProps {
  showSearch?: boolean;
  searchPlaceholder?: string;
  treeData: TreeNode[];
  selectedKeys?: string[];
  onChange?: (selectedKeys: string[]) => void;
  onSearch?: (searchTerm: string) => void;
  clearText?: string;
  maxHeight?: number | string;
}

function FilterBox({
  showSearch = true,
  searchPlaceholder = 'Search Action',
  treeData,
  selectedKeys = [],
  onChange,
  onSearch,
  clearText,
  maxHeight = '40rem',
}: FilterBoxProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedKeys));

  useEffect(() => {
    setSelected(new Set(selectedKeys));
  }, [selectedKeys]);

  useEffect(() => {
    if (onSearch) {
      onSearch(searchTerm);
    }
  }, [searchTerm, onSearch]);

  const filteredTreeData = useMemo(() => {
    if (!searchTerm) return treeData;

    const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.reduce<TreeNode[]>((acc, node) => {
        const searchText =
          node.searchValue ||
          (typeof node.label === 'string' ? node.label : '');
        const matchesSearch = searchText
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        const filteredChildren = node.children
          ? filterNodes(node.children)
          : [];

        if (matchesSearch || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children:
              filteredChildren.length > 0 ? filteredChildren : node.children,
          });
        }

        return acc;
      }, []);
    };

    return filterNodes(treeData);
  }, [treeData, searchTerm]);

  const getAllChildKeys = (node: TreeNode): string[] => {
    const keys: string[] = [node.key];
    if (node.children) {
      node.children.forEach((child) => {
        keys.push(...getAllChildKeys(child));
      });
    }
    return keys;
  };

  const getAllDescendantKeys = (node: TreeNode): string[] => {
    const keys: string[] = [];
    if (node.children) {
      node.children.forEach((child) => {
        keys.push(child.key);
        keys.push(...getAllDescendantKeys(child));
      });
    }
    return keys;
  };

  const getCheckStatus = (
    node: TreeNode
  ): 'checked' | 'indeterminate' | 'unchecked' => {
    const childKeys = getAllDescendantKeys(node);
    if (childKeys.length === 0) {
      return selected.has(node.key) ? 'checked' : 'unchecked';
    }

    const checkedCount = childKeys.filter((key) => selected.has(key)).length;
    if (checkedCount === 0 && !selected.has(node.key)) {
      return 'unchecked';
    } else if (checkedCount === childKeys.length) {
      return 'checked';
    } else {
      return 'indeterminate';
    }
  };

  const handleCheck = (node: TreeNode) => {
    if (node.disabled) return;

    const newSelected = new Set(selected);
    const allKeys = getAllChildKeys(node);
    const checkStatus = getCheckStatus(node);

    if (checkStatus === 'checked') {
      allKeys.forEach((key) => newSelected.delete(key));
    } else {
      allKeys.forEach((key) => newSelected.add(key));
    }

    setSelected(newSelected);
    onChange?.(Array.from(newSelected));
  };

  const handleClearSelection = () => {
    setSelected(new Set());
    onChange?.([]);
  };

  const renderTreeNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const checkStatus = getCheckStatus(node);

    return (
      <div key={node.key} className="filter-tree-node">
        <div
          className={`filter-tree-node-content ${node.disabled ? 'disabled' : ''}`}
          style={{ paddingLeft: `calc(1.6rem + ${level * 2}rem)` }}
        >
          <div className="filter-tree-node-checkbox-wrapper">
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={checkStatus === 'checked'}
                ref={(input) => {
                  if (input) {
                    input.indeterminate = checkStatus === 'indeterminate';
                  }
                }}
                onChange={() => handleCheck(node)}
                disabled={node.disabled}
              />
              <span className="checkmark"></span>
              <span className="filter-tree-node-label">{node.label}</span>
            </label>
          </div>
        </div>
        {hasChildren && node.children && (
          <div className="filter-tree-node-children">
            {node.children.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="filter-box">
      {showSearch && (
        <div className="filter-box-search">
          <div className="filter-box-search-wrapper">
            <SearchIconComponent className="filter-box-search-icon" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="filter-box-search-input"
            />
            {searchTerm && (
              <div
                className="filter-box-search-clear"
                onClick={() => setSearchTerm('')}
              >
                <img src={closeIcons} alt="clear" width="14" height="14" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* {selected.size > 0 && ( */}
        <div className="filter-box-clear-section">
          <button
            className="filter-box-clear-button"
            onClick={handleClearSelection}
          >
            {clearText || t`CLEAR SELECTION`}
          </button>
        </div>
      {/* )} */}

      <div
        className="filter-box-tree"
        style={{
          maxHeight:
            typeof maxHeight === 'number' ? `${maxHeight}rem` : maxHeight,
        }}
      >
        {filteredTreeData.length > 0 ? (
          filteredTreeData.map((node) => renderTreeNode(node))
        ) : (
          <div className="filter-box-empty">{t`No results found`}</div>
        )}
      </div>
    </div>
  );
}

export default FilterBox;
