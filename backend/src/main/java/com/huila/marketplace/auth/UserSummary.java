package com.huila.marketplace.auth;

import java.util.UUID;

public record UserSummary(UUID id, String name, String email, Role role) {
}
