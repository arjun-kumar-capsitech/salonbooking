import { useState, useEffect, useMemo, useRef } from 'react';
export const useDebounce = <T>(value: T, delay: number = 500): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay) as unknown as number;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
};

export const filterData = <T>(
  data: T[],
  searchText: string,
  fields: (keyof T)[]
): T[] => {
  if (!data || !Array.isArray(data)) {
    return [];
  }

  if (!searchText || searchText.trim() === '') {
    return data;
  }

  const searchLower = searchText.toLowerCase().trim();

  return data.filter((item) => {
    return fields.some((field) => {
      const value = item[field];
      if (value === null || value === undefined) {
        return false;
      }
      return String(value).toLowerCase().includes(searchLower);
    });
  });
};

export const useSearch = <T>(
  data: T[],
  searchFields: (keyof T)[],
  delay: number = 500
) => {
  const [searchText, setSearchText] = useState('');
  const debouncedSearchText = useDebounce(searchText, delay);

  const filteredData = useMemo(() => {
    return filterData(data, debouncedSearchText, searchFields);
  }, [data, debouncedSearchText, searchFields]);

  return {
    searchText,
    setSearchText,
    filteredData,
    debouncedSearchText,
    isSearching: searchText !== debouncedSearchText,
    clearSearch: () => setSearchText(''),
  };
};