package com.huila.marketplace.auth.web;

import com.huila.marketplace.auth.Role;
import com.huila.marketplace.auth.application.LoginResult;
import java.time.Instant;
import java.util.UUID;

public record TokenResponse(String token, Instant expiresAt, UUID userId, String name, Role role) {

    public static TokenResponse from(LoginResult result) {
        return new TokenResponse(result.token(), result.expiresAt(), result.userId(), result.name(), result.role());
    }
}
