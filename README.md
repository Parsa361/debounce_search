# Vue 3 Async Product Search

A debounced async product search built with Vue 3, TypeScript, Vite, and Vitest.

This project demonstrates a production-minded approach to frontend async workflows, including request cancellation, caching, race condition protection, and reusable composable architecture.

## Features

- Debounced search input
- Request cancellation with `AbortController`
- In-memory cache with TTL
- Stale response protection
- Explicit async states: `idle`, `loading`, `success`, `empty`, `error`
- Generic reusable search composable
- Product-specific wrapper composable
- Unit tests with Vitest and fake timers
- Mock API with realistic async behavior

## Tech Stack

- Vue 3
- TypeScript
- Vite
- Vitest
- Vue Test Utils
- JSDOM

## Architecture
```txt
ProductSearch.vue
  ↓
useProductSearch()
  ↓
useAsyncSearch<TItem, TParams>()
  ↓
searchProducts()
  ↓
mock products

### Main Layers

- `ProductSearch.vue` — UI and user interaction
- `useProductSearch.ts` — product-specific search wrapper
- `useAsyncSearch.ts` — reusable async search engine
- `searchApi.ts` — mock API with delay and cancellation support
- `types/*` — shared TypeScript models

## Folder Structure

txt
src/
  components/
search/
ProductCard.vue
ProductSearch.vue

  composables/
useAsyncSearch.ts
useProductSearch.ts
__tests__/
useAsyncSearch.spec.ts
useProductSearch.spec.ts

  services/
api/
searchApi.ts

  mocks/
products.ts

  types/
product.ts
search.ts

## Key Concepts

### Debounce

Prevents sending a request on every keystroke.

### Cancellation

Previous in-flight requests are cancelled when a new search starts.

### Stale Response Protection

Only the latest request is allowed to update the UI state.

### Cache

Search results are cached in memory using a TTL-based strategy.

### Generic Composable

Reusable async behavior is extracted into:

ts
useAsyncSearch<TItem, TParams>()

The product search feature uses it through a domain-specific wrapper:

ts
useProductSearch()

## Running the Project

Install dependencies:

bash
npm install

Start development server:

bash
npm run dev

Run tests:

bash
npm run test:run

Or in watch mode:

bash
npm run test

## Testing

The project includes unit tests for:

- debounce behavior
- rapid input changes
- cache hit
- cache expiration
- error state
- empty state
- request cancellation
- stale response protection
- clear/reset behavior
- product wrapper configuration

## Design Decisions

- Used composables instead of global state because the feature is self-contained.
- Separated `inputValue` from `executedQuery` to avoid coupling UI input with request execution.
- Used `AbortController` to cancel outdated requests.
- Added request sequencing to prevent stale responses from updating state.
- Used a mock API to focus on frontend async behavior without backend dependency.

## Future Improvements

- Minimum query length
- LRU cache eviction
- URL query sync
- Keyboard navigation
- Loading skeletons
- E2E tests

## Interview Summary

> I built a debounced async product search with cancellation, caching, explicit async states, and stale response protection. Then I extracted the reusable logic into a generic TypeScript composable to improve reusability, testability, and separation of concerns.