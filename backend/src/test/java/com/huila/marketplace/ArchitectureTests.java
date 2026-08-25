package com.huila.marketplace;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;

class ArchitectureTests {

    @Test
    void verifiesModuleBoundaries() {
        ApplicationModules.of(MarketplaceApplication.class).verify();
    }
}
