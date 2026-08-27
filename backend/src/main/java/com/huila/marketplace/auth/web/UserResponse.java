package com.huila.marketplace.auth.web;

import com.huila.marketplace.auth.Role;
import com.huila.marketplace.auth.UserSummary;
import java.util.UUID;

public record UserResponse(UUID id, String name, String email, Role role) {

    public static UserResponse from(UserSummary summary) {
        return new UserResponse(summary.id(), summary.name(), summary.email(), summary.role());
    }
}
