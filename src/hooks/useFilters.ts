import { useState, useCallback } from 'react';

export interface FilterState {
  topicFilter: 'all' | 'added' | 'removed' | 'modified' | 'unchanged';
  directionFilter: 'all' | 'added' | 'removed' | 'modified' | 'unchanged';
  magnitudeFilter: 'all' | 'high_diff' | 'high_rating';
}

export interface DirectionsFilterState {
  topicFilter: 'all' | 'similar' | 'different' | 'missing';
  directionFilter: 'all' | 'matching' | 'most_different' | 'highest_rated';
  magnitudeFilter: 'all' | 'high_diff' | 'high_rating';
}

/**
 * Custom hook for managing filter state with type safety
 */
export const useFilters = (initialFilters: FilterState = {
  topicFilter: 'all',
  directionFilter: 'all',
  magnitudeFilter: 'all'
}) => {
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  const updateFilter = useCallback(<K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  return {
    filters,
    updateFilter,
    resetFilters,
    setFilters
  };
};

/**
 * Custom hook for managing directions-specific filter state
 */
export const useDirectionsFilters = (initialFilters: DirectionsFilterState = {
  topicFilter: 'all',
  directionFilter: 'all',
  magnitudeFilter: 'all'
}) => {
  const [filters, setFilters] = useState<DirectionsFilterState>(initialFilters);

  const updateFilter = useCallback(<K extends keyof DirectionsFilterState>(
    key: K,
    value: DirectionsFilterState[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  return {
    filters,
    updateFilter,
    resetFilters,
    setFilters
  };
};
