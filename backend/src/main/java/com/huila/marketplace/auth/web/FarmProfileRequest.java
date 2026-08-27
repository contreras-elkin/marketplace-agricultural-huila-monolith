package com.huila.marketplace.auth.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FarmProfileRequest(
        @NotBlank @Size(max = 100) String department,
        @NotBlank @Size(max = 100) String municipality,
        @NotBlank @Size(max = 100) String village,
        @NotBlank @Size(max = 150) String farmName) {
}
