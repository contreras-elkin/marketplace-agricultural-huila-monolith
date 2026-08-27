package com.huila.marketplace.auth.web;

import com.huila.marketplace.auth.application.FarmProfileService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/farm-profile")
@PreAuthorize("hasRole('PRODUCER')")
public class FarmProfileController {

    private final FarmProfileService farmProfileService;

    public FarmProfileController(FarmProfileService farmProfileService) {
        this.farmProfileService = farmProfileService;
    }

    @PutMapping
    public FarmProfileResponse save(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody FarmProfileRequest request) {
        var profile = farmProfileService.save(
                UUID.fromString(jwt.getSubject()),
                request.department(),
                request.municipality(),
                request.village(),
                request.farmName());
        return FarmProfileResponse.from(profile);
    }

    @GetMapping
    public FarmProfileResponse get(@AuthenticationPrincipal Jwt jwt) {
        return FarmProfileResponse.from(farmProfileService.get(UUID.fromString(jwt.getSubject())));
    }
}
