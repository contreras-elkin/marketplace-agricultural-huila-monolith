package com.huila.marketplace.transactions.application;

import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Reparte el bruto de una transacción confirmada en comisión de plataforma y
 * neto para el productor. La tasa vive en {@code app.transactions.platform-fee-rate}
 * (0 en fase 1, Decisión 6): con tasa 0, {@code net == gross} y {@code fee == 0}.
 * Subir la tasa no toca el schema ni el resto del código.
 */
@Component
public class PlatformFee {

    private final BigDecimal rate;

    public PlatformFee(@Value("${app.transactions.platform-fee-rate}") BigDecimal rate) {
        this.rate = rate;
    }

    public Split split(BigDecimal gross) {
        BigDecimal fee = gross.multiply(rate).setScale(2, RoundingMode.HALF_UP);
        BigDecimal net = gross.subtract(fee);
        return new Split(gross, fee, net);
    }

    public record Split(BigDecimal gross, BigDecimal fee, BigDecimal net) {}
}
