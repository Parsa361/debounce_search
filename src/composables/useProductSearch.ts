import { computed, onBeforeUnmount, ref } from "vue";
import { searchProducts } from "@/services/api/searchApi";
import { createInitialSearchState } from "@/types/search";
import type {
  SearchParams,
  SearchState,
  CachedSearchEntry,
} from "@/types/search";
import type { Product } from "@/types/product";

type UseProductSearchOptions = {
  debounceMs?: number;
  cacheTtlMs?: number;
  defaultLimit?: number;
};

function normalizeQuery(input: string): string {
  return input.trim().toLowerCase();
}

function createCacheKey(params: SearchParams, fallbackLimit: number): string {
  const normalizedQuery = normalizeQuery(params.query);
  const limit = params.limit ?? fallbackLimit;
  return `${normalizedQuery}::${limit}`;
}

export function useProductSearch(options: UseProductSearchOptions = {}) {
  const debounceMs = options.debounceMs ?? 400;
  const cacheTtlMs = options.cacheTtlMs ?? 30_000;
  const defaultLimit = options.defaultLimit ?? 10;

  const inputValue = ref("");
  const state = ref<SearchState<Product>>(createInitialSearchState<Product>());

  const cache = new Map<string, CachedSearchEntry<Product>>();

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let currentController: AbortController | null = null;
  let activeRequestId = 0;

  const isLoading = computed(() => state.value.status === "loading");
  const hasResults = computed(() => state.value.items.length > 0);
  const executedQuery = computed(() => state.value.query);

  function isCacheFresh(entry: CachedSearchEntry<Product>): boolean {
    return Date.now() - entry.timestamp < cacheTtlMs;
  }

  function clearDebounceTimer() {
    if (!debounceTimer) return;
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  function abortActiveRequest() {
    if (!currentController) return;
    currentController.abort();
    currentController = null;
  }

  function setLoadingState(query: string) {
    state.value = {
      ...state.value,
      status: "loading",
      query,
      errorMessage: null,
      fromCache: false,
    };
  }

  function setSuccessState(
    query: string,
    items: Product[],
    total: number,
    fromCache: boolean,
  ) {
    state.value = {
      status: items.length === 0 ? "empty" : "success",
      query,
      items,
      total,
      errorMessage: null,
      fromCache,
    };
  }

  function setErrorState(query: string, message: string) {
    state.value = {
      ...state.value,
      status: "error",
      query,
      errorMessage: message,
      fromCache: false,
    };
  }

  async function executeSearch(params: SearchParams) {
    const normalizedQuery = normalizeQuery(params.query);
    const finalParams: SearchParams = {
      query: normalizedQuery,
      limit: params.limit ?? defaultLimit,
    };

    if (!normalizedQuery) {
      state.value = createInitialSearchState<Product>();
      return;
    }

    const cacheKey = createCacheKey(finalParams, defaultLimit);
    const cachedEntry = cache.get(cacheKey);

    if (cachedEntry && isCacheFresh(cachedEntry)) {
      setSuccessState(
        params.query,
        cachedEntry.data.items,
        cachedEntry.data.total,
        true,
      );
      return;
    }

    abortActiveRequest();

    const controller = new AbortController();
    currentController = controller;
    const requestId = ++activeRequestId;

    setLoadingState(params.query);

    try {
      const response = await searchProducts(finalParams, controller.signal);

      if (requestId !== activeRequestId) {
        return;
      }

      cache.set(cacheKey, {
        data: response,
        timestamp: Date.now(),
      });

      setSuccessState(params.query, response.items, response.total, false);
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      if (requestId !== activeRequestId) {
        return;
      }

      const message =
        error instanceof Error ? error.message : "Unexpected search error";

      setErrorState(params.query, message);
    }
  }

  function scheduleSearch(params?: Partial<SearchParams>) {
    clearDebounceTimer();

    const query = params?.query ?? inputValue.value;
    const limit = params?.limit ?? defaultLimit;

    debounceTimer = setTimeout(() => {
      void executeSearch({ query, limit });
    }, debounceMs);
  }

  function retry() {
    if (!executedQuery.value.trim()) return;
    void executeSearch({
      query: executedQuery.value,
      limit: defaultLimit,
    });
  }

  function clear() {
    clearDebounceTimer();
    abortActiveRequest();
    activeRequestId++;

    inputValue.value = "";
    state.value = createInitialSearchState<Product>();
  }

  function cleanup() {
    clearDebounceTimer();
    abortActiveRequest();
    activeRequestId++;
  }

  onBeforeUnmount(() => {
    cleanup();
  });

  return {
    inputValue,
    executedQuery,
    state,
    isLoading,
    hasResults,
    scheduleSearch,
    retry,
    clear,
    cleanup,
  };
}
