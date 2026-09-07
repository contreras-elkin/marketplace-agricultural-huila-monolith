# Marketplace Agrícola Huila — monolito modular (fase 1)

MVP que acerca productores agrícolas del Huila con compradores directos. Proyecto académico
(Sistemas Distribuidos 2026-b). Monolito modular Spring Boot + React, fase 1 de una migración
Strangler Fig. Contexto completo en [`CLAUDE.md`](CLAUDE.md) y [`docs/`](docs/).

## Levantar todo con Docker

Requiere Docker. Sirve front y back en un solo origen (`nginx` como reverse-proxy).

```bash
cp .env.example .env          # completar JWT_SECRET y, para el flujo de pago, las claves Stripe test
docker compose up -d --build
```

- App: <http://localhost:8080>
- Backend directo (curl/Postman): <http://localhost:8081>
- RabbitMQ management: <http://localhost:15672> (`marketplace` / `marketplace`)

```bash
docker compose logs -f backend   # arranque + migraciones Flyway
docker compose down              # baja (conserva datos)
docker compose down -v           # baja y borra BD + uploads + RabbitMQ
```

Flujo de pago (Épica 4), desde el host: `stripe listen --forward-to localhost:8080/api/transactions/webhook/stripe`.

## Desarrollo local (sin dockerizar la app)

```bash
docker compose up -d postgres rabbitmq       # solo la infra
cd backend  && mvn spring-boot:run           # → http://localhost:8080
cd frontend && npm install && npm run dev    # → http://localhost:5173
cd backend  && mvn test                      # ArchitectureTests (límites de módulo)
```

Puertos: Postgres 5432 · RabbitMQ 5672 / 15672 · backend 8080 (8081 en Docker) · frontend 5173 (dev) / 8080 (Docker).
