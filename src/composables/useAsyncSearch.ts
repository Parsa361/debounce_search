import { computed, onBeforeUnmount, ref } from "vue";
import {
  createInitialSearchState,
  type CachedSearchEntry,
  type SearchParams,
  type SearchState,
} from "@/types/search";
import type { SearchResponse } from "@/types/api";

type AsyncSearchFetcher<TItem, TParams extends SearchParams> = (
  params: TParams,
  signal?: AbortSignal,
) => Promise<SearchResponse<TItem>>;

type UseAsyncSearchOptions<TItem, TParams extends SearchParams> = {
  fetcher: AsyncSearchFetcher<TItem, TParams>;
  debounceMs?: number;
  cacheTtlMs?: number;
  defaultParams?: Partial<TParams>;
  normalizeQuery?: (query: string) => string;
  createCacheKey?: (params: TParams) => string;
};

function defaultNormalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function useAsyncSearch<TItem, TParams extends SearchParams>(
  options: UseAsyncSearchOptions<TItem, TParams>,
) {
  const debounceMs = options.debounceMs ?? 400;
  const cacheTtlMs = options.cacheTtlMs ?? 30_000;
  const normalizeQuery = options.normalizeQuery ?? defaultNormalizeQuery;

  const inputValue = ref("");
  const state = ref<SearchState<TItem>>(createInitialSearchState<TItem>());

  const cache = new Map<string, CachedSearchEntry<TItem>>();

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let currentController: AbortController | null = null;
  let activeRequestId = 0;

  const isLoading = computed(() => state.value.status === "loading");
  const hasResults = computed(() => state.value.items.length > 0);
  const executedQuery = computed(() => state.value.query);

  function createCacheKey(params: TParams): string {
    if (options.createCacheKey) {
      return options.createCacheKey(params);
    }

    return JSON.stringify(params);
  }

  function isCacheFresh(entry: CachedSearchEntry<TItem>): boolean {
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

  function setInputValue(value: string) {
    inputValue.value = value;
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
    items: TItem[],
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

  function buildFinalParams(params?: Partial<TParams>): TParams {
    const query = params?.query ?? inputValue.value;

    return {
      ...options.defaultParams,
      ...params,
      query: normalizeQuery(query),
    } as TParams;
  }

  async function executeSearch(params?: Partial<TParams>) {
    const finalParams = buildFinalParams(params);
    const normalizedQuery = finalParams.query;

    if (!normalizedQuery) {
      state.value = createInitialSearchState<TItem>();
      return;
    }

    const cacheKey = createCacheKey(finalParams);
    const cachedEntry = cache.get(cacheKey);

    if (cachedEntry && isCacheFresh(cachedEntry)) {
      setSuccessState(
        normalizedQuery,
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

    setLoadingState(normalizedQuery);

    try {
      const response = await options.fetcher(finalParams, controller.signal);

      if (requestId !== activeRequestId) {
        return;
      }

      cache.set(cacheKey, {
        data: response,
        timestamp: Date.now(),
      });

      setSuccessState(normalizedQuery, response.items, response.total, false);
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      if (requestId !== activeRequestId) {
        return;
      }

      const message =
        error instanceof Error ? error.message : "Unexpected search error";

      setErrorState(normalizedQuery, message);
    }
  }

  function scheduleSearch(params?: Partial<TParams>) {
    clearDebounceTimer();

    debounceTimer = setTimeout(() => {
      void executeSearch(params);
    }, debounceMs);
  }

  function retry() {
    if (!executedQuery.value.trim()) return;

    void executeSearch({
      query: executedQuery.value,
    } as Partial<TParams>);
  }

  function clear() {
    clearDebounceTimer();
    abortActiveRequest();
    activeRequestId++;

    inputValue.value = "";
    state.value = createInitialSearchState<TItem>();
  }

  function cleanup() {
    clearDebounceTimer();
    abortActiveRequest();
    activeRequestId++;
  }

  function clearCache() {
    cache.clear();
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

    setInputValue,
    scheduleSearch,
    retry,
    clear,
    cleanup,
    clearCache,
  };
}
