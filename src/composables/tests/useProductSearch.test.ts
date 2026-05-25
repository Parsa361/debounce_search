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
    vi.restoreAllMocks();
  });

  it("should execute search after debounce delay", async () => {
    const mockResponse = {
      items: [{ id: 1, title: "iPhone", price: 999 }],
      total: 1,
    } as SearchResponse<Product>;

    vi.spyOn(api, "searchProducts").mockResolvedValue(mockResponse);

    const search = useProductSearch({
      debounceMs: 400,
    });

    search.scheduleSearch({ query: "iphone 15" });

    expect(api.searchProducts).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);

    await Promise.resolve();

    expect(api.searchProducts).toHaveBeenCalledTimes(1);
  });
});
