import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useProductSearch } from "../useProductSearch";
import * as api from "@/services/api/searchApi";
import type { Product } from "@/types/product";
import type { SearchResponse } from "@/types/api";

vi.mock("@/services/api/searchApi");

describe("useProductSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should execute search after debounce delay", async () => {
    const mockResponse = {
      items: [{ id: 1, title: "iPhone", price: 999 }],
      total: 1,
    } as SearchResponse<Product>;

    vi.mocked(api.searchProducts).mockResolvedValue(mockResponse);

    const search = useProductSearch({
      debounceMs: 400,
    });

    search.scheduleSearch({ query: "iphone 15" });

    expect(api.searchProducts).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);

    await Promise.resolve();

    expect(api.searchProducts).toHaveBeenCalledTimes(1);
  });

  it("should debounce multiple rapid searches", async () => {
    const mockResponse = {
      items: [],
      total: 0,
    } as SearchResponse<Product>;

    vi.mocked(api.searchProducts).mockResolvedValue(mockResponse);

    const search = useProductSearch({
      debounceMs: 400,
    });

    search.scheduleSearch({ query: "old iphone" });
    search.scheduleSearch({ query: "new iphone" });
    search.scheduleSearch({ query: "iphone 15" });

    expect(api.searchProducts).not.toHaveBeenCalled();
    expect(search.executedQuery.value).toBe("");

    vi.advanceTimersByTime(400);

    await Promise.resolve();

    expect(api.searchProducts).toHaveBeenCalledTimes(1);
    expect(search.executedQuery.value).toBe("iphone 15");
  });

  it("should return cached result", async () => {
    const mockResponse = {
      items: [{ id: 1, title: "MacBook", price: 1999 }],
      total: 1,
    } as SearchResponse<Product>;

    vi.mocked(api.searchProducts).mockResolvedValue(mockResponse);

    const search = useProductSearch({
      debounceMs: 400,
      cacheTtlMs: 30000,
    });

    search.scheduleSearch({ query: "mac" });

    vi.advanceTimersByTime(400);
    await Promise.resolve();

    expect(api.searchProducts).toHaveBeenCalledTimes(1);

    search.scheduleSearch({ query: "mac" });

    vi.advanceTimersByTime(400);
    await Promise.resolve();

    expect(api.searchProducts).toHaveBeenCalledTimes(1);
  });

  it("should cancel previous request when new search starts", async () => {
    const mockResponse = {
      items: [],
      total: 0,
    } as SearchResponse<Product>;

    vi.mocked(api.searchProducts).mockResolvedValue(mockResponse);

    const search = useProductSearch({
      debounceMs: 400,
    });

    search.scheduleSearch({ query: "iphone" });

    vi.advanceTimersByTime(200);

    search.scheduleSearch({ query: "mac" });

    vi.advanceTimersByTime(400);

    await Promise.resolve();

    expect(api.searchProducts).toHaveBeenCalledTimes(1);
  });

  it("should reset state when clear is called", () => {
    const search = useProductSearch();

    search.scheduleSearch({ query: "mac" });

    search.clear();

    expect(search.inputValue.value).toBe("");
    expect(search.state.value.status).toBe("idle");
  });
});
