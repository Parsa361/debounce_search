import type { SearchResponse } from "./api";

export interface SearchParams {
  query: string;
  limit?: number;
}

export type SearchStatus = "idle" | "loading" | "success" | "empty" | "error";

export interface SearchState<T> {
  status: SearchStatus;
  query: string;
  items: T[];
  total: number;
  errorMessage: string | null;
  fromCache: boolean;
}

export interface CachedSearchEntry<T> {
  data: SearchResponse<T>;
  timestamp: number;
}

export function createInitialSearchState<T>(): SearchState<T> {
  return {
    status: "idle",
    query: "",
    items: [],
    total: 0,
    errorMessage: null,
    fromCache: false,
  };
}
