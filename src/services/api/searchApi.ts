import { MOCK_PRODUCTS } from "@/mocks/products";
import type { SearchResponse } from "@/types/api";
import type { Product } from "@/types/product";
import type { SearchParams } from "@/types/search";

export function searchProducts(
  params: SearchParams,
  signal?: AbortSignal,
): Promise<SearchResponse<Product>> {
  const delay = 500 + Math.random() * 1000;

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      const filtered = MOCK_PRODUCTS.filter((p) => {
        return p.title.toLowerCase().includes(params.query.toLowerCase());
      });

      resolve({
        items: filtered,
        total: filtered.length,
      });
    }, delay);

    signal?.addEventListener("abort", () => {
      clearTimeout(timeoutId);
      reject(new DOMException("Request aborted", "AbortError"));
    });
  });
}
