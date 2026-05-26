import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAsyncSearch } from "../useAsyncSearch";
import type { SearchParams } from "@/types/search";
import type { SearchResponse } from "@/types/api";

type TestItem = {
  id: number;
  name: string;
};

describe("useAsyncSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("executes search after debounce delay", async () => {
    const mockResponse: SearchResponse<TestItem> = {
      items: [{ id: 1, name: "iPhone 15" }],
      total: 1,
    };

    const fetcher = vi.fn().mockResolvedValue(mockResponse);

    const search = useAsyncSearch<TestItem, SearchParams>({
      fetcher,
      debounceMs: 400,
    });

    search.setInputValue("iphone 15");
    search.scheduleSearch();

    expect(fetcher).not.toHaveBeenCalled();
    expect(search.state.value.status).toBe("idle");

    await vi.advanceTimersByTimeAsync(400);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(
      { query: "iphone 15" },
      expect.any(AbortSignal),
    );
    expect(search.state.value.status).toBe("success");
    expect(search.executedQuery.value).toBe("iphone 15");
  });

  it("debounces multiple rapid input changes", async () => {
    const mockResponse: SearchResponse<TestItem> = {
      items: [{ id: 1, name: "iPhone 15" }],
      total: 1,
    };

    const fetcher = vi.fn().mockResolvedValue(mockResponse);

    const search = useAsyncSearch<TestItem, SearchParams>({
      fetcher,
      debounceMs: 400,
    });

    search.setInputValue("old iphone");
    search.scheduleSearch();

    search.setInputValue("new iphone");
    search.scheduleSearch();

    search.setInputValue("iphone 15");
    search.scheduleSearch();

    expect(fetcher).not.toHaveBeenCalled();
    expect(search.executedQuery.value).toBe("");

    await vi.advanceTimersByTimeAsync(400);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(
      { query: "iphone 15" },
      expect.any(AbortSignal),
    );
    expect(search.executedQuery.value).toBe("iphone 15");
  });

  it("returns cached result without calling fetcher again", async () => {
    const mockResponse: SearchResponse<TestItem> = {
      items: [{ id: 1, name: "MacBook Pro" }],
      total: 1,
    };

    const fetcher = vi.fn().mockResolvedValue(mockResponse);

    const search = useAsyncSearch<TestItem, SearchParams>({
      fetcher,
      debounceMs: 400,
      cacheTtlMs: 30_000,
    });

    search.setInputValue("mac");
    search.scheduleSearch();

    await vi.advanceTimersByTimeAsync(400);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(search.state.value.fromCache).toBe(false);

    search.setInputValue("mac");
    search.scheduleSearch();

    await vi.advanceTimersByTimeAsync(400);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(search.state.value.fromCache).toBe(true);
    expect(search.state.value.status).toBe("success");
  });

  it("resets state when clear is called", () => {
    const fetcher = vi.fn();

    const search = useAsyncSearch<TestItem, SearchParams>({
      fetcher,
    });

    search.setInputValue("mac");
    search.scheduleSearch();

    search.clear();

    expect(search.inputValue.value).toBe("");
    expect(search.state.value.status).toBe("idle");
    expect(search.state.value.items).toEqual([]);
    expect(search.state.value.total).toBe(0);
    expect(search.state.value.errorMessage).toBeNull();
  });

  it("sets empty state when result has no items", async () => {
    const mockResponse: SearchResponse<TestItem> = {
      items: [],
      total: 0,
    };

    const fetcher = vi.fn().mockResolvedValue(mockResponse);

    const search = useAsyncSearch<TestItem, SearchParams>({
      fetcher,
      debounceMs: 400,
    });

    search.setInputValue("something-not-found");
    search.scheduleSearch();

    await vi.advanceTimersByTimeAsync(400);

    expect(search.state.value.status).toBe("empty");
    expect(search.state.value.items).toEqual([]);
    expect(search.state.value.total).toBe(0);
  });

  it("sets error state when fetcher rejects", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("Network error"));

    const search = useAsyncSearch<TestItem, SearchParams>({
      fetcher,
      debounceMs: 400,
    });

    search.setInputValue("iphone");
    search.scheduleSearch();

    await vi.advanceTimersByTimeAsync(400);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(search.state.value.status).toBe("error");
    expect(search.state.value.errorMessage).toBe("Network error");
    expect(search.executedQuery.value).toBe("iphone");
  });

  it("ignores stale responses and keeps latest result", async () => {
    let resolveFirst!: (value: SearchResponse<TestItem>) => void;
    let resolveSecond!: (value: SearchResponse<TestItem>) => void;

    const firstPromise = new Promise<SearchResponse<TestItem>>((resolve) => {
      resolveFirst = resolve;
    });

    const secondPromise = new Promise<SearchResponse<TestItem>>((resolve) => {
      resolveSecond = resolve;
    });

    const fetcher = vi
      .fn()
      .mockReturnValueOnce(firstPromise)
      .mockReturnValueOnce(secondPromise);

    const search = useAsyncSearch<TestItem, SearchParams>({
      fetcher,
      debounceMs: 400,
    });

    search.setInputValue("ip");
    search.scheduleSearch();
    await vi.advanceTimersByTimeAsync(400);

    search.setInputValue("iphone");
    search.scheduleSearch();
    await vi.advanceTimersByTimeAsync(400);

    expect(fetcher).toHaveBeenCalledTimes(2);

    resolveSecond({
      items: [{ id: 2, name: "iPhone 15" }],
      total: 1,
    });
    await Promise.resolve();

    expect(search.state.value.status).toBe("success");
    expect(search.state.value.items).toEqual([{ id: 2, name: "iPhone 15" }]);
    expect(search.executedQuery.value).toBe("iphone");

    resolveFirst({
      items: [{ id: 1, name: "Old iPad" }],
      total: 1,
    });
    await Promise.resolve();

    expect(search.state.value.items).toEqual([{ id: 2, name: "iPhone 15" }]);
    expect(search.executedQuery.value).toBe("iphone");
  });

  it("aborts previous in-flight request when a new search starts", async () => {
    const abortedSignals: AbortSignal[] = [];

    const fetcher = vi.fn(
      (params: SearchParams, signal?: AbortSignal) =>
        new Promise<SearchResponse<TestItem>>((resolve, reject) => {
          signal?.addEventListener(
            "abort",
            () => {
              abortedSignals.push(signal);
              reject(new DOMException("Aborted", "AbortError"));
            },
            { once: true },
          );

          setTimeout(() => {
            resolve({
              items: [{ id: 1, name: params.query }],
              total: 1,
            });
          }, 1000);
        }),
    );

    const search = useAsyncSearch<TestItem, SearchParams>({
      fetcher,
      debounceMs: 400,
    });

    search.setInputValue("iphone");
    search.scheduleSearch();
    await vi.advanceTimersByTimeAsync(400);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(search.state.value.status).toBe("loading");

    search.setInputValue("mac");
    search.scheduleSearch();
    await vi.advanceTimersByTimeAsync(400);

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(abortedSignals.length).toBe(1);

    await vi.advanceTimersByTimeAsync(1000);

    expect(search.executedQuery.value).toBe("mac");
    expect(search.state.value.items).toEqual([{ id: 1, name: "mac" }]);
  });
});
