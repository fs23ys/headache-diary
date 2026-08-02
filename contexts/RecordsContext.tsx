'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import type { HeadacheRecord } from '@/types';

interface CacheEntry {
  records: HeadacheRecord[];
  fetchedAt: number;
}

interface RecordsContextValue {
  getCache: (key: string) => CacheEntry | undefined;
  setCache: (key: string, records: HeadacheRecord[]) => void;
  invalidate: (key: string) => void;
}

const RecordsContext = createContext<RecordsContextValue>({
  getCache: () => undefined,
  setCache: () => {},
  invalidate: () => {},
});

export function RecordsProvider({ children }: { children: React.ReactNode }) {
  const [cache, setCache] = useState<Record<string, CacheEntry>>({});

  const getCache = useCallback((key: string) => cache[key], [cache]);

  const setCacheEntry = useCallback((key: string, records: HeadacheRecord[]) => {
    setCache(prev => ({ ...prev, [key]: { records, fetchedAt: Date.now() } }));
  }, []);

  const invalidate = useCallback((key: string) => {
    setCache(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  return (
    <RecordsContext.Provider value={{ getCache, setCache: setCacheEntry, invalidate }}>
      {children}
    </RecordsContext.Provider>
  );
}

export const useRecordsCache = () => useContext(RecordsContext);
