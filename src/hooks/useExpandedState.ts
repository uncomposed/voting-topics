import { useState, useCallback } from 'react';

/**
 * Custom hook for managing expand/collapse state for multiple items
 * @param initialExpanded - Set of initially expanded item IDs
 * @returns Object with expanded state and control functions
 */
export const useExpandedState = (initialExpanded: Set<string> = new Set()) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(initialExpanded);

  const toggleExpanded = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  const toggleAllExpanded = useCallback((allItemIds: string[]) => {
    setExpandedItems(prev => {
      if (prev.size === allItemIds.length) {
        // All are expanded, collapse all
        return new Set();
      } else {
        // Some or none are expanded, expand all
        return new Set(allItemIds);
      }
    });
  }, []);

  const isExpanded = useCallback((itemId: string) => {
    return expandedItems.has(itemId);
  }, [expandedItems]);

  const expandItem = useCallback((itemId: string) => {
    setExpandedItems(prev => new Set([...prev, itemId]));
  }, []);

  const collapseItem = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  }, []);

  const expandAll = useCallback((allItemIds: string[]) => {
    setExpandedItems(new Set(allItemIds));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedItems(new Set());
  }, []);

  return {
    expandedItems,
    toggleExpanded,
    toggleAllExpanded,
    isExpanded,
    expandItem,
    collapseItem,
    expandAll,
    collapseAll,
    expandedCount: expandedItems.size
  };
};
