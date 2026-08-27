package com.huila.marketplace.auth;

import java.util.UUID;

/**
 * Única puerta de entrada pública del módulo auth para el resto del
 * monolito (ver architecture.md §3a). Deliberadamente mínima: solo lo que
 * otros módulos necesitan hoy.
 */
public interface AuthModuleApi {

    UserSummary getUserSummary(UUID userId);

    boolean isProducer(UUID userId);
}
