package com.huila.marketplace.auth.web;

import com.huila.marketplace.auth.domain.FarmProfile;
import java.time.Instant;

public record FarmProfileResponse(
        String department, String municipality, String village, String farmName, Instant updatedAt) {

    public static FarmProfileResponse from(FarmProfile profile) {
        return new FarmProfileResponse(
                profile.getDepartment(),
                profile.getMunicipality(),
                profile.getVillage(),
                profile.getFarmName(),
                profile.getUpdatedAt());
    }
}
