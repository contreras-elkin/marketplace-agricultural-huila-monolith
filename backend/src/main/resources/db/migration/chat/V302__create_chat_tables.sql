CREATE TABLE chat.conversations (
    id                     UUID PRIMARY KEY,
    product_id             UUID        NOT NULL,
    buyer_id               UUID        NOT NULL,
    producer_id            UUID        NOT NULL,
    agreed_purchase_method VARCHAR(20),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Un comprador tiene una sola conversación por producto: "Chatear" la reusa.
    CONSTRAINT uq_conversation_product_buyer UNIQUE (product_id, buyer_id)
);

-- "Mis conversaciones": las del usuario autenticado, sea comprador o productor.
CREATE INDEX idx_conversations_buyer    ON chat.conversations (buyer_id);
CREATE INDEX idx_conversations_producer ON chat.conversations (producer_id);

CREATE TABLE chat.messages (
    id              UUID PRIMARY KEY,
    conversation_id UUID        NOT NULL,
    sender_id       UUID        NOT NULL,
    body            TEXT        NOT NULL,
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Historial de una conversación en orden cronológico (sin paginación en el MVP).
CREATE INDEX idx_messages_conversation_sent ON chat.messages (conversation_id, sent_at);
