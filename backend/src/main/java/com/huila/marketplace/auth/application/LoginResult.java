package com.huila.marketplace.auth.application;

import com.huila.marketplace.auth.Role;
import java.time.Instant;
import java.util.UUID;

public record LoginResult(String token, Instant expiresAt, UUID userId, String name, Role role) {
}
