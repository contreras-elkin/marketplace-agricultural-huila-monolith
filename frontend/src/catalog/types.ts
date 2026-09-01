export type ProductCategory =
  | 'FRUTAS'
  | 'VERDURAS'
  | 'HORTALIZAS'
  | 'TUBERCULOS'
  | 'GRANOS_Y_CEREALES'
  | 'CAFE'
  | 'CACAO'
  | 'LACTEOS'
  | 'HIERBAS_AROMATICAS'
  | 'OTROS';

export type ProductUnit =
  | 'KILOGRAMO'
  | 'LIBRA'
  | 'ARROBA'
  | 'BULTO'
  | 'CANASTA'
  | 'CAJA'
  | 'DOCENA'
  | 'MANOJO'
  | 'LITRO'
  | 'UNIDAD';

export type ProductStatus = 'ACTIVE' | 'SOLD_OUT';

export interface Product {
  id: string;
  producerId: string;
  name: string;
  category: ProductCategory;
  unit: ProductUnit;
  quantity: number;
  price: number;
  municipality: string;
  status: ProductStatus;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDetail {
  product: Product;
  producerName: string;
}

export interface ProductInput {
  name: string;
  category: ProductCategory;
  unit: ProductUnit;
  quantity: number;
  price: number;
  municipality: string;
}

/** Etiquetas legibles para los enum del backend (que llegan como SCREAMING_SNAKE_CASE). */
export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  FRUTAS: 'Frutas',
  VERDURAS: 'Verduras',
  HORTALIZAS: 'Hortalizas',
  TUBERCULOS: 'Tubérculos',
  GRANOS_Y_CEREALES: 'Granos y cereales',
  CAFE: 'Café',
  CACAO: 'Cacao',
  LACTEOS: 'Lácteos',
  HIERBAS_AROMATICAS: 'Hierbas aromáticas',
  OTROS: 'Otros',
};

export const UNIT_LABELS: Record<ProductUnit, string> = {
  KILOGRAMO: 'Kilogramo',
  LIBRA: 'Libra',
  ARROBA: 'Arroba',
  BULTO: 'Bulto',
  CANASTA: 'Canasta',
  CAJA: 'Caja',
  DOCENA: 'Docena',
  MANOJO: 'Manojo',
  LITRO: 'Litro',
  UNIDAD: 'Unidad',
};

export const CATEGORY_OPTIONS = Object.keys(CATEGORY_LABELS) as ProductCategory[];
export const UNIT_OPTIONS = Object.keys(UNIT_LABELS) as ProductUnit[];
