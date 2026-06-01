<script setup lang="ts">
import Card from "./Card.vue";
import { useProductSearch } from "@/composables/useProductSearch";

const {
  inputValue,
  state,
  hasResults,
  isLoading,
  scheduleSearch,
  clear,
  retry,
} = useProductSearch({
  debounceMs: 400,
  cacheTtlMs: 30_000,
  defaultLimit: 10,
});

function onInput(event: Event) {
  const target = event.target as HTMLInputElement;
  inputValue.value = target.value;
  scheduleSearch();
}
</script>

<template>
  <section class="search-page">
    <div class="search-panel">
      <div class="search-header">
        <h1>Product Search</h1>
        <p>Search products with debounce, cancellation and cache.</p>
      </div>

      <div class="search-box">
        <input
          :value="inputValue"
          type="text"
          placeholder="Search for products..."
          autocomplete="off"
          @input="onInput"
        />

        <button
          v-if="inputValue"
          type="button"
          class="clear-button"
          @click="clear"
        >
          Clear
        </button>
      </div>

      <div class="status-row">
        <span class="status">
          Status:
          <strong>{{ state.status }}</strong>
        </span>

        <span v-if="state.fromCache" class="cache-badge"> From cache </span>

        <span v-if="isLoading" class="loading-text"> Searching... </span>
      </div>
    </div>

    <div class="result-panel">
      <div v-if="state.status === 'idle'" class="state-message">
        Start typing to search products.
      </div>

      <div v-else-if="state.status === 'error'" class="state-message error">
        <p>{{ state.errorMessage || "Something went wrong." }}</p>
        <button type="button" @click="retry">Retry</button>
      </div>

      <div v-else-if="state.status === 'empty'" class="state-message">
        No products found for
        <strong>"{{ state.query }}"</strong>
      </div>

      <div v-else class="results-wrapper">
        <div class="result-toolbar">
          <div class="result-summary">
            Found {{ state.total }} result(s) for
            <strong>"{{ state.query }}"</strong>
          </div>

          <div v-if="isLoading" class="inline-loading">Updating results...</div>
        </div>

        <div v-if="hasResults" class="results">
          <Card
            v-for="product in state.items"
            :key="product.id"
            :product="product"
          />
        </div>

        <div v-else-if="isLoading" class="state-message">
          <div class="spinner"></div>
          <span>Loading results...</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.search-page {
  max-width: 760px;
  margin: 48px auto;
  padding: 0 20px;
}

.search-panel {
  padding: 24px;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}

.search-header h1 {
  margin: 0;
  font-size: 28px;
  color: #111827;
}

.search-header p {
  margin: 8px 0 0;
  color: #6b7280;
}

.search-box {
  display: flex;
  gap: 8px;
  margin-top: 24px;
}

.search-box input {
  flex: 1;
  padding: 12px 14px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  font-size: 16px;
  outline: none;
}

.search-box input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.clear-button {
  padding: 0 14px;
  border: none;
  border-radius: 10px;
  background: #ef4444;
  color: white;
  cursor: pointer;
}

.clear-button:hover {
  background: #dc2626;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  font-size: 14px;
  color: #6b7280;
}

.status strong {
  color: #111827;
}

.cache-badge {
  padding: 3px 8px;
  border-radius: 999px;
  background: #ecfdf5;
  color: #047857;
  font-size: 12px;
  font-weight: 600;
}

.loading-text {
  color: #2563eb;
}

.result-panel {
  margin-top: 20px;
}

.state-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 160px;
  padding: 24px;
  border: 1px dashed #d1d5db;
  border-radius: 16px;
  color: #6b7280;
  background: #f9fafb;
  text-align: center;
}

.state-message.error {
  flex-direction: column;
  color: #b91c1c;
  background: #fef2f2;
  border-color: #fecaca;
}

.state-message.error button {
  padding: 8px 14px;
  border: none;
  border-radius: 8px;
  background: #b91c1c;
  color: white;
  cursor: pointer;
}

.results-wrapper {
  display: grid;
  gap: 12px;
}

.result-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.result-summary {
  color: #4b5563;
  font-size: 14px;
}

.inline-loading {
  font-size: 13px;
  color: #2563eb;
}

.results {
  display: grid;
  gap: 12px;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 3px solid #bfdbfe;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
