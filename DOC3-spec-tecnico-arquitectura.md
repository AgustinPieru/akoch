# DOCUMENTO 3 — ESPECIFICACIÓN TÉCNICA Y ARQUITECTURA
## Sistema de Administración Inmobiliaria
### Para uso interno del equipo de desarrollo
### Versión 1.0 — Mayo 2026 | Confidencial

---

## TABLA DE CONTENIDOS

1. [Arquitectura General](#1-arquitectura-general)
2. [Estructura del Monorepo](#2-estructura-del-monorepo)
3. [Arquitectura Frontend](#3-arquitectura-frontend)
4. [Arquitectura Backend](#4-arquitectura-backend)
5. [Base de Datos PostgreSQL](#5-base-de-datos-postgresql)
6. [Prisma ORM](#6-prisma-orm)
7. [Manejo Documental y Archivos](#7-manejo-documental-y-archivos)
8. [OCR — Reconocimiento Óptico de Caracteres](#8-ocr--reconocimiento-óptico-de-caracteres)
9. [Generación de PDFs](#9-generación-de-pdfs)
10. [Integración WhatsApp](#10-integración-whatsapp)
11. [Seguridad](#11-seguridad)
12. [Docker y Docker Compose](#12-docker-y-docker-compose)
13. [CI/CD](#13-cicd)
14. [Testing](#14-testing)
15. [Escalabilidad Futura](#15-escalabilidad-futura)
16. [APIs Futuras](#16-apis-futuras)
17. [Roadmap Técnico](#17-roadmap-técnico)

---

## 1. ARQUITECTURA GENERAL

### 1.1 Patrón arquitectónico elegido: Monolito Modular Desacoplado

**Decisión:** Se opta por un monolito modular para el MVP en lugar de microservicios.

**Justificación:**
- El equipo de desarrollo es pequeño (1–3 desarrolladores).
- El dominio del problema es bien conocido y no requiere escalado independiente de componentes.
- Los microservicios añaden complejidad operativa (service mesh, descubrimiento, contratos entre servicios) que no aporta valor en esta etapa.
- Un monolito bien modularizado puede **extraerse** a servicios independientes en el futuro si el crecimiento lo justifica (el código ya estará separado internamente).

El backend se organiza en módulos de dominio independientes (owners, tenants, properties, contracts, payments, settlements, etc.) con separación clara de responsabilidades, pero desplegados como un único proceso Node.js.

### 1.2 Vista de alto nivel del sistema

```
┌──────────────────────────────────────────────────────────────────────┐
│                          INTERNET                                     │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ HTTPS (443)
                    ┌──────────────▼───────────────┐
                    │         NGINX                 │
                    │   (reverse proxy + SSL)        │
                    └────────┬──────────┬───────────┘
                             │          │
              ┌──────────────▼──┐    ┌──▼──────────────────┐
              │  REACT SPA      │    │  NODE.JS API         │
              │  (Vite build    │    │  (Fastify + TS)      │
              │  servido por    │    │  /api/v1/*           │
              │  Nginx static)  │    │                      │
              └─────────────────┘    └────────┬─────────────┘
                                              │
                              ┌───────────────▼─────────────┐
                              │       POSTGRESQL 16          │
                              │   (volumen Docker persistente)│
                              └─────────────────────────────┘
                                              │
                              ┌───────────────▼─────────────┐
                              │    STORAGE DE ARCHIVOS       │
                              │ (volumen local en MVP /      │
                              │  MinIO S3-compatible en prod) │
                              └─────────────────────────────┘
```

### 1.3 Comunicación frontend ↔ backend

- Protocolo: **REST sobre HTTP/HTTPS**
- Versionado de API: `/api/v1/` (prefijo para todas las rutas)
- Formato: JSON para todas las requests/responses
- Autenticación: JWT Bearer token en header `Authorization: Bearer <token>`
- Refresh token: httpOnly cookie (`refresh_token`)
- Manejo de archivos: `multipart/form-data` para uploads, URL firmada para descarga
- Errores: formato estandarizado `{ error: string, code: string, details?: object }`

### 1.4 Flujo de autenticación

```
1. POST /api/v1/auth/login
   Body: { email, password }
   Response: { accessToken: JWT (15min) }
   Cookie: refresh_token (httpOnly, 7 días)

2. Cada request incluye:
   Header: Authorization: Bearer <accessToken>

3. Al expirar el accessToken:
   POST /api/v1/auth/refresh
   Cookie enviada automáticamente: refresh_token
   Response: { accessToken: nuevo JWT }

4. Logout:
   POST /api/v1/auth/logout
   Invalida el refresh token en base de datos
   Borra la cookie
```

### 1.5 Convenciones de la API REST

```
Método   Ruta                           Acción
────────────────────────────────────────────────────────
GET      /api/v1/owners                 Listar propietarios (con paginación y filtros)
GET      /api/v1/owners/:id             Obtener propietario por ID
POST     /api/v1/owners                 Crear propietario
PATCH    /api/v1/owners/:id             Actualizar propietario (parcial)
DELETE   /api/v1/owners/:id             Baja lógica (soft delete)
GET      /api/v1/owners/:id/settlements Liquidaciones de un propietario
POST     /api/v1/contracts/:id/activate Acción de negocio (no CRUD puro)
POST     /api/v1/contracts/:id/terminate Rescisión de contrato
```

Paginación estándar: `?page=1&limit=20&sortBy=created_at&sortOrder=desc`
Filtros: `?status=active&type=apartment` (query params)

---

## 2. ESTRUCTURA DEL MONOREPO

### 2.1 Árbol de directorios

```
inmobiliaria/                          ← Raíz del monorepo
├── apps/
│   ├── frontend/                      ← React + Vite SPA
│   │   ├── src/
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   └── backend/                       ← Node.js API (Fastify + TS)
│       ├── src/
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seeds/
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── types/                         ← Tipos TypeScript compartidos
│   │   ├── src/
│   │   │   ├── entities/              ← Tipos de entidades (Owner, Tenant, etc.)
│   │   │   ├── dtos/                  ← Request/Response DTOs
│   │   │   ├── enums/                 ← Enums compartidos (ContractStatus, etc.)
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── utils/                         ← Utilidades compartidas
│   │   ├── src/
│   │   │   ├── currency.ts            ← Formateo ARS/USD, cálculos
│   │   │   ├── dates.ts               ← Manejo de fechas en zona horaria Argentina
│   │   │   ├── cuit.ts                ← Validación CUIT/CUIL
│   │   │   ├── cbu.ts                 ← Validación CBU
│   │   │   ├── indices.ts             ← Helpers para ICL/IPC
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── ui/                            ← Componentes UI base (design system)
│   │   ├── src/
│   │   │   ├── components/            ← Button, Input, Modal, Table, Badge, etc.
│   │   │   ├── tokens/                ← Colores, tipografía, espaciados
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── config/                        ← Configuración compartida de herramientas
│       ├── eslint/
│       │   └── index.js               ← ESLint config base
│       ├── tsconfig/
│       │   ├── base.json              ← tsconfig base para todos los paquetes
│       │   ├── react.json             ← Extiende base, agrega JSX
│       │   └── node.json              ← Extiende base, agrega resolución Node
│       └── package.json
│
├── docker/
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   └── nginx/
│       ├── nginx.conf
│       └── default.conf
│
├── docs/
│   ├── api/                           ← Documentación OpenAPI/Swagger
│   ├── decisions/                     ← Architecture Decision Records (ADRs)
│   └── runbooks/                      ← Procedimientos operativos
│
├── .github/
│   └── workflows/
│       ├── ci.yml                     ← Lint + test + typecheck en PR
│       └── deploy.yml                 ← Build y deploy en merge a main
│
├── .env.example                       ← Variables requeridas documentadas
├── .gitignore
├── docker-compose.yml                 ← Entorno de desarrollo local
├── docker-compose.prod.yml            ← Override para producción
├── package.json                       ← Workspace root (pnpm workspaces)
├── pnpm-workspace.yaml
└── turbo.json                         ← Turborepo config (caché de builds)
```

### 2.2 Gestor de paquetes y build system

**Package manager:** `pnpm` con workspaces
- Instala dependencias una sola vez en el root node_modules (hoisting)
- Gestión eficiente del espacio en disco
- Lockfile determinístico

**Build system:** `Turborepo`
- Caché de resultados de build, test y lint (local y remoto)
- Paralelización de tareas entre paquetes
- Dependency graph automático: sabe que si `packages/types` cambia, debe rebuilder `apps/frontend` y `apps/backend`

**Comandos desde el root:**
```bash
pnpm dev              # Inicia frontend y backend en paralelo
pnpm build            # Build de todos los packages y apps
pnpm test             # Tests de todos los packages
pnpm lint             # Lint de todo el monorepo
pnpm typecheck        # TypeScript check de todo el monorepo
```

### 2.3 Convenciones de naming

| Elemento | Convención | Ejemplo |
|---|---|---|
| Archivos TypeScript | kebab-case | `contract-service.ts` |
| Componentes React | PascalCase | `ContractForm.tsx` |
| Directorios | kebab-case | `contract-tenants/` |
| Variables/funciones | camelCase | `getContractById` |
| Constantes | UPPER_SNAKE_CASE | `MAX_FILE_SIZE_MB` |
| Tipos/Interfaces | PascalCase | `ContractStatus` |
| Enums | PascalCase | `PaymentStatus` |
| Tablas DB | snake_case | `contract_tenants` |
| Campos DB | snake_case | `created_at` |
| Modelos Prisma | PascalCase singular | `Contract` |

---

## 3. ARQUITECTURA FRONTEND

### 3.1 Stack y dependencias principales

```json
{
  "react": "^18.3",
  "typescript": "^5.4",
  "vite": "^5.2",
  "tailwindcss": "^3.4",
  "@tanstack/react-query": "^5.32",
  "react-hook-form": "^7.51",
  "zod": "^3.22",
  "@hookform/resolvers": "^3.3",
  "zustand": "^4.5",
  "axios": "^1.6",
  "react-router-dom": "^6.22",
  "@tanstack/react-table": "^8.16",
  "react-dropzone": "^14.2",
  "date-fns": "^3.6",
  "sonner": "^1.4"
}
```

**Justificaciones clave:**
- **Vite sobre CRA/Next.js:** HMR más rápido, build más liviano. No se necesita SSR en una aplicación de gestión interna.
- **TanStack Query sobre SWR:** Más funcionalidades out-of-the-box (mutations, optimistic updates, infinite queries, devtools).
- **Zustand sobre Redux:** API minimalista, sin boilerplate. Para una app de gestión interna un store simple es suficiente.
- **Zod sobre Yup:** Mejor integración con TypeScript, inferencia de tipos nativa.
- **TanStack Table:** La librería de tablas más potente para React, headless (compatible con Tailwind).

### 3.2 Estructura de carpetas

```
apps/frontend/src/
│
├── assets/                            ← Imágenes, íconos, fuentes estáticos
│
├── components/                        ← Componentes reutilizables (sin lógica de dominio)
│   ├── ui/                            ← Primitivos: Button, Input, Modal, Select, Badge
│   ├── layout/                        ← Sidebar, Header, Breadcrumb, PageHeader
│   ├── data-display/                  ← DataTable, Stat, EmptyState, Timeline
│   ├── feedback/                      ← Alert, Spinner, SkeletonLoader, ErrorBoundary
│   ├── forms/                         ← FormField, FormSection, FileUpload, DatePicker
│   └── pdf/                           ← PDFViewer (iframe wrapper)
│
├── features/                          ← Módulos por dominio (colocación de código)
│   ├── auth/
│   │   ├── api/                       ← useLogin.ts, useLogout.ts, useRefreshToken.ts
│   │   ├── components/                ← LoginForm.tsx
│   │   ├── pages/                     ← LoginPage.tsx
│   │   └── store/                     ← authStore.ts (Zustand)
│   │
│   ├── dashboard/
│   │   ├── api/                       ← useDashboardStats.ts
│   │   ├── components/                ← StatCard, AlertsPanel, UpcomingExpirations
│   │   └── pages/                     ← DashboardPage.tsx
│   │
│   ├── owners/
│   │   ├── api/                       ← useOwners.ts, useOwner.ts, useCreateOwner.ts
│   │   ├── components/                ← OwnerForm.tsx, OwnerCard.tsx, OwnerSettlements.tsx
│   │   ├── pages/                     ← OwnersListPage.tsx, OwnerDetailPage.tsx
│   │   ├── schemas/                   ← ownerSchema.ts (Zod)
│   │   └── types/                     ← owner.types.ts
│   │
│   ├── tenants/                       ← Igual estructura
│   ├── properties/                    ← Igual estructura
│   ├── contracts/
│   │   ├── api/
│   │   ├── components/
│   │   │   ├── ContractWizard/        ← Wizard multi-step
│   │   │   │   ├── Step1Property.tsx
│   │   │   │   ├── Step2Tenants.tsx
│   │   │   │   ├── Step3Economics.tsx
│   │   │   │   └── Step4Documents.tsx
│   │   │   ├── RentIncreaseCalculator.tsx
│   │   │   └── ContractTimeline.tsx
│   │   ├── pages/
│   │   └── utils/                     ← calculateNextAdjustmentDate.ts
│   │
│   ├── payments/
│   ├── expenses/
│   ├── settlements/
│   ├── sales/
│   │   ├── components/
│   │   │   └── SalesPipeline/         ← Kanban board de ventas
│   ├── repairs/
│   ├── receipts/
│   ├── reports/
│   ├── ocr/
│   │   ├── components/
│   │   │   ├── OcrUploader.tsx        ← Drag & drop + preview
│   │   │   └── OcrReviewForm.tsx      ← Formulario con campos coloreados por confianza
│   │   └── api/
│   └── automations/
│
├── layouts/
│   ├── DashboardLayout.tsx            ← Sidebar + Header + Outlet
│   └── AuthLayout.tsx                 ← Centrado, sin navegación
│
├── router/
│   ├── index.tsx                      ← Definición de todas las rutas
│   ├── ProtectedRoute.tsx             ← Wrapper que verifica auth
│   └── routes.ts                      ← Constantes de paths (evitar strings hardcodeados)
│
├── store/
│   ├── authStore.ts                   ← Estado de autenticación global
│   ├── uiStore.ts                     ← Sidebar abierto/cerrado, preferencias UI
│   └── notificationStore.ts           ← Cola de toasts y notificaciones del sistema
│
├── lib/
│   ├── axios.ts                       ← Instancia Axios + interceptors
│   └── queryClient.ts                 ← Configuración global de TanStack Query
│
├── hooks/
│   ├── useDebounce.ts                 ← Hook de debounce para búsquedas
│   ├── useConfirmDialog.ts            ← Hook para diálogos de confirmación
│   └── useDocumentTitle.ts            ← Actualiza el <title> de la página
│
└── utils/
    ├── format.ts                      ← Formateo de fechas, montos ARS/USD
    ├── errors.ts                      ← Extracción de mensajes de error de Axios
    └── constants.ts                   ← Constantes globales (límites, URLs, etc.)
```

### 3.3 Routing

Se usa **React Router v6** con lazy loading por feature para reducir el bundle inicial.

```typescript
// router/index.tsx — estructura conceptual

const routes = [
  {
    path: '/login',
    element: <AuthLayout>,
    children: [{ index: true, element: lazy(() => import('../features/auth/pages/LoginPage')) }]
  },
  {
    path: '/',
    element: <ProtectedRoute><DashboardLayout /></ProtectedRoute>,
    children: [
      { index: true, element: lazy(() => import('../features/dashboard/pages/DashboardPage')) },
      { path: 'owners', children: [
        { index: true, element: lazy(() => import('../features/owners/pages/OwnersListPage')) },
        { path: ':id', element: lazy(() => import('../features/owners/pages/OwnerDetailPage')) },
        { path: 'new', element: lazy(() => import('../features/owners/pages/OwnerNewPage')) },
      ]},
      { path: 'contracts', children: [ /* ... */ ] },
      { path: 'payments', children: [ /* ... */ ] },
      // ... resto de módulos
    ]
  }
]
```

Todas las rutas bajo `/` requieren autenticación (`ProtectedRoute` verifica el access token y redirige a `/login` si no existe).

### 3.4 Gestión de estado

**Zustand (estado global de cliente):**
```
authStore:          { user, accessToken, setTokens(), clearAuth() }
uiStore:            { sidebarOpen, toggleSidebar() }
notificationStore:  { notifications[], addNotification(), dismissNotification() }
```

**TanStack Query (estado de servidor):**
- Todas las llamadas a la API se encapsulan en custom hooks dentro de `features/[name]/api/`
- Configuración global: `staleTime: 30s`, `refetchOnWindowFocus: true`, `retry: 2`
- Los mutations invalidan queries relacionados tras el éxito (ej: crear contrato invalida la query de contratos)

**React Hook Form + Zod (estado de formularios):**
- Cada formulario tiene su schema Zod correspondiente en `features/[name]/schemas/`
- `@hookform/resolvers/zod` conecta el schema con React Hook Form
- Validación en tiempo real (mode: 'onChange' en formularios críticos)

### 3.5 Instancia Axios y manejo de auth

```
lib/axios.ts (conceptual):

1. Crear instancia con baseURL: import.meta.env.VITE_API_URL
2. Request interceptor: añadir Authorization: Bearer <token> desde authStore
3. Response interceptor (401 handling):
   - Si responde 401 → intentar refresh_token silencioso
   - Si refresh exitoso: reintentar la request original con nuevo token
   - Si refresh falla: clearAuth() + redirect a /login
   - Cola de requests pendientes durante el refresh (para evitar múltiples refreshes paralelos)
```

### 3.6 Patrones de componentes

**Colocación (colocation):** Tests, estilos específicos y tipos de un componente viven en el mismo directorio que el componente.

**Composición sobre herencia:** Los componentes complejos se construyen componiendo primitivos, no extendiendo clases.

**Headless + presentational split:**
- Los componentes de `components/ui/` son presentacionales (solo reciben props, no hacen fetch).
- Los componentes de `features/*/components/` pueden conectarse al store o a queries.
- Las páginas (`features/*/pages/`) orchestran todo: fetch, estado, layout.

---

## 4. ARQUITECTURA BACKEND

### 4.1 Stack y dependencias principales

```json
{
  "fastify": "^4.27",
  "@fastify/jwt": "^8.0",
  "@fastify/cookie": "^9.3",
  "@fastify/cors": "^9.0",
  "@fastify/helmet": "^11.1",
  "@fastify/rate-limit": "^9.1",
  "@fastify/multipart": "^8.1",
  "@fastify/static": "^7.0",
  "@prisma/client": "^5.13",
  "prisma": "^5.13",
  "zod": "^3.22",
  "pino": "^9.1",
  "sharp": "^0.33",
  "tesseract.js": "^5.0",
  "puppeteer": "^22.8",
  "handlebars": "^4.7",
  "bcrypt": "^5.1",
  "uuid": "^9.0",
  "date-fns": "^3.6",
  "date-fns-tz": "^3.1"
}
```

**Por qué Fastify sobre Express:**
- Rendimiento superior (~2x más rápido que Express en benchmarks)
- TypeScript nativo: todo el framework está tipado
- Schema validation incorporado (Ajv/JSON Schema), aunque usaremos Zod para DTOs
- Plugin system bien diseñado: encapsulación y decoradores
- Pino integrado como logger: structured logging desde el inicio
- Mantenido activamente con releases frecuentes

### 4.2 Estructura de carpetas

```
apps/backend/src/
│
├── modules/                           ← Un directorio por módulo de dominio
│   ├── auth/
│   │   ├── auth.controller.ts         ← Handlers de rutas HTTP
│   │   ├── auth.service.ts            ← Lógica de negocio
│   │   ├── auth.routes.ts             ← Registro de rutas en Fastify
│   │   ├── auth.schema.ts             ← Schemas Zod (request/response)
│   │   └── auth.types.ts              ← Tipos locales del módulo
│   │
│   ├── owners/
│   │   ├── owners.controller.ts
│   │   ├── owners.service.ts
│   │   ├── owners.repository.ts       ← Abstracción sobre Prisma
│   │   ├── owners.routes.ts
│   │   ├── owners.schema.ts
│   │   └── owners.types.ts
│   │
│   ├── tenants/                       ← Igual estructura
│   ├── properties/                    ← Igual estructura
│   ├── contracts/
│   │   ├── contracts.controller.ts
│   │   ├── contracts.service.ts       ← Incluye lógica de ICL/IPC
│   │   ├── contracts.repository.ts
│   │   ├── contracts.routes.ts
│   │   ├── contracts.schema.ts
│   │   └── contracts.types.ts
│   │
│   ├── payments/
│   ├── expenses/
│   ├── settlements/
│   │   ├── settlements.service.ts     ← Lógica compleja de consolidación
│   │   └── ...
│   ├── sales/
│   ├── repairs/
│   ├── receipts/
│   ├── reports/
│   ├── ocr/
│   ├── automations/
│   └── dashboard/
│
├── shared/
│   ├── middlewares/
│   │   ├── auth.middleware.ts         ← Verifica JWT, agrega user al request
│   │   ├── error-handler.ts           ← Error handler global de Fastify
│   │   ├── rate-limiter.ts            ← Configuración de límites por ruta
│   │   └── audit-logger.ts            ← Middleware de auditoría para mutaciones
│   │
│   ├── utils/
│   │   ├── pdf-generator.ts           ← Puppeteer wrapper
│   │   ├── ocr-processor.ts           ← Tesseract.js wrapper
│   │   ├── whatsapp-client.ts         ← whatsapp-web.js wrapper
│   │   ├── mailer.ts                  ← Nodemailer o Resend wrapper
│   │   ├── file-storage.ts            ← Abstracción de almacenamiento (local / S3)
│   │   ├── interest-calculator.ts     ← Cálculo de intereses por mora
│   │   ├── index-calculator.ts        ← Cálculo de ajustes ICL/IPC
│   │   └── cron-jobs.ts               ← Tareas programadas (node-cron)
│   │
│   ├── errors/
│   │   ├── AppError.ts                ← Clase base de errores
│   │   ├── HttpError.ts               ← Errores HTTP tipados (400, 401, 403, 404, 409)
│   │   └── codes.ts                   ← Catálogo de códigos de error de negocio
│   │
│   └── types/
│       ├── fastify.d.ts               ← Augmentación de tipos de Fastify (user en request)
│       └── environment.d.ts           ← Tipos de variables de entorno
│
├── prisma/
│   └── client.ts                      ← Singleton del Prisma Client
│
├── config/
│   ├── env.ts                         ← Validación de variables de entorno con Zod
│   └── logger.ts                      ← Configuración de Pino
│
├── app.ts                             ← Inicialización de Fastify, plugins globales
└── server.ts                          ← Entry point: listen en el puerto
```

### 4.3 Patrón Controller → Service → Repository

**Controller:** Responsable exclusivamente del contrato HTTP.
```
- Recibe y valida el request (Zod schema)
- Llama al service con los datos validados
- Devuelve la response con el status code correcto
- No contiene lógica de negocio
```

**Service:** Contiene toda la lógica de negocio.
```
- Orquesta operaciones entre repositorios
- Aplica reglas de negocio (validaciones de dominio)
- Transforma datos
- Llama a servicios externos (OCR, PDF, WhatsApp)
- No sabe nada de HTTP
```

**Repository:** Abstracción sobre Prisma.
```
- Métodos semánticos: findById, findAllByOwnerId, create, update, softDelete
- Construye las queries Prisma
- Maneja includes y relaciones específicas del caso de uso
- Permite mockear en tests sin tocar Prisma directamente
```

### 4.4 Manejo de errores

```
Flujo de errores:

1. Service lanza: throw new HttpError(404, 'OWNER_NOT_FOUND', 'Propietario no encontrado')
2. Controller no captura (deja propagar)
3. Error handler global de Fastify captura:
   → Si es HttpError: responde con { error, code, message } y el status definido
   → Si es ZodError: responde 400 con detalle de campos inválidos
   → Si es PrismaClientKnownRequestError (P2002 unique constraint): responde 409
   → Cualquier otro: loga el stack trace completo, responde 500 genérico

Nunca se expone el stack trace al cliente en producción.
```

### 4.5 Logging con Pino

Pino produce logs en formato JSON estructurado:
```json
{
  "level": "info",
  "time": "2026-05-10T14:32:11Z",
  "reqId": "abc-123",
  "module": "settlements",
  "action": "generate",
  "ownerId": "uuid-...",
  "period": "2026-05",
  "durationMs": 234
}
```

Niveles de log:
- `error`: Errores no esperados, excepciones no manejadas
- `warn`: Errores esperados pero relevantes (validación, recurso no encontrado)
- `info`: Operaciones de negocio exitosas (creación de contrato, liquidación generada)
- `debug`: Detalle de flujo (solo en desarrollo)

Los logs en producción se escriben a stdout y son capturados por Docker log driver.

### 4.6 Variables de entorno

Validación estricta al inicio del proceso con Zod. Si falta alguna variable obligatoria, el servidor no arranca.

```
Variables requeridas:
DATABASE_URL          Cadena de conexión PostgreSQL
JWT_SECRET            Secret para firmar JWT (mín. 64 caracteres)
JWT_REFRESH_SECRET    Secret para refresh tokens
FRONTEND_URL          URL del frontend (para CORS y links en emails)
STORAGE_PATH          Ruta base para almacenamiento de archivos
NODE_ENV              development | staging | production

Variables opcionales (con defaults):
PORT                  Default: 3000
LOG_LEVEL             Default: info
MAX_FILE_SIZE_MB       Default: 10
SESSION_DURATION_MIN   Default: 15 (duración del access token en minutos)
REFRESH_DURATION_DAYS  Default: 7
RATE_LIMIT_LOGIN       Default: 5 (intentos por minuto)
RATE_LIMIT_API         Default: 100 (requests por minuto)
```

### 4.7 Tareas programadas (cron jobs)

```
Frecuencia   Tarea
────────────────────────────────────────────────────────────────────────
Diaria 08:00 Verificar contratos próximos a vencer (60/30/15 días)
             → Crear notificaciones en tabla notifications
             → Enviar WhatsApp/email si automatización activa

Diaria 09:00 Verificar cobros vencidos sin pagar
             → Calcular días de mora
             → Crear recordatorio si supera umbral configurado

Diaria 10:00 Verificar aumentos de alquiler pendientes
             → Notificar al administrador

1° de c/mes Generar lista de cobros esperados del mes
             → Crear registros en payments con status: pending

Diaria 03:00 Backup automático de base de datos (ejecutado via Docker)
```

---

## 5. BASE DE DATOS POSTGRESQL

### 5.1 Decisiones de diseño

**Soft delete universal:** Todas las entidades tienen `deleted_at TIMESTAMP NULL`. Una entidad con `deleted_at IS NOT NULL` está eliminada lógicamente. Prisma filtra automáticamente si se configura middleware de soft delete.

**Auditoría:** La tabla `audit_log` registra todas las operaciones de INSERT, UPDATE y DELETE en entidades críticas. El middleware de auditoría se aplica automáticamente en el service layer.

**UUID como PK:** Se usa `UUID v4` como identificador primario en lugar de SERIAL/BIGINT para:
- Evitar enumeración de IDs en la API
- Facilitar eventual distribución o migración
- Compatibilidad con generación de IDs en el cliente si fuera necesario

**Timestamps:** Todas las tablas tienen `created_at` y `updated_at`. Prisma maneja `updatedAt` automáticamente.

**JSONB para metadatos flexibles:** Los campos OCR (datos extraídos) y la configuración de automatizaciones se almacenan como JSONB para flexibilidad sin migraciones.

**Enums de PostgreSQL:** Los estados y tipos se definen como enums en la base de datos, no como strings arbitrarios. Esto garantiza integridad en el nivel más bajo.

### 5.2 Estrategia de índices

```sql
-- Índices compuestos para consultas frecuentes

-- Cobros por contrato y período (consulta mensual más común)
CREATE INDEX idx_payments_contract_period
  ON payments(contract_id, period_year DESC, period_month DESC);

-- Gastos por propiedad y período
CREATE INDEX idx_expenses_property_period
  ON expenses(property_id, period_year DESC, period_month DESC);

-- Contratos activos (para dashboard y crons diarios)
CREATE INDEX idx_contracts_status_end_date
  ON contracts(status, end_date)
  WHERE deleted_at IS NULL;

-- Notificaciones no leídas
CREATE INDEX idx_notifications_status_created
  ON notifications(status, created_at DESC)
  WHERE status IN ('pending', 'sent');

-- Propiedades disponibles para oferta
CREATE INDEX idx_properties_status
  ON properties(status)
  WHERE deleted_at IS NULL;

-- Búsqueda de propietario por CUIT (lookup en alta de contrato)
CREATE UNIQUE INDEX idx_owners_cuit_cuil
  ON owners(cuit_cuil)
  WHERE deleted_at IS NULL;

-- Búsqueda de inquilino por DNI/CUIT
CREATE UNIQUE INDEX idx_tenants_dni_cuit
  ON tenants(dni_cuit)
  WHERE deleted_at IS NULL;

-- Audit log por entidad (para mostrar historial de cambios)
CREATE INDEX idx_audit_entity
  ON audit_log(table_name, record_id, created_at DESC);
```

### 5.3 Particionamiento (fase futura)

Si la cartera crece a miles de propiedades y años de historial, las tablas `payments`, `expenses` y `audit_log` se convertirán en candidatas a **particionamiento por rango de fecha** (RANGE partitioning por `period_year`). Esta decisión se pospone hasta que el volumen lo justifique (>500k registros en una tabla).

---

## 6. PRISMA ORM

### 6.1 Estructura del schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── ENUMS ──────────────────────────────────────────────────────────────────

enum PersonType       { INDIVIDUAL COMPANY }
enum TaxStatus        { MONOTRIBUTISTA RESPONSABLE_INSCRIPTO EXENTO CONSUMIDOR_FINAL }
enum PropertyType     { HOUSE APARTMENT COMMERCIAL OFFICE LAND GARAGE WAREHOUSE OTHER }
enum PropertyStatus   { AVAILABLE RENTED FOR_SALE SOLD SQUATTED IN_RENOVATION BLOCKED }
enum ExpensePayer     { AGENCY OWNER TENANT SHARED }
enum ContractAdjIndex { ICL_BCRA IPC_INDEC CVS FIXED_RATE NONE }
enum AdjFrequency     { MONTHLY QUARTERLY EVERY_4_MONTHS SEMI_ANNUAL ANNUAL }
enum GuaranteeType    { PERSONAL REAL_ESTATE INSURANCE BANK_GUARANTEE NONE }
enum ContractStatus   { DRAFT ACTIVE EXPIRED TERMINATED RENEWED SUSPENDED }
enum ContractTenantRole { PRIMARY CO_TENANT GUARANTOR }
enum Currency         { ARS USD }
enum PaymentMethod    { CASH TRANSFER CHECK DIRECT_DEBIT MERCADO_PAGO OTHER }
enum PaymentStatus    { PENDING PARTIAL PAID LATE UNCOLLECTABLE }
enum ExpenseType      { ABL ORDINARY_EXPENSES EXTRA_EXPENSES GAS ELECTRICITY
                        WATER INTERNET INSURANCE REPAIR PROVINCIAL_TAX
                        MUNICIPAL_TAX ADMINISTRATIVE OTHER }
enum SettlementStatus { DRAFT GENERATED SENT CLOSED CANCELLED }
enum SaleType         { MANAGED NEW_CAPTATION }
enum SalePipelineStage { CAPTATION PUBLISHED VISITED OFFER ACCEPTED EARNEST
                         DEED_CONTRACT DEED_SIGNED SOLD }
enum SalePartyRole    { SELLER BUYER }
enum RepairUrgency    { URGENT NORMAL LOW }
enum RepairStatus     { REPORTED EVALUATING BUDGETED APPROVED IN_PROGRESS
                        RESOLVED CANCELLED }
enum IncreaseStatus   { PENDING APPLIED SKIPPED }
enum OccupationStatus { ACTIVE REGULARIZED VACATED }
enum OccupationReason { EXPIRED_CONTRACT OWNER_FAMILY CONTRACT_IN_PROGRESS OTHER }
enum NotificationChannel { SYSTEM EMAIL WHATSAPP }
enum NotificationStatus  { PENDING SENT READ ERROR }
enum AuditAction         { INSERT UPDATE DELETE RESTORE }

// ─── MODELS ─────────────────────────────────────────────────────────────────

model Owner {
  id             String      @id @default(uuid())
  type           PersonType
  name           String
  cuitCuil       String      @unique
  taxStatus      TaxStatus?
  fiscalAddress  String?
  phone          String?
  email          String?
  cbu            String?
  bankAlias      String?
  bankName       String?
  notes          String?
  status         String      @default("active")  // active | inactive | blocked

  properties     PropertyOwner[]
  settlements    Settlement[]
  saleSellers    SaleParty[]

  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  deletedAt      DateTime?

  @@map("owners")
}

model Tenant {
  id             String      @id @default(uuid())
  type           PersonType
  name           String
  dniCuit        String      @unique
  birthdate      DateTime?
  address        String?
  workAddress    String?
  employer       String?
  employmentType String?
  phone          String?
  email          String?
  notes          String?
  status         String      @default("active")

  contracts      ContractTenant[]

  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  deletedAt      DateTime?

  @@map("tenants")
}

model Property {
  id                    String          @id @default(uuid())
  type                  PropertyType
  addressStreet         String
  addressNumber         String?
  addressFloor          String?
  addressUnit           String?
  addressZipcode        String?
  addressCity           String
  addressProvince       String
  cadastralId           String?
  deedNumber            String?
  coveredSqm            Decimal?        @db.Decimal(10, 2)
  totalSqm              Decimal?        @db.Decimal(10, 2)
  ageYears              Int?
  rooms                 Int?
  description           String?
  valuationArs          Decimal?        @db.Decimal(15, 2)
  valuationUsd          Decimal?        @db.Decimal(12, 2)
  status                PropertyStatus  @default(AVAILABLE)
  ablPayer              ExpensePayer    @default(OWNER)
  ordinaryExpensesPayer ExpensePayer    @default(TENANT)
  extraExpensesPayer    ExpensePayer    @default(OWNER)
  utilitiesPayer        ExpensePayer    @default(TENANT)
  estimatedExpensesArs  Decimal?        @db.Decimal(10, 2)
  annualAblArs          Decimal?        @db.Decimal(10, 2)
  hasMortgage           Boolean         @default(false)
  hasLien               Boolean         @default(false)
  notes                 String?

  owners                PropertyOwner[]
  contracts             Contract[]
  expenses              Expense[]
  repairs               Repair[]
  photos                PropertyPhoto[]
  informalOccupations   InformalOccupation[]
  sales                 Sale[]

  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt
  deletedAt             DateTime?

  @@map("properties")
}

model PropertyOwner {
  propertyId          String      @map("property_id")
  ownerId             String      @map("owner_id")
  ownershipPercentage Decimal     @db.Decimal(5, 2)

  property            Property    @relation(fields: [propertyId], references: [id])
  owner               Owner       @relation(fields: [ownerId], references: [id])

  @@id([propertyId, ownerId])
  @@map("property_owners")
}

model Contract {
  id                  String          @id @default(uuid())
  propertyId          String          @map("property_id")
  startDate           DateTime        @db.Date
  endDate             DateTime        @db.Date
  durationMonths      Int?
  initialAmount       Decimal         @db.Decimal(12, 2)
  currentAmount       Decimal?        @db.Decimal(12, 2)
  currency            Currency        @default(ARS)
  adjustmentIndex     ContractAdjIndex?
  adjustmentRate      Decimal?        @db.Decimal(5, 2)
  adjustmentFrequency AdjFrequency?
  nextAdjustmentDate  DateTime?       @db.Date
  adminCommissionPct  Decimal?        @db.Decimal(5, 2)
  initialCommission   Decimal?        @db.Decimal(12, 2)
  guaranteeType       GuaranteeType   @default(NONE)
  paymentDay          Int             @default(10)
  status              ContractStatus  @default(DRAFT)
  terminationDate     DateTime?       @db.Date
  terminationReason   String?
  terminationPenalty  Decimal?        @db.Decimal(12, 2)
  specialClauses      String?
  previousContractId  String?         @map("previous_contract_id")
  documentUrl         String?
  ocrLoaded           Boolean         @default(false)
  notes               String?

  property            Property        @relation(fields: [propertyId], references: [id])
  previousContract    Contract?       @relation("ContractRenewals", fields: [previousContractId], references: [id])
  renewals            Contract[]      @relation("ContractRenewals")
  tenants             ContractTenant[]
  payments            Payment[]
  rentIncreases       RentIncrease[]

  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt
  deletedAt           DateTime?

  @@map("contracts")
}

model ContractTenant {
  contractId  String             @map("contract_id")
  tenantId    String             @map("tenant_id")
  role        ContractTenantRole

  contract    Contract           @relation(fields: [contractId], references: [id])
  tenant      Tenant             @relation(fields: [tenantId], references: [id])

  @@id([contractId, tenantId, role])
  @@map("contract_tenants")
}

model Payment {
  id                String        @id @default(uuid())
  contractId        String        @map("contract_id")
  periodMonth       Int
  periodYear        Int
  expectedAmount    Decimal       @db.Decimal(12, 2)
  paidAmount        Decimal?      @db.Decimal(12, 2)
  currency          Currency      @default(ARS)
  exchangeRate      Decimal?      @db.Decimal(10, 2)
  exchangeRateType  String?
  dueDate           DateTime      @db.Date
  paymentDate       DateTime?     @db.Date
  lateDays          Int?
  lateInterest      Decimal?      @db.Decimal(12, 2)
  paymentMethod     PaymentMethod?
  originCbu         String?
  status            PaymentStatus @default(PENDING)
  adjustmentIndex   String?
  adjustmentPct     Decimal?      @db.Decimal(5, 2)
  receiptGenerated  Boolean       @default(false)
  notes             String?

  contract          Contract      @relation(fields: [contractId], references: [id])
  installments      PaymentInstallment[]
  receipt           Receipt?

  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  @@unique([contractId, periodYear, periodMonth])
  @@map("payments")
}

model PaymentInstallment {
  id                String        @id @default(uuid())
  paymentId         String        @map("payment_id")
  installmentNumber Int
  dueDate           DateTime      @db.Date
  amount            Decimal       @db.Decimal(12, 2)
  paidAmount        Decimal?      @db.Decimal(12, 2)
  paymentDate       DateTime?     @db.Date
  status            PaymentStatus @default(PENDING)
  notes             String?

  payment           Payment       @relation(fields: [paymentId], references: [id])

  @@map("payment_installments")
}

model RentIncrease {
  id                  String         @id @default(uuid())
  contractId          String         @map("contract_id")
  applicationDate     DateTime       @db.Date
  indexName           String
  previousIndexValue  Decimal?       @db.Decimal(10, 4)
  newIndexValue       Decimal?       @db.Decimal(10, 4)
  percentageApplied   Decimal        @db.Decimal(6, 2)
  amountBefore        Decimal        @db.Decimal(12, 2)
  amountAfter         Decimal        @db.Decimal(12, 2)
  status              IncreaseStatus @default(PENDING)
  skipReason          String?

  contract            Contract       @relation(fields: [contractId], references: [id])

  createdAt           DateTime       @default(now())

  @@map("rent_increases")
}

model Expense {
  id                String       @id @default(uuid())
  propertyId        String       @map("property_id")
  contractId        String?      @map("contract_id")
  type              ExpenseType
  description       String?
  periodMonth       Int?
  periodYear        Int?
  amount            Decimal      @db.Decimal(12, 2)
  currency          Currency     @default(ARS)
  payer             ExpensePayer
  agencyPct         Decimal?     @db.Decimal(5, 2)
  ownerPct          Decimal?     @db.Decimal(5, 2)
  tenantPct         Decimal?     @db.Decimal(5, 2)
  dueDate           DateTime?    @db.Date
  paymentDate       DateTime?    @db.Date
  status            String       @default("pending")  // pending | paid | overdue
  affectsSettlement Boolean      @default(true)
  affectsTenantCharge Boolean    @default(false)
  receiptUrl        String?
  repairId          String?
  notes             String?

  property          Property     @relation(fields: [propertyId], references: [id])

  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  deletedAt         DateTime?

  @@map("expenses")
}

model Settlement {
  id                String           @id @default(uuid())
  ownerId           String           @map("owner_id")
  periodMonth       Int
  periodYear        Int
  grossIncome       Decimal          @db.Decimal(12, 2)
  totalExpenses     Decimal          @db.Decimal(12, 2)
  totalCommissions  Decimal          @db.Decimal(12, 2)
  netAmount         Decimal          @db.Decimal(12, 2)
  currency          String           @default("ARS")  // ARS | USD | MIXED
  exchangeRate      Decimal?         @db.Decimal(10, 2)
  status            SettlementStatus @default(DRAFT)
  pdfUrl            String?
  sentDate          DateTime?
  transferDate      DateTime?        @db.Date
  transferReceiptUrl String?
  notes             String?

  owner             Owner            @relation(fields: [ownerId], references: [id])
  items             SettlementItem[]
  receipt           Receipt?

  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  @@unique([ownerId, periodYear, periodMonth])
  @@map("settlements")
}

model SettlementItem {
  id            String     @id @default(uuid())
  settlementId  String     @map("settlement_id")
  type          String     // payment | expense | commission | adjustment | other
  description   String
  propertyId    String?
  amount        Decimal    @db.Decimal(12, 2)
  currency      Currency
  isDebit       Boolean    @default(false)
  referenceId   String?

  settlement    Settlement @relation(fields: [settlementId], references: [id])

  @@map("settlement_items")
}

model Sale {
  id                    String            @id @default(uuid())
  propertyId            String            @map("property_id")
  type                  SaleType
  listPriceAmount       Decimal?          @db.Decimal(12, 2)
  listPriceCurrency     Currency?
  acceptedOfferAmount   Decimal?          @db.Decimal(12, 2)
  acceptedOfferCurrency Currency?
  paymentType           String?
  earnestAmount         Decimal?          @db.Decimal(12, 2)
  earnestDate           DateTime?         @db.Date
  deedAmount            Decimal?          @db.Decimal(12, 2)
  deedDate              DateTime?         @db.Date
  notaryName            String?
  estimatedClosingDate  DateTime?         @db.Date
  commissionPctSeller   Decimal?          @db.Decimal(5, 2)
  commissionPctBuyer    Decimal?          @db.Decimal(5, 2)
  totalCommission       Decimal?          @db.Decimal(12, 2)
  pipelineStage         SalePipelineStage @default(CAPTATION)
  notes                 String?

  property              Property          @relation(fields: [propertyId], references: [id])
  parties               SaleParty[]
  offers                SaleOffer[]

  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt
  deletedAt             DateTime?

  @@map("sales")
}

model SaleParty {
  id               String       @id @default(uuid())
  saleId           String       @map("sale_id")
  role             SalePartyRole
  ownerId          String?      @map("owner_id")
  name             String?
  cuitCuil         String?
  ownershipPct     Decimal?     @db.Decimal(5, 2)

  sale             Sale         @relation(fields: [saleId], references: [id])
  owner            Owner?       @relation(fields: [ownerId], references: [id])

  @@map("sale_parties")
}

model SaleOffer {
  id              String    @id @default(uuid())
  saleId          String    @map("sale_id")
  offerAmount     Decimal   @db.Decimal(12, 2)
  offerCurrency   Currency
  offerDate       DateTime  @db.Date
  buyerName       String?
  status          String    @default("pending")  // pending | accepted | rejected | withdrawn
  rejectionReason String?
  notes           String?

  sale            Sale      @relation(fields: [saleId], references: [id])

  @@map("sale_offers")
}

model Repair {
  id              String        @id @default(uuid())
  propertyId      String        @map("property_id")
  contractId      String?       @map("contract_id")
  reportedBy      String        // tenant | owner | agency
  reportDate      DateTime      @db.Date
  description     String
  type            String
  urgency         RepairUrgency @default(NORMAL)
  providerName    String?
  budgetAmount    Decimal?      @db.Decimal(12, 2)
  finalCost       Decimal?      @db.Decimal(12, 2)
  costPayer       ExpensePayer  @default(OWNER)
  status          RepairStatus  @default(REPORTED)
  resolutionDate  DateTime?     @db.Date
  expenseId       String?
  notes           String?

  property        Property      @relation(fields: [propertyId], references: [id])
  photos          RepairPhoto[]

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@map("repairs")
}

model RepairPhoto {
  id        String    @id @default(uuid())
  repairId  String    @map("repair_id")
  url       String
  type      String    // before | after | during
  takenAt   DateTime?
  notes     String?

  repair    Repair    @relation(fields: [repairId], references: [id])

  @@map("repair_photos")
}

model PropertyPhoto {
  id          String    @id @default(uuid())
  propertyId  String    @map("property_id")
  url         String
  type        String    // entry | exit | repair | marketing | document | general
  contractId  String?
  takenAt     DateTime?
  notes       String?

  property    Property  @relation(fields: [propertyId], references: [id])

  createdAt   DateTime  @default(now())

  @@map("property_photos")
}

model Document {
  id           String    @id @default(uuid())
  entityType   String    // owner | tenant | property | contract | sale
  entityId     String
  name         String
  type         String    // dni | contract | deed | invoice | power_of_attorney | etc.
  url          String
  sizeBytes    Int?
  mimeType     String?
  ocrProcessed Boolean   @default(false)
  ocrData      Json?
  notes        String?

  createdAt    DateTime  @default(now())
  deletedAt    DateTime?

  @@map("documents")
}

model Receipt {
  id            String    @id @default(uuid())
  type          String    // payment_receipt | settlement_receipt
  paymentId     String?   @unique @map("payment_id")
  settlementId  String?   @unique @map("settlement_id")
  receiptNumber String
  recipientName String
  sendChannels  Json      // string[]
  status        String    @default("generated")  // generated | sent | delivered | error
  sentAt        DateTime?
  pdfUrl        String?

  payment       Payment?   @relation(fields: [paymentId], references: [id])
  settlement    Settlement? @relation(fields: [settlementId], references: [id])

  createdAt     DateTime  @default(now())

  @@map("receipts")
}

model InformalOccupation {
  id                    String            @id @default(uuid())
  propertyId            String            @map("property_id")
  occupantName          String
  occupantPhone         String?
  startDate             DateTime          @db.Date
  reason                OccupationReason
  informalAmount        Decimal?          @db.Decimal(12, 2)
  currency              Currency?
  status                OccupationStatus  @default(ACTIVE)
  endDate               DateTime?         @db.Date
  convertedToContractId String?

  property              Property          @relation(fields: [propertyId], references: [id])

  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt

  @@map("informal_occupations")
}

model AutomationRule {
  id            String    @id @default(uuid())
  name          String
  triggerEvent  String    // contract_expiring_60d | payment_late_7d | etc.
  actionType    String    // send_whatsapp | send_email | create_alert | generate_receipt
  actionConfig  Json
  isActive      Boolean   @default(true)

  createdAt     DateTime  @default(now())

  @@map("automation_rules")
}

model Notification {
  id          String                @id @default(uuid())
  type        String
  entityType  String?
  entityId    String?
  title       String
  message     String
  channel     NotificationChannel
  status      NotificationStatus    @default(PENDING)
  sentAt      DateTime?
  readAt      DateTime?

  createdAt   DateTime              @default(now())

  @@map("notifications")
}

model AuditLog {
  id            String       @id @default(uuid())
  tableName     String
  recordId      String
  action        AuditAction
  changedFields Json?
  performedBy   String
  ipAddress     String?

  createdAt     DateTime     @default(now())

  @@map("audit_log")
}

model SystemConfig {
  key         String    @id
  value       String
  type        String    // string | number | boolean | json
  description String?
  updatedAt   DateTime  @updatedAt

  @@map("system_config")
}
```

### 6.2 Migrations y seeds

**Naming de migrations:** `YYYYMMDD_HHMMSS_descripcion_accion`
```
20260501_120000_create_initial_schema
20260510_143000_add_sale_offers_table
20260515_090000_add_informal_occupations
```

**Seeds para desarrollo:**
```
prisma/seeds/
├── 01-system-config.ts    ← Configuración del sistema (tasa BNA, % default, etc.)
├── 02-admin-user.ts       ← Usuario administrador de prueba
├── 03-owners.ts           ← 5 propietarios de prueba
├── 04-tenants.ts          ← 10 inquilinos de prueba
├── 05-properties.ts       ← 15 propiedades de prueba
├── 06-contracts.ts        ← 12 contratos activos con distintas configs
├── 07-payments.ts         ← Cobros históricos de 6 meses
└── index.ts               ← Orquesta el orden de ejecución
```

---

## 7. MANEJO DOCUMENTAL Y ARCHIVOS

### 7.1 Estrategia de almacenamiento

**MVP (desarrollo y staging):**
```
apps/backend/uploads/         ← volumen montado en Docker
├── owners/{ownerId}/         ← DNIs, poderes
├── tenants/{tenantId}/       ← DNIs, recibos de sueldo
├── properties/{propertyId}/  ← escrituras, planos
│   └── photos/               ← fotos de la propiedad
├── contracts/{contractId}/   ← contratos escaneados
├── expenses/{expenseId}/     ← facturas de gastos
├── repairs/{repairId}/       ← fotos de reparaciones
└── temp/                     ← archivos temporales OCR (se limpian cada 24h)
```

**Producción:**
La abstracción `file-storage.ts` expone la misma interfaz independientemente del backend:
```typescript
interface FileStorage {
  save(file: Buffer, path: string, mimeType: string): Promise<string>  // returns URL
  delete(path: string): Promise<void>
  getSignedUrl(path: string, expiresInSeconds: number): Promise<string>
}

// Implementación MVP: LocalFileStorage (escribe en /uploads)
// Implementación prod: MinIOStorage (S3-compatible, auto-hosted)
// Implementación cloud: S3Storage (AWS S3)
```

### 7.2 Configuración de Multer (Fastify Multipart)

```
Límites de archivos:
  Tamaño máximo: 10 MB por archivo (configurable en env MAX_FILE_SIZE_MB)
  Tipos permitidos por contexto:
    Documentos:   PDF, JPG, PNG, WEBP
    Fotos:        JPG, PNG, WEBP, HEIC
    OCR:          JPG, PNG, PDF (max 5 páginas en MVP)
    Contratos:    PDF, JPG, PNG

Naming de archivos guardados:
  {uuid()}.{extensión_original}
  Ejemplo: 3f7a9b2c-1d4e-4c8f-a9b1-2d3e4f5a6b7c.pdf
  (Nunca el nombre original: evita path traversal y conflictos)

Compresión automática de imágenes (sharp.js):
  Fotos de propiedades: max 1920x1080, calidad 85%, formato WebP
  Fotos de reparaciones: max 1280x960, calidad 80%, formato WebP
  Documentos escaneados: sin compresión (preservar calidad para OCR)
```

### 7.3 Documentos contractuales — inmutabilidad

Los contratos escaneados adjuntos a un contrato **no pueden eliminarse**, solo desactivarse (`deleted_at`). Esto garantiza que el historial documental siempre esté accesible, incluso para contratos vencidos o rescindidos.

---

## 8. OCR — RECONOCIMIENTO ÓPTICO DE CARACTERES

### 8.1 Stack técnico

| Librería | Rol |
|---|---|
| `@fastify/multipart` | Recepción del archivo subido |
| `sharp` | Preprocesamiento de imagen (resize, contraste, escala de grises) |
| `tesseract.js` | Motor OCR (wasm, sin dependencias nativas) |
| `pdf2pic` | Conversión de páginas PDF a imágenes para Tesseract |
| Expresiones regulares | Extracción de campos del texto bruto |

### 8.2 Pipeline detallado

```
ENTRADA: archivo JPG/PNG/PDF (multipart)
         │
         ▼
PASO 1: VALIDACIÓN
  → Verificar tipo MIME
  → Verificar tamaño (< 10MB)
  → Si PDF: verificar que no esté protegido con contraseña
  → Guardar en /uploads/temp/{uuid}.{ext}

PASO 2: PREPROCESAMIENTO (sharp.js)
  Para imágenes:
    → Convertir a escala de grises
    → Aumentar contraste (factor 1.4)
    → Normalizar niveles
    → Resize a máximo 2480px de ancho (A4 a 300DPI)
    → Guardar como PNG temporal
  Para PDFs:
    → Convertir cada página a imagen PNG 300DPI (pdf2pic)
    → Procesar cada imagen con los pasos anteriores
    → Concatenar texto de todas las páginas

PASO 3: OCR (Tesseract.js, lang: spa)
  → Procesar imagen preprocessada
  → Obtener: texto bruto + coordenadas + confidence por palabra
  → Confidence promedio por bloque de texto

PASO 4: EXTRACCIÓN DE CAMPOS (regex + heurística)

  Campo            Patrón principal
  ─────────────────────────────────────────────────────────────
  fechaInicio      \b(\d{1,2})[/\-\s](\d{1,2})[/\-\s](\d{4})\b
                   "(\d{1,2}) de (enero|febrero|...) de (\d{4})"
  fechaFin         Mismos patrones, contexto: "hasta el", "vence"
  monto            \$\s*[\d.,]+  |  USD\s*[\d.,]+  |  pesos\s*[\d.,]+
  moneda           "dólares" | "USD" | "pesos" | "$"
  cuil             \d{2}-\d{7,8}-\d{1}
  locatario        contexto: "locatario/a:", "el/la Sr./Sra."
  propiedadDir     contexto: "inmueble ubicado en", "propiedad sita"
  indiceAjuste     "ICL" | "IPC" | "UVA" | "índice"
  periodicidad     "trimestral" | "cuatrimestral" | "semestral" | "mensual"
  comision         "\d+(\.\d+)?%.*(?:comisión|administración)"

PASO 5: SCORING
  Para cada campo extraído:
    → HIGH:   regex match único + confidence OCR > 85%
    → MEDIUM: regex match único + confidence OCR 60–85%
    → LOW:    regex match ambiguo o confidence OCR < 60%
    → NULL:   campo no encontrado

PASO 6: RESPONSE AL FRONTEND
{
  "fields": {
    "startDate":     { "value": "2024-03-01", "confidence": "HIGH" },
    "endDate":       { "value": "2026-02-28", "confidence": "HIGH" },
    "monthlyAmount": { "value": "350000",     "confidence": "MEDIUM" },
    "currency":      { "value": "ARS",        "confidence": "HIGH" },
    "tenantName":    { "value": "Juan Pérez", "confidence": "LOW" },
    "adjustIndex":   { "value": "ICL_BCRA",   "confidence": "HIGH" },
    "frequency":     { "value": "QUARTERLY",  "confidence": "MEDIUM" },
    "adminPct":      { "value": null,         "confidence": null }
  },
  "rawText": "...",
  "overallConfidence": 0.74
}

PASO 7: LIMPIEZA
  → Eliminar archivos temporales de /uploads/temp/
  → Guardar el documento original en /uploads/contracts/{id}/
```

### 8.3 Consideraciones de rendimiento

Tesseract.js en Node.js puede tardar entre **3 y 15 segundos** por página según la calidad y el hardware del servidor. Para el MVP (una inmobiliaria, un administrador, uso esporádico) esto es aceptable. 

Si el tiempo de respuesta resulta problemático, se puede procesar de forma asíncrona:
1. Subir el archivo → response inmediata con `{ jobId }`
2. El backend procesa en background
3. El frontend hace polling a `/api/v1/ocr/jobs/{jobId}` hasta que el status sea `completed`

---

## 9. GENERACIÓN DE PDFS

### 9.1 Librería seleccionada: Puppeteer + Handlebars

**Decisión: Puppeteer (headless Chrome) sobre PDFKit.**

**Justificación:**
- Puppeteer renderiza HTML/CSS completo → los PDFs tienen exactamente el aspecto de un diseño web
- Con Tailwind CSS se pueden mantener los estilos en sincronía con el frontend
- Las tablas complejas de liquidaciones son triviales en HTML/CSS, complejas en PDFKit
- Handlebars provee templating familiar con loops, condicionales y helpers

**Contra:** Puppeteer requiere un chromium instalado (~150MB). En Docker esto es aceptable.

### 9.2 Estrategia de templates

```
apps/backend/src/shared/utils/pdf/
├── templates/
│   ├── receipt.hbs          ← Recibo de cobro
│   ├── settlement.hbs       ← Liquidación mensual
│   ├── report-owner.hbs     ← Reporte mensual del propietario
│   └── contract-draft.hbs   ← Borrador de contrato
├── helpers/
│   ├── formatARS.ts         ← $1.234.567,89
│   ├── formatUSD.ts         ← USD 1,234.56
│   ├── formatDate.ts        ← 10 de mayo de 2026
│   └── statusBadge.ts
└── pdf-generator.ts         ← Wrapper de Puppeteer
```

### 9.3 Flujo de generación

```
1. Service llama: generatePdf('receipt', data)
2. pdf-generator.ts:
   a. Carga el template HBS correspondiente
   b. Compila con Handlebars.compile(template)(data)
   c. Lanza Puppeteer headless (instancia compartida, warm)
   d. Abre una nueva page
   e. page.setContent(htmlString)
   f. page.pdf({ format: 'A4', printBackground: true, margin: {...} })
   g. Devuelve Buffer con el PDF
3. El controller hace:
   reply.type('application/pdf')
        .header('Content-Disposition', 'inline; filename="recibo-001.pdf"')
        .send(pdfBuffer)

Los PDFs se generan on-demand y no se almacenan en disco por defecto.
Si se necesita enviar por WhatsApp/email, se guarda temporalmente y se limpia tras el envío.
```

### 9.4 Datos por template

**Recibo de cobro:**
- Número de recibo, fecha, período
- Nombre y domicilio de la inmobiliaria, logo
- Nombre del inquilino, propiedad
- Monto base, ajuste aplicado (índice, %, monto del ajuste)
- Interés por mora (si aplica)
- Total cobrado
- Forma de pago
- Leyenda: "El presente recibo acredita el pago del período..."

**Liquidación mensual:**
- Encabezado con datos de inmobiliaria y propietario
- Tabla de ingresos (por propiedad)
- Tabla de egresos (gastos con descripción)
- Tabla de comisiones
- Resumen: bruto - egresos - comisiones = neto
- CBU de transferencia
- Pie: firma, CUIT, datos de contacto

---

## 10. INTEGRACIÓN WHATSAPP

### 10.1 Librería seleccionada: whatsapp-web.js

**Alternativas evaluadas:**

| Opción | Costo | Complejidad | Confiabilidad |
|---|---|---|---|
| **whatsapp-web.js** | Gratuito | Baja | Media (no oficial) |
| Twilio WhatsApp API | ~$0.05/msg | Media | Alta |
| Meta Business API | Requiere verificación | Alta | Muy alta |

**Decisión para MVP: whatsapp-web.js**

Justificación:
- Costo cero es relevante para el MVP de una sola inmobiliaria
- Una inmobiliaria pequeña no justifica el proceso de verificación de Meta Business
- El volumen de mensajes es bajo (decenas por mes, no miles)
- La confiabilidad media es aceptable para notificaciones no críticas (siempre hay alternativa por email)

**Consideración importante:** whatsapp-web.js es una librería no oficial que automatiza la interfaz web de WhatsApp. Si WhatsApp cambia su interfaz o bloquea el número, puede dejar de funcionar. Para Fase 3 se migrará a Meta Business API.

### 10.2 Implementación

```
Flujo de inicialización:
1. El servidor arranca y crea instancia de Client (whatsapp-web.js)
2. Genera código QR y lo expone en /api/v1/whatsapp/qr (solo admin)
3. El administrador escanea el QR con su teléfono una vez
4. La sesión queda persistida en el volumen Docker (/whatsapp-session/)
5. Reconexión automática si se interrumpe la sesión

Envío de mensajes:
  client.sendMessage(
    number + '@c.us',  // formato requerido: 5491122334455@c.us
    messageBody
  )

Para archivos PDF (recibos):
  const media = new MessageMedia(
    'application/pdf',
    pdfBuffer.toString('base64'),
    'recibo-enero-2026.pdf'
  )
  client.sendMessage(number + '@c.us', media)
```

### 10.3 Formato de mensajes

Los mensajes son configurables como templates en la tabla `automation_rules`.

**Ejemplo — recordatorio de pago:**
```
Hola {{nombre}}, te recordamos que el alquiler del departamento en 
{{dirección}} correspondiente al período {{periodo}} vencía el {{fecha_vencimiento}}.
El monto adeudado es de {{monto}}.
Ante cualquier consulta, comuníquese con la administración.
Gracias.
```

**Ejemplo — recibo de cobro:**
```
{{nombre}}, adjuntamos el recibo Nº {{numero_recibo}} por el pago 
del período {{periodo}} del inmueble {{dirección}}. 
Monto: {{monto}}. Muchas gracias.
[Adjunto: recibo.pdf]
```

---

## 11. SEGURIDAD

### 11.1 Autenticación JWT

```
Access Token:
  Algoritmo: HS256
  Payload: { sub: userId, email, iat, exp }
  Expiración: 15 minutos
  Almacenamiento frontend: memoria (Zustand store, NO localStorage)

Refresh Token:
  Algoritmo: HS256 (secret diferente)
  Payload: { sub: userId, tokenVersion, iat, exp }
  Expiración: 7 días
  Almacenamiento: httpOnly cookie (SameSite: Strict, Secure en prod)
  Almacenamiento en DB: tabla user_sessions (para revocación)
  tokenVersion: incrementar en logout para invalidar todos los refresh tokens activos
```

### 11.2 Rate Limiting

```
Endpoint de login:        5 intentos / minuto / IP
Endpoint de refresh:      10 intentos / minuto / IP
Endpoints de API general: 100 requests / minuto / usuario
Upload de archivos:       10 uploads / minuto / usuario
Endpoint OCR:             5 requests / minuto / usuario (costoso computacionalmente)
```

### 11.3 Validación y sanitización

- **Zod** valida todos los payloads entrantes en el controller antes de llegar al service.
- **Nunca** se interpolan valores del usuario directamente en queries (Prisma usa prepared statements internamente).
- Los nombres de archivo subidos son **reemplazados** por UUIDs generados internamente (no se guarda el nombre original).
- Los uploads se validan por **MIME type real** (magic bytes del buffer), no solo por extensión.
- El contenido de los templates Handlebars se escapea por defecto (XSS prevention en PDFs).

### 11.4 Headers de seguridad (Helmet)

```
Content-Security-Policy: default-src 'self'; img-src 'self' data:; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### 11.5 CORS

```
Origen permitido: solo el valor de env FRONTEND_URL
Métodos: GET, POST, PATCH, DELETE, OPTIONS
Headers: Content-Type, Authorization
Credentials: true (para cookies de refresh token)
```

### 11.6 Contraseñas

```
Hash: bcrypt con cost factor 12
Mínimo: 8 caracteres
La contraseña nunca se loguea ni se incluye en audit_log
Al cambiar contraseña: invalidar todas las sesiones activas (incrementar tokenVersion)
```

### 11.7 Backups automáticos

```dockerfile
# Servicio pgbackup en Docker Compose
# Ejecuta pg_dump diariamente a las 03:00 AM (cron interno del contenedor)

Retención:
  Diarios: últimos 7 días
  Semanales: últimas 4 semanas
  Mensuales: últimos 3 meses

Destino: volumen Docker /backups/ (debe ser persistente y respaldado externamente)

Formato: pg_dump --format=custom (más eficiente y restaurable por pg_restore)
Compresión: gzip
Naming: backup_YYYYMMDD_HHMMSS.dump.gz
```

### 11.8 Audit Log

Las siguientes operaciones generan un registro en `audit_log` automáticamente:

| Operación | Registra |
|---|---|
| Login exitoso / fallido | IP, user, timestamp |
| Crear/editar/eliminar contrato | Campos cambiados con valores anterior/nuevo |
| Registrar/editar cobro | Monto, estado, fecha |
| Generar/cerrar liquidación | Todos los items |
| Eliminar cualquier entidad (soft delete) | User, motivo si aplica |
| Cambio de contraseña | Timestamp, IP |
| Modificar configuración del sistema | Campo, valor anterior, nuevo |

---

## 12. DOCKER Y DOCKER COMPOSE

### 12.1 Servicios definidos

```yaml
# docker-compose.yml — Entorno de desarrollo

version: '3.9'

services:

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"          # Solo expuesto en dev; no exponer en prod
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: docker/backend.Dockerfile
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      NODE_ENV: ${NODE_ENV}
      PORT: 3000
      STORAGE_PATH: /app/uploads
    volumes:
      - ./apps/backend:/app/apps/backend      # hot reload en dev
      - uploads_data:/app/uploads
      - whatsapp_session:/app/whatsapp-session
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build:
      context: .
      dockerfile: docker/frontend.Dockerfile
      target: development
    volumes:
      - ./apps/frontend:/app/apps/frontend    # hot reload en dev
    ports:
      - "5173:5173"                           # Puerto de Vite dev server
    environment:
      VITE_API_URL: http://localhost:3000

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./docker/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
      - ssl_certs:/etc/nginx/ssl                # Certificados SSL (prod)
    depends_on:
      - backend
      - frontend

  pgbackup:
    image: postgres:16-alpine
    environment:
      PGPASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - backups_data:/backups
    entrypoint: >
      sh -c "while true; do
        pg_dump -h postgres -U ${POSTGRES_USER} -Fc ${POSTGRES_DB} |
        gzip > /backups/backup_$$(date +%Y%m%d_%H%M%S).dump.gz &&
        find /backups -name '*.dump.gz' -mtime +7 -delete;
        sleep 86400;
      done"
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
  uploads_data:
  backups_data:
  whatsapp_session:
  ssl_certs:
```

### 12.2 Multi-stage Dockerfiles

**Backend Dockerfile:**
```
Stage 1: base
  → node:20-alpine
  → Instala pnpm

Stage 2: deps
  → Copia package.json y pnpm-lock.yaml
  → pnpm install --frozen-lockfile

Stage 3: builder
  → Copia código fuente
  → pnpm build (tsc)
  → npx prisma generate

Stage 4: runner (producción)
  → node:20-alpine (imagen mínima)
  → Copia solo /dist y node_modules
  → Instala Chromium (para Puppeteer)
  → USER node (no root)
  → CMD ["node", "dist/server.js"]
```

**Frontend Dockerfile:**
```
Stage 1: development
  → node:20-alpine
  → vite dev (para docker-compose dev)

Stage 2: builder
  → Instala deps
  → pnpm build (vite build)

Stage 3: runner (producción)
  → nginx:alpine
  → Copia /dist del stage builder a /usr/share/nginx/html
  → Copia nginx config
  → Expone puerto 80
```

### 12.3 Configuración Nginx

```nginx
# docker/nginx/default.conf

server {
  listen 443 ssl http2;
  server_name admin.inmobiliaria.com;

  ssl_certificate     /etc/nginx/ssl/fullchain.pem;
  ssl_certificate_key /etc/nginx/ssl/privkey.pem;
  ssl_protocols       TLSv1.2 TLSv1.3;

  # Servir SPA de React
  location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;  # SPA routing: fallback a index.html
    expires 1h;
    add_header Cache-Control "public, max-age=3600";
  }

  # Assets con hash (Vite genera nombres con hash): caché larga
  location ~* \.(js|css|png|jpg|webp|woff2)$ {
    root /usr/share/nginx/html;
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # Proxy al backend API
  location /api/ {
    proxy_pass http://backend:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 10m;  # para uploads
  }

  # Uploads (servir archivos directamente desde Nginx)
  location /uploads/ {
    alias /app/uploads/;
    internal;  # Solo accesible via X-Accel-Redirect desde el backend
  }
}

# Redirect HTTP → HTTPS
server {
  listen 80;
  return 301 https://$host$request_uri;
}
```

---

## 13. CI/CD

### 13.1 Pipeline de GitHub Actions

**Workflow CI (en cada PR):**
```yaml
name: CI

on:
  pull_request:
    branches: [main, develop]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm build

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test_db
          JWT_SECRET: test_secret_minimum_64_chars_required_for_testing_purposes_only
          JWT_REFRESH_SECRET: test_refresh_secret_minimum_64_chars_required_for_testing_purposes
```

**Workflow Deploy (en merge a main):**
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker images
        run: |
          docker build -t ghcr.io/${{ github.repository }}/backend:latest -f docker/backend.Dockerfile .
          docker build -t ghcr.io/${{ github.repository }}/frontend:latest -f docker/frontend.Dockerfile .
      - name: Push to GHCR
        run: |
          echo ${{ secrets.GITHUB_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin
          docker push ghcr.io/${{ github.repository }}/backend:latest
          docker push ghcr.io/${{ github.repository }}/frontend:latest
      - name: Deploy to server via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PROD_SERVER_HOST }}
          username: ${{ secrets.PROD_SERVER_USER }}
          key: ${{ secrets.PROD_SERVER_KEY }}
          script: |
            cd /opt/inmobiliaria
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d
            docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

### 13.2 Entornos

| Entorno | Branch | URL | Base de datos |
|---|---|---|---|
| Development | feature/* | localhost | PostgreSQL local (Docker) |
| Staging | develop | staging.inmobiliaria.com | PostgreSQL staging |
| Production | main | admin.inmobiliaria.com | PostgreSQL producción |

---

## 14. TESTING

### 14.1 Estrategia general

```
Pirámide de testing:

       /\
      /  \
     / E2E \       ← Playwright: 5–10 flujos críticos
    /────────\
   /Integration\   ← Vitest + Supertest: endpoints críticos (~30 tests)
  /────────────\
 /    Unit      \  ← Vitest: lógica de cálculo pura (~50 tests)
/────────────────\
```

### 14.2 Tests unitarios (Vitest)

**Prioridad: lógica de cálculo**

```
Qué testear con unit tests:
✓ calculateRentIncrease(amount, indexBefore, indexAfter) → monto actualizado
✓ calculateLateInterest(amount, bnaTasaAnual, lateDays) → interés calculado
✓ calculateSettlement(payments[], expenses[], commissionPct) → neto
✓ calculateNextAdjustmentDate(startDate, frequency) → próxima fecha
✓ validateCuit(cuit) → true/false
✓ validateCbu(cbu) → true/false
✓ applyPartialPayment(totalDebt, interestAmount, partialPayment) → saldo
```

### 14.3 Tests de integración (Vitest + Supertest)

**Requieren PostgreSQL de test (servicio en CI):**

```
Qué testear con integration tests:
✓ POST /api/v1/auth/login → 200 con token válido
✓ POST /api/v1/auth/login → 401 con credenciales inválidas
✓ GET /api/v1/owners → 401 sin token
✓ POST /api/v1/contracts → 201 crea contrato, propiedad pasa a RENTED
✓ POST /api/v1/payments → 201, calcula mora correctamente
✓ POST /api/v1/settlements → 201, consolida ítems correctamente
✓ DELETE /api/v1/owners/:id → 200, soft delete (deleted_at set)
✓ PATCH /api/v1/contracts/:id/terminate → 200, estado CONTRACT pasa a TERMINATED
```

Cada test usa **transacciones que se revierten** al finalizar (no contamina la DB de test).

### 14.4 Tests E2E (Playwright)

**Flujos críticos a cubrir:**

```
1. Login y acceso al dashboard
2. Crear propietario → crear propiedad → vincular propietario
3. Crear contrato completo (wizard 4 pasos)
4. Registrar cobro → verificar que se genera oferta de recibo
5. Generar liquidación mensual → verificar PDF descargable
6. Cargar contrato con OCR → verificar campos pre-completados
7. Registrar venta → avanzar pipeline hasta escritura
```

### 14.5 Testing frontend (Vitest + React Testing Library)

```
Qué testear en frontend:
✓ Componentes de formulario con validación (valores inválidos muestran errores)
✓ Componentes de tabla con sorting y filtering
✓ Hook useContractAdjustment (lógica de cálculo de próximas fechas)
✓ Formateo de montos ARS/USD
✓ ProtectedRoute redirige a /login si no hay token
```

---

## 15. ESCALABILIDAD FUTURA

### 15.1 Multiusuario con roles (Fase 2–3)

La adición de múltiples usuarios es un cambio de arquitectura controlado:

```sql
TABLE users (
  id          UUID PRIMARY KEY,
  email       VARCHAR UNIQUE NOT NULL,
  password    VARCHAR NOT NULL,
  name        VARCHAR NOT NULL,
  role        ENUM('admin', 'operator', 'viewer'),
  is_active   BOOLEAN DEFAULT TRUE,
  ...
)
```

El middleware de auth ya recibe un user object; agregar `role` a ese objeto es el único cambio en el core. Los endpoints se protegen con un decorator de rol:

```typescript
// Ejemplo conceptual
fastify.get('/settlements', { preHandler: [requireRole('admin', 'operator')] }, handler)
```

### 15.2 Multi-inmobiliaria / SaaS (Fase 3+)

Si el sistema evoluciona a servir múltiples inmobiliarias:

```sql
TABLE tenants_saas (  -- "tenant" en sentido SaaS (no inquilino)
  id          UUID PRIMARY KEY,
  slug        VARCHAR UNIQUE,  -- subdomain: miinmobiliaria.app.com
  name        VARCHAR,
  plan        ENUM('starter', 'professional', 'enterprise'),
  ...
)
-- Todas las demás tablas reciben: tenant_id UUID NOT NULL
```

El middleware agrega `tenantId` al contexto de cada request y todos los repositorios filtran por él. Este es un cambio invasivo pero predecible si la separación de módulos es correcta.

### 15.3 Separación a servicios (si el volumen lo justifica)

Los módulos que más recursos consumen son candidatos naturales a extracción:
- **Servicio OCR:** CPU-intensivo, puede escalarse horizontalmente de forma independiente
- **Servicio de PDFs:** Puppeteer tiene overhead de memoria, puede separarse con una cola de trabajo
- **Servicio de notificaciones:** WhatsApp y email pueden procesarse de forma asíncrona con BullMQ + Redis

Esta separación no requiere refactoring del dominio si la arquitectura de módulos fue respetada.

---

## 16. APIS FUTURAS

### 16.1 BCRA — Índice ICL (Disponible hoy)

```
Endpoint público:
GET https://api.bcra.gob.ar/estadisticas/v1/principalesvariables

Para ICL específicamente:
GET https://api.bcra.gob.ar/estadisticas/v1/datosVariable/25/{desde}/{hasta}
(Variable 25 = ICL)

Implementación:
  index-calculator.ts consulta la API en la fecha de actualización de cada contrato
  Almacena el valor histórico en rent_increases (nunca se modifica a posteriori)
  Si la API falla: alerta manual + campo de ingreso manual
  Rate limit de BCRA: ~60 requests/hora (más que suficiente)
```

### 16.2 AFIP — Validación CUIT y facturación electrónica

```
AFIP provee servicios web SOAP (no REST):
  - Autenticación: ws_auth (certificado digital X.509)
  - Validación de CUIT: Padrón A4 (personas físicas y jurídicas)
  - Facturación: wsfev1 (comprobantes tipo B/C para monotributistas)

Complejidad: alta (requiere obtener certificado digital de AFIP)
Incluir en: Fase 3
Alternativa mientras tanto: API de validación de CUIT de terceros (ej: apis.datos.gob.ar)
```

### 16.3 Mercado Pago — Pagos online

```
API REST con SDK oficial (@mercadopago/sdk-js):

Flujo:
  1. Backend crea preferencia de pago con el monto del alquiler
  2. MP devuelve un link de pago (checkout URL)
  3. El administrador envía el link al inquilino por WhatsApp
  4. Inquilino paga → MP notifica vía webhook a /api/v1/webhooks/mercadopago
  5. Backend verifica el pago y registra el cobro automáticamente
  6. Genera recibo y lo envía

Incluir en: Fase 3
```

### 16.4 WhatsApp Business API (Meta)

```
Migración desde whatsapp-web.js:
  - Requiere cuenta de Meta Business verificada
  - Templates de mensajes deben ser aprobados por Meta
  - API REST oficial: alta confiabilidad
  - Costo: ~USD 0.05-0.08 por conversación de 24h
  - Ventajas: botones, listas, multimedia, mejor tasa de entrega

Incluir en: Fase 3 (cuando el volumen justifique el costo o la confiabilidad sea crítica)
```

### 16.5 Firma digital

```
Opciones en Argentina:
  - DocuSign (internacional): costo medio, muy robusto
  - Signaturit (LATAM): costo medio
  - Firma electrónica simple (email de confirmación): bajo costo, validez legal limitada
  - FirmaDigital Argentina (SIGEN): para entidades públicas

Para MVP futuro: firma electrónica simple
  El sistema envía el contrato por email al inquilino y propietario
  Ambos confirman por email con link único (hash firmado con JWT)
  La confirmación queda registrada con timestamp e IP
  (Tiene valor probatorio aunque no sea "firma digital avanzada")
```

---

## 17. ROADMAP TÉCNICO

### MVP — Fase 1 (Semanas 1–16)

```
Semanas 1–2: Setup del monorepo
  ✓ Inicializar pnpm workspaces + Turborepo
  ✓ Configurar packages/types, packages/utils, packages/config
  ✓ Setup de Docker Compose con PostgreSQL
  ✓ Boilerplate Fastify con auth básica
  ✓ Boilerplate React + Vite + Tailwind + React Query
  ✓ Schema Prisma completo + primera migration
  ✓ Seeds de desarrollo

Semanas 3–5: Core de propiedades y contratos
  ✓ CRUD propietarios, inquilinos, propiedades (backend + frontend)
  ✓ Wizard de creación de contratos
  ✓ Módulo de cobros con lógica de mora e intereses
  ✓ Cálculo automático de aumentos ICL/IPC

Semanas 6–8: Gastos, liquidaciones y recibos
  ✓ CRUD gastos con categorías y asignación
  ✓ Motor de generación de liquidaciones
  ✓ Generación de PDFs (recibo + liquidación)
  ✓ Envío por email

Semanas 9–10: OCR y WhatsApp
  ✓ Pipeline OCR con Tesseract.js
  ✓ Frontend de revisión de OCR con scoring
  ✓ Integración whatsapp-web.js
  ✓ Automatizaciones básicas (vencimientos + recordatorios)

Semanas 11–12: Ventas y módulos secundarios
  ✓ Pipeline de ventas con Kanban
  ✓ Módulo de reparaciones
  ✓ Historial fotográfico
  ✓ Dashboard completo con KPIs y alertas

Semanas 13–14: Reportes y automatizaciones
  ✓ Todos los reportes en PDF/Excel
  ✓ Sistema de notificaciones interno
  ✓ Cron jobs automáticos

Semanas 15–16: Seguridad, testing y despliegue
  ✓ Tests unitarios e integración
  ✓ Playwright E2E para flujos críticos
  ✓ Docker Compose producción
  ✓ GitHub Actions CI/CD
  ✓ Deploy en VPS con SSL
  ✓ Documentación de usuario
```

### Fase 2 — Mejoras (Semanas 17–24)

```
  ○ Reportes avanzados con filtros complejos y exportación Excel
  ○ Editor visual de reglas de automatización
  ○ Historial fotográfico comparativo (ingreso vs. egreso)
  ○ Módulo de reparaciones completo con proveedores
  ○ Vista de cartera disponible
  ○ Backup y restauración desde panel admin
  ○ Multiusuario básico con roles admin/operator/viewer
  ○ Integración automática BCRA API para ICL
```

### Fase 3 — Integraciones (Semanas 25–36)

```
  ○ AFIP: validación CUIT en tiempo real
  ○ Mercado Pago: links de pago y webhook
  ○ WhatsApp Business API oficial
  ○ OCR cloud (Google Vision o AWS Textract)
  ○ Firma electrónica simple
  ○ INDEC: actualización automática IPC
  ○ IA: clasificación de gastos, predicción de morosidad
  ○ Multi-inmobiliaria (arquitectura SaaS)
```

---

## APÉNDICE A — Variables de entorno completas

```bash
# .env.example

# Base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/inmobiliaria_db
POSTGRES_USER=inmobiliaria
POSTGRES_PASSWORD=change_me_in_production
POSTGRES_DB=inmobiliaria_db

# JWT
JWT_SECRET=change_me_minimum_64_chars_in_production_use_random_generator
JWT_REFRESH_SECRET=change_me_minimum_64_chars_different_from_jwt_secret

# App
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
LOG_LEVEL=info

# Storage
STORAGE_PATH=./uploads
MAX_FILE_SIZE_MB=10

# Sesiones
SESSION_DURATION_MIN=15
REFRESH_DURATION_DAYS=7

# Rate limiting
RATE_LIMIT_LOGIN=5
RATE_LIMIT_API=100

# Email (opcional en MVP, usar Nodemailer con SMTP o Resend)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notificaciones@inmobiliaria.com
SMTP_PASS=app_password
EMAIL_FROM="Inmobiliaria <notificaciones@inmobiliaria.com>"
```

---

## APÉNDICE B — Decisiones técnicas documentadas (ADRs resumidos)

| # | Decisión | Alternativa descartada | Razón |
|---|---|---|---|
| ADR-001 | Fastify en lugar de Express | Express | Rendimiento superior, TypeScript nativo, Pino integrado |
| ADR-002 | Monolito modular en lugar de microservicios | Microservicios | Equipo pequeño, complejidad operativa innecesaria en MVP |
| ADR-003 | Tesseract.js en lugar de cloud OCR | Google Vision | Costo cero, suficiente para MVP, misma interfaz para futura migración |
| ADR-004 | whatsapp-web.js en lugar de Meta API | Meta Business API | Sin proceso de verificación, costo cero, bajo volumen de mensajes |
| ADR-005 | Puppeteer en lugar de PDFKit | PDFKit | HTML/CSS produce mejores PDFs, templates más fáciles de mantener |
| ADR-006 | UUID en lugar de SERIAL como PK | SERIAL/BIGINT | Evita enumeración en API, facilita futura distribución |
| ADR-007 | pnpm + Turborepo en lugar de npm/yarn | npm workspaces | Mejor gestión de monorepo, caché de builds, performance |
| ADR-008 | Zustand en lugar de Redux | Redux Toolkit | Menos boilerplate, suficiente para estado simple de una SPA |
| ADR-009 | Soft delete en lugar de hard delete | Hard delete | Trazabilidad legal, recuperación ante errores, auditoría |
| ADR-010 | Tipo de cambio ingresado manualmente | API de tipo de cambio | Inestabilidad de las APIs de tipo de cambio en Argentina, responsabilidad legal |

---

*Documento preparado por: Área de Tecnología*
*Versión: 1.0 | Fecha: Mayo 2026*
*Clasificación: Confidencial — Solo para el equipo de desarrollo*
