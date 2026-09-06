/**
 * Formato unificado para TODAS las vistas (Épica 6). Ninguna página debería llamar
 * a `toLocaleString` / `new Date(...).toLocale*` por su cuenta: todo pasa por acá.
 * Locale es-CO, zona horaria America/Bogota.
 */
import type { ProductUnit } from '../catalog/types';

const LOCALE = 'es-CO';
const TZ = 'America/Bogota';

/* --------------------------------------------------------------------------- */
/* Dinero                                                                       */
/* --------------------------------------------------------------------------- */

/**
 * `formatMoney(1234567)`            -> "$ 1.234.567"
 * `formatMoney(1234567, { suffix })` -> "$ 1.234.567 COP"   (solo para totales)
 *
 * El 2º parámetro acepta además un string por compatibilidad transitoria con las
 * llamadas viejas `formatMoney(x, currency)` (se limpian en el Corte 3). La moneda
 * siempre es COP en la fase 1.
 */
export function formatMoney(amount: number, opts?: { suffix?: boolean } | string): string {
  const withSuffix = typeof opts === 'object' && opts.suffix === true;
  const base = new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
  return withSuffix ? `${base} COP` : base;
}

/* --------------------------------------------------------------------------- */
/* Números y cantidades                                                         */
/* --------------------------------------------------------------------------- */

function formatNumber(value: number): string {
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 }).format(
    Number.isFinite(value) ? value : 0,
  );
}

const UNIT_SINGULAR: Record<ProductUnit, string> = {
  KILOGRAMO: 'kilogramo',
  LIBRA: 'libra',
  ARROBA: 'arroba',
  BULTO: 'bulto',
  CANASTA: 'canasta',
  CAJA: 'caja',
  DOCENA: 'docena',
  MANOJO: 'manojo',
  LITRO: 'litro',
  UNIDAD: 'unidad',
};

const UNIT_PLURAL: Record<ProductUnit, string> = {
  KILOGRAMO: 'kilogramos',
  LIBRA: 'libras',
  ARROBA: 'arrobas',
  BULTO: 'bultos',
  CANASTA: 'canastas',
  CAJA: 'cajas',
  DOCENA: 'docenas',
  MANOJO: 'manojos',
  LITRO: 'litros',
  UNIDAD: 'unidades',
};

/** Unidades con símbolo corto convencional; el resto usa la palabra. */
const UNIT_SYMBOL: Partial<Record<ProductUnit, string>> = {
  KILOGRAMO: 'kg',
  LIBRA: 'lb',
  LITRO: 'L',
};

/**
 * `formatQuantity(12, 'KILOGRAMO')`            -> "12 kg"
 * `formatQuantity(3, 'ARROBA')`                -> "3 arrobas"
 * `formatQuantity(1, 'ARROBA', { long: true })` -> "1 arroba"
 * `formatQuantity(12, 'KILOGRAMO', { long: true })` -> "12 kilogramos"
 */
export function formatQuantity(qty: number, unit: ProductUnit, opts?: { long?: boolean }): string {
  const n = formatNumber(qty);
  if (!opts?.long && UNIT_SYMBOL[unit]) {
    return `${n} ${UNIT_SYMBOL[unit]}`;
  }
  const word = qty === 1 ? UNIT_SINGULAR[unit] : UNIT_PLURAL[unit];
  return `${n} ${word}`;
}

/* --------------------------------------------------------------------------- */
/* Fechas                                                                       */
/* --------------------------------------------------------------------------- */

/** "2 sept 2026" */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeZone: TZ }).format(new Date(iso));
}

/** "2 sept 2026, 3:41 p. m." — para vistas de detalle. */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: TZ,
  }).format(new Date(iso));
}

/** "3:41 p. m." — hora sola, para el historial de chat. */
export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, { timeStyle: 'short', timeZone: TZ }).format(new Date(iso));
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Tiempo relativo para listas: "recién" · "hace 5 min" · "hace 3 h" · "ayer" ·
 * "hace 4 días" · "12 sept" · "12 sept 2025".
 */
export function formatRelative(iso: string): string {
  const then = new Date(iso);
  const thenMs = then.getTime();
  const now = Date.now();
  const diffSec = Math.round((now - thenMs) / 1000);

  if (diffSec < 45) return 'recién';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `hace ${diffHr} h`;

  const diffDays = Math.round((startOfDay(new Date(now)) - startOfDay(then)) / 86_400_000);
  if (diffDays === 1) return 'ayer';
  if (diffDays < 7) return `hace ${diffDays} días`;

  const sameYear = new Date(now).getFullYear() === then.getFullYear();
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
    timeZone: TZ,
  }).format(then);
}
