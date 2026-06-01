import { useAsyncSearch } from "@/composables/useAsyncSearch";
import { searchProducts } from "@/services/api/searchApi";
import type { Product } from "@/types/product";
import type { SearchParams } from "@/types/search";

type UseProductSearchOptions = {
  debounceMs?: number;
  cacheTtlMs?: number;
  defaultLimit?: number;
};

export function useProductSearch(options: UseProductSearchOptions = {}) {
  const defaultLimit = options.defaultLimit ?? 10;

  return useAsyncSearch<Product, SearchParams>({
    fetcher: searchProducts,

    debounceMs: options.debounceMs ?? 400,
    cacheTtlMs: options.cacheTtlMs ?? 30_000,

    defaultParams: {
      limit: defaultLimit,
    },

    normalizeQuery(query) {
      return query.trim().toLowerCase();
    },

    createCacheKey(params) {
      return `${params.query}::${params.limit ?? defaultLimit}`;
    },
  });
}
