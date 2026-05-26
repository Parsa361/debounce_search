import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useProductSearch } from "../useProductSearch";
import * as api from "@/services/api/searchApi";
import type { Product } from "@/types/product";
import type { SearchResponse } from "@/types/api";

vi.mock("@/services/api/searchApi", () => ({
  searchProducts: vi.fn(),
}));

describe("useProductSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("calls searchProducts with normalized query and default limit", async () => {
    const mockResponse: SearchResponse<Product> = {
      items: [
        {
          id: 1,
          title: "iPhone 15",
          price: 999,
          description: "Phone",
          category: "electronics",
          rating: 10,
          thumbnail: "iphone.jpg",
        },
      ],
      total: 1,
    };

    vi.mocked(api.searchProducts).mockResolvedValue(mockResponse);

    const search = useProductSearch({
      debounceMs: 400,
      defaultLimit: 10,
    });

    search.setInputValue("  IPHONE 15 ");
    search.scheduleSearch();

    await vi.advanceTimersByTimeAsync(400);

    expect(api.searchProducts).toHaveBeenCalledTimes(1);
    expect(api.searchProducts).toHaveBeenCalledWith(
      {
        query: "iphone 15",
        limit: 10,
      },
      expect.any(AbortSignal),
    );
  });

  it("uses cache for same normalized query and limit", async () => {
    const mockResponse: SearchResponse<Product> = {
      items: [
        {
          id: 1,
          title: "MacBook Pro",
          price: 1999,
          description: "Laptop",
          category: "electronics",
          thumbnail: "macbook.jpg",
          rating: 10,
        },
      ],
      total: 1,
    };

    vi.mocked(api.searchProducts).mockResolvedValue(mockResponse);

    const search = useProductSearch({
      debounceMs: 400,
      cacheTtlMs: 30_000,
      defaultLimit: 10,
    });

    search.setInputValue("  MAC ");
    search.scheduleSearch();
    await vi.advanceTimersByTimeAsync(400);

    search.setInputValue("mac");
    search.scheduleSearch();
    await vi.advanceTimersByTimeAsync(400);

    expect(api.searchProducts).toHaveBeenCalledTimes(1);
    expect(search.state.value.fromCache).toBe(true);
  });
});
