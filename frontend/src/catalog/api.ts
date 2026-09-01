import { apiDelete, apiGet, apiPost, apiPut, apiUpload } from '../api/client';
import type { Product, ProductCategory, ProductDetail, ProductInput, ProductStatus } from './types';

export interface CatalogFilter {
  category?: ProductCategory | '';
  municipality?: string;
}

/** Catálogo público del comprador: solo productos activos, filtro opcional por categoría y municipio. */
export function browseCatalog(filter: CatalogFilter = {}): Promise<Product[]> {
  const params = new URLSearchParams();
  if (filter.category) params.set('category', filter.category);
  if (filter.municipality?.trim()) params.set('municipality', filter.municipality.trim());
  const query = params.toString();
  return apiGet<Product[]>(`/api/catalog/products${query ? `?${query}` : ''}`);
}

/** Detalle público de un producto (incluye el nombre del productor). */
export function getProduct(id: string): Promise<ProductDetail> {
  return apiGet<ProductDetail>(`/api/catalog/products/${id}`);
}

// --- Productor (requiere token) ---------------------------------------------

export function getMyProducts(token: string): Promise<Product[]> {
  return apiGet<Product[]>('/api/catalog/products/mine', token);
}

export function createProduct(token: string, input: ProductInput): Promise<Product> {
  return apiPost<Product>('/api/catalog/products', input, token);
}

export function updateProduct(token: string, id: string, input: ProductInput): Promise<Product> {
  return apiPut<Product>(`/api/catalog/products/${id}`, input, token);
}

export function changeProductStatus(token: string, id: string, status: ProductStatus): Promise<Product> {
  return apiPut<Product>(`/api/catalog/products/${id}/status`, { status }, token);
}

export function deleteProduct(token: string, id: string): Promise<void> {
  return apiDelete<void>(`/api/catalog/products/${id}`, token);
}

export function uploadProductPhoto(token: string, id: string, file: File): Promise<Product> {
  const form = new FormData();
  form.append('file', file);
  return apiUpload<Product>(`/api/catalog/products/${id}/photo`, form, token);
}
