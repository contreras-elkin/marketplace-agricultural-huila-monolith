CREATE TABLE catalog.products (
    id           UUID PRIMARY KEY,
    producer_id  UUID NOT NULL,
    name         VARCHAR(150) NOT NULL,
    category     VARCHAR(40) NOT NULL,
    unit         VARCHAR(20) NOT NULL,
    quantity     NUMERIC(12, 2) NOT NULL,
    price        NUMERIC(12, 2) NOT NULL,
    municipality VARCHAR(100) NOT NULL,
    status       VARCHAR(20) NOT NULL,
    photo_url    VARCHAR(500),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at   TIMESTAMPTZ
);

-- Listado del panel del productor: sus productos no borrados, más recientes primero.
CREATE INDEX idx_products_producer ON catalog.products (producer_id)
    WHERE deleted_at IS NULL;

-- Filtro del catálogo del comprador: por categoría y/o municipio sobre lo publicado y activo.
CREATE INDEX idx_products_browse ON catalog.products (category, municipality)
    WHERE deleted_at IS NULL AND status = 'ACTIVE';
