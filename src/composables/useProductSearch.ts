import { ref, computed } from "vue";
import type { Product } from "@/types/product";
import type {
  SearchParams,
  SearchState,
  CachedSearchEntry,
} from "@/types/search";
import { createInitialSearchState } from "@/types/search";
import { searchProducts } from "@/services/api/searchApi";

type UseProductSearchOptions = {
  debounceMs?: number;
  cacheTtlMs?: number;
  defaultLimit?: number;
};

export function useProductSearch(options: UseProductSearchOptions = {}) {
  const debounceMs = options.debounceMs ?? 400;
  const cacheTtlMs = options.cacheTtlMs ?? 30_000;
  const defaultLimit = options.defaultLimit ?? 10;

  const state = ref<SearchState<Product>>(createInitialSearchState<Product>());
  const query = ref("");

  const cache = new Map<string, CachedSearchEntry<Product>>();

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let currentController: AbortController | null = null;
  let requestSeq = 0;

  const hasResults = computed(() => state.value.items.length > 0);
  const isLoading = computed(() => state.value.status === "loading");

  function normalizeQuery(input: string) {
    return input.trim().toLowerCase();
  }

  function getCacheKey(params: SearchParams) {
    const normalized = normalizeQuery(params.query);
    return `${normalized}::${params.limit ?? defaultLimit}`;
  }

  function isCacheValid(entry: CachedSearchEntry<Product>) {
    return Date.now() - entry.timestamp < cacheTtlMs;
  }

  function applySuccess(
    params: SearchParams,
    items: Product[],
    total: number,
    fromCache: boolean,
  ) {
    state.value = {
      status: items.length === 0 ? "empty" : "success",
      query: params.query,
      items,
      total,
      errorMessage: null,
      fromCache,
    };
  }

  function applyError(params: SearchParams, message: string) {
    state.value = {
      ...state.value,
      status: "error",
      query: params.query,
      errorMessage: message,
      fromCache: false,
    };
  }

  async function executeSearch(params: SearchParams) {
    const normalizedQuery = normalizeQuery(params.query);

    if (!normalizedQuery) {
      state.value = createInitialSearchState<Product>();
      return;
    }

    const cacheKey = getCacheKey(params);
    const cached = cache.get(cacheKey);

    if (cached && isCacheValid(cached)) {
      const { items, total } = cached.data;
      applySuccess(params, items, total, true);
      return;
    }

    if (currentController) {
      currentController.abort();
    }

    const controller = new AbortController();
    currentController = controller;
    const seq = ++requestSeq;

    state.value = {
      ...state.value,
      status: "loading",
      query: params.query,
      errorMessage: null,
      fromCache: false,
    };

    try {
      const response = await searchProducts(
        {
          query: normalizedQuery,
          limit: params.limit ?? defaultLimit,
        },
        controller.signal,
      );

      if (seq !== requestSeq) return;

      cache.set(cacheKey, {
        data: response,
        timestamp: Date.now(),
      });

      applySuccess(params, response.items, response.total, false);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (seq !== requestSeq) return;

      applyError(
        params,
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  function search(params: SearchParams) {
    query.value = params.query;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      void executeSearch(params);
    }, debounceMs);
  }

  function clear() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    if (currentController) {
      currentController.abort();
      currentController = null;
    }

    requestSeq++;
    state.value = createInitialSearchState<Product>();
    query.value = "";
  }

  function retry() {
    if (!query.value.trim()) return;
    void executeSearch({ query: query.value, limit: defaultLimit });
  }

  return {
    state,
    query,
    hasResults,
    isLoading,
    search,
    clear,
    retry,
  };
}
