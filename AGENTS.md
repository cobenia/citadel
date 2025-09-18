# AGENTS.md

## Proyecto Overview

Proyecto Cobenia/Fructus - Sistema de análisis financiero con Clean Architecture, TypeScript y Prisma. Usa dependency injection con Inversify y seguimos patrones de Clean Architecture con capas domain/application/infrastructure.

## Setup Commands

- Install deps: `npm install`
- Setup database: `npx prisma db push`
- Generate Prisma client: `npx prisma generate`
- Build project: `npm run build`
- Start dev: `npm run dev`
- Run tests: `node --test --require ts-node/register --require tsconfig-paths/register 'src/**/*.spec.ts'`
- Type check: `npm run build:check`

## Code Style

- TypeScript estricto - nunca usar `any`
- Archivos en kebab-case: `sec-documents-report.service.ts`
- Variables y funciones en inglés, comments pueden ser en español
- Interfaces sin sufijo (ej: `SecFeedScraper`)
- Implementaciones con sufijo del proveedor (ej: `SecFeedScraperApify`)
- Entidades descriptivas (ej: `SecDocument`, `Company`)
- Enums con prefijo del dominio (ej: `SecFormType`)
- Constantes en UPPER_SNAKE_CASE
- Usar async/await, nunca Promises encadenadas
- Usar Promise.all() para operaciones paralelas

## Project Structure

```
src/
├── components/           # Features organizadas por dominio
│   └── [feature]/
│       ├── domain/      # Entidades, interfaces, tipos
│       ├── application/ # Use cases, DTOs
│       └── infrastructure/ # Implementaciones, repos, scrapers
├── shared/              # Código compartido
│   ├── domain/         # Logger, entidades base
│   ├── application/    # DTOs compartidos
│   └── infrastructure/ # Prisma, utils
└── config/
    └── di/             # Dependency injection
        ├── shared/     # Dependencias comunes
        └── module/     # Módulos específicos por feature
```

## Dependency Injection

- Usar Inversify con decoradores `@injectable()` y `@inject()`
- Definir interfaces en `domain/`, implementaciones en `infrastructure/`
- Registrar dependencias en `src/config/di/module/[feature].module.ts`
- Dependencias comunes en `src/config/di/shared/`
- Usar string tokens: `@inject('SecFeedScraper')`
- Las dependencias van desde capas externas hacia internas

## Database (Prisma)

- Schema en `prisma/schema.prisma`
- Usar relaciones explícitas con foreign keys
- Campos obligatorios vs opcionales bien definidos
- Timestamps automáticos (createdAt, updatedAt)
- Usar select específicos en queries para optimización
- Implementar paginación cuando sea necesario
- Validar datos antes de insertar/actualizar
- Usar transacciones para operaciones complejas

## Testing Instructions

- Usamos `node:test`, **nunca jest**
- Tests unitarios: misma carpeta que el archivo, con `.spec.ts`
- Tests de integración: subcarpeta `__test__/` con `.spec.ts`
- Comando: `node --test --require ts-node/register --require tsconfig-paths/register 'src/**/*.spec.ts'`
- Crear tests para funcionalidades específicas cuando aplique
- Mock dependencias externas en tests unitarios

## Logging Standards

- Usar logger centralizado en `src/shared/domain/logger`
- Niveles: `logger.debug`, `logger.info`, `logger.warn`, `logger.error`
- Variable de entorno `LOG_LEVEL` (default: info)
- Usar emojis para categorizar:
  - 🔍 búsquedas/queries
  - ✅ operaciones exitosas
  - ❌ errores
  - ⚠️ warnings
  - 💾 persistencia
  - 📄 procesamiento documentos
  - 🏁 finalizaciones
- Logs descriptivos pueden ser en español
- Incluir contexto relevante (IDs, nombres, cantidades)

## Error Handling

- Usar try/catch con async/await
- Propagar errores con contexto útil
- Capturar errores específicos cuando sea posible
- Logging consistente de errores
- Manejar constraint violations de DB adecuadamente

## Repository Pattern

- Implementar con Prisma
- Separar lógica de persistencia de lógica de negocio
- Interfaces en `domain/`, implementaciones en `infrastructure/`
- Usar transacciones para operaciones complejas
- Manejar errores de DB con contexto

## External APIs & Scrapers

- Implementar rate limiting y delays
- Manejar errores de red gracefully
- Usar Playwright para scraping cuando sea necesario
- Configuración externa para timeouts y límites
- Retry logic para fallos temporales

## Commit & PR Guidelines

- Commits en inglés, descriptivos
- PRs con descripción clara del cambio
- Siempre ejecutar `npm run build:check` antes de commit
- Corregir errores de TypeScript antes de PR
- Mantener commits atómicos y enfocados

## Architecture Guidelines

### Clean Architecture Layers

1. **Domain**: Entidades, interfaces de servicios, tipos de dominio
2. **Application**: Use cases, DTOs, orquestación
3. **Infrastructure**: Implementaciones concretas, repositorios, scrapers

### Use Cases

- Un use case por operación de negocio
- Coordinar servicios de dominio
- Retornar DTOs específicos para cada use case
- Manejar orquestación de operaciones complejas

### Domain Services

- Lógica de negocio específica del dominio
- Interfaces en domain, implementaciones en infrastructure
- Servicios stateless
- Separar por responsabilidad

## Security Considerations

- Validar inputs antes de procesamiento
- Sanitizar datos de fuentes externas
- Usar variables de entorno para credenciales
- Rate limiting en APIs externas
- Validación de tipos en runtime cuando sea necesario

## Performance Guidelines

- Usar Promise.all() para operaciones paralelas
- Select específicos en queries de DB
- Implementar paginación en listados
- Cache cuando sea apropiado
- Monitorear timing en operaciones largas

## Troubleshooting

- Si hay errores de TypeScript, revisar imports y tipos
- Para errores de DI, verificar registro en módulos
- Para errores de DB, revisar schema y migraciones
- Logs con emojis facilitan debugging
- Usar `npm run build:check` para verificar compilación
