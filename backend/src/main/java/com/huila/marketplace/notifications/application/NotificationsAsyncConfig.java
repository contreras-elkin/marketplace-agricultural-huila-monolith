package com.huila.marketplace.notifications.application;

import java.util.concurrent.Executor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * Los listeners de {@link NotificationEventListener} corren en este pool, no en el
 * hilo que publicó el evento (el que envía el mensaje de chat o procesa el webhook
 * de pago). Es el espejo en proceso del futuro consumidor RabbitMQ: quien publica
 * el evento no espera a la notificación ni se entera si falla (architecture.md §3b;
 * PDR §5, "si Notificaciones cae, el resto sigue funcionando").
 *
 * <p>{@code @EnableAsync} es global, pero hoy solo {@code notifications} usa
 * {@code @Async}; la config vive en este módulo para acotar el blast radius.
 */
@Configuration
@EnableAsync
public class NotificationsAsyncConfig {

    @Bean("notificationsExecutor")
    public Executor notificationsExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("notif-");
        executor.initialize();
        return executor;
    }
}
