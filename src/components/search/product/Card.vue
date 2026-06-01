<script setup lang="ts">
import type { Product } from "@/types/product";

defineProps<{
  product: Product;
}>();
</script>

<template>
  <article class="product-card">
    <div class="thumbnail">
      <img v-if="product.thumbnail" src="" alt="" />
      <div v-else class="thumbnail-placeholder">No Image</div>
    </div>

    <div class="content">
      <div class="header">
        <h3>{{ product.title }}</h3>
        <span class="price">${{ product.price }}</span>
      </div>

      <p class="description">
        {{ product.description }}
      </p>

      <div class="meta">
        <span>{{ product.category }}</span>
        <span>⭐ {{ product.rating }}</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.product-card {
  display: flex;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
}

.thumbnail {
  width: 88px;
  height: 88px;
  flex: 0 0 88px;
  border-radius: 10px;
  overflow: hidden;
  background: #f3f4f6;
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  font-size: 12px;
  color: #6b7280;
}

.content {
  flex: 1;
  min-width: 0;
}

.header h3 {
  margin: 0;
  font-size: 16px;
  color: #111827;
}

.price {
  font-weight: 700;
  color: #059669;
  white-space: nowrap;
}

.description {
  margin: 8px 0;
  color: #4b5563;
  font-size: 14px;
}

.meta {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: #6b7280;
}
</style>
