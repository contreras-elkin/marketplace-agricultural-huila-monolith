-- Épica 4. Rango reservado del módulo: V4xx (V401 ya creó el schema).
-- *_id son UUID sueltos: transactions nunca referencia los schemas chat/catalog/auth
-- (architecture.md §3). Montos NUMERIC(12,2) igual que catalog.products.

CREATE TABLE transactions.transactions (
    id                  UUID PRIMARY KEY,
    conversation_id     UUID           NOT NULL,
    product_id          UUID           NOT NULL,
    buyer_id            UUID           NOT NULL,
    producer_id         UUID           NOT NULL,
    quantity            NUMERIC(12, 2) NOT NULL,
    unit_price          NUMERIC(12, 2) NOT NULL,
    amount              NUMERIC(12, 2) NOT NULL,
    currency            VARCHAR(3)     NOT NULL,
    status              VARCHAR(20)    NOT NULL,
    gateway_session_id  VARCHAR(255),
    gateway_payment_id  VARCHAR(255),
    created_at          TIMESTAMPTZ    NOT NULL,
    confirmed_at        TIMESTAMPTZ
);

-- "¿esta conversación ya tiene una transacción activa?" (Decisión 9).
CREATE INDEX idx_transactions_conversation ON transactions.transactions (conversation_id);
-- "Mis compras" / "Mis ventas".
CREATE INDEX idx_transactions_buyer        ON transactions.transactions (buyer_id);
CREATE INDEX idx_transactions_producer     ON transactions.transactions (producer_id);
-- El webhook busca la transacción por la sesión de checkout de Stripe.
CREATE UNIQUE INDEX uq_transactions_session ON transactions.transactions (gateway_session_id)
    WHERE gateway_session_id IS NOT NULL;

CREATE TABLE transactions.ledger_entries (
    id                   UUID PRIMARY KEY,
    transaction_id       UUID           NOT NULL,
    producer_id          UUID           NOT NULL,
    gross_amount         NUMERIC(12, 2) NOT NULL,
    platform_fee_amount  NUMERIC(12, 2) NOT NULL,
    net_amount           NUMERIC(12, 2) NOT NULL,
    currency             VARCHAR(3)     NOT NULL,
    created_at           TIMESTAMPTZ    NOT NULL,
    -- Red de seguridad ante reintentos del webhook: una sola fila de ledger por transacción.
    CONSTRAINT uq_ledger_transaction UNIQUE (transaction_id)
);
CREATE INDEX idx_ledger_producer ON transactions.ledger_entries (producer_id);
