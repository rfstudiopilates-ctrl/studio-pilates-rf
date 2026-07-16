# Studio Pilates RF

Sistema de gestión integral para estudios de Pilates. Producto reutilizable por instancia: cada negocio tiene su propio deploy, dominio y base de datos.

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React, Vite, TailwindCSS, React Router, TanStack Query, Zustand |
| Backend | Node.js, Express.js |
| Base de datos | MySQL 8 |
| Deploy | Vercel (frontend) + Railway (backend + MySQL) |

## Estructura del monorepo

```
studio-pilates-rf/
├── frontend/          # Aplicación React
├── backend/           # API Express
├── database/          # Scripts SQL
│   └── init.sql       # Esquema completo (única fuente de verdad)
├── package.json       # Scripts del monorepo
└── README.md
```

## Requisitos previos

- Node.js 20 LTS o superior
- MySQL 8 instalado localmente
- Git

## Instalación local

### 1. Clonar e instalar dependencias

```bash
git clone <tu-repo>
cd "Studio pilates RF"
npm install
```

### 2. Crear la base de datos

Ejecutá el script único de instalación. Crea la base, todas las tablas y los usuarios demo.

**Windows (PowerShell):**
```powershell
Get-Content database\init.sql | mysql -u root -p
```

**Linux / macOS:**
```bash
mysql -u root -p < database/init.sql
```

También podés abrir `database/init.sql` en MySQL Workbench o DBeaver y ejecutarlo completo.

Credenciales incluidas en el script:

- **Admin:** `admin` / `Admin1234`
- **Cliente demo:** `cliente.demo` / `Cliente1234`

### 3. Configurar variables de entorno

**Backend** — copiá `backend/.env.example` a `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=studio_pilates_rf
```

**Frontend** — copiá `frontend/.env.example` a `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001/api
VITE_APP_NAME=Studio Pilates RF
```

### 4. Usuarios adicionales (opcional)

Si necesitás crear otro administrador o cliente sin repetir el script:

```bash
npm run seed:auth -w backend
```

El script no sobrescribe usuarios que ya existen.

### 5. Iniciar en desarrollo

```bash
# Frontend + Backend juntos
npm run dev

# O por separado
npm run dev:backend
npm run dev:frontend
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health check: http://localhost:3001/api/health

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia frontend y backend en paralelo |
| `npm run dev:frontend` | Solo frontend |
| `npm run dev:backend` | Solo backend |
| `npm run build` | Build de producción del frontend |
| `npm start` | Inicia el backend en producción |
| `npm run seed:auth -w backend` | Crea admin y cliente demo |

## Base de datos

La base se crea **solo** con `database/init.sql` (esquema completo + planes seed + usuarios demo).

```powershell
Get-Content database\init.sql | mysql -u root -p
```

```bash
mysql -u root -p < database/init.sql
```

Si ya tenés una base vieja y querés recrearla limpia:

```sql
DROP DATABASE IF EXISTS studio_pilates_rf;
```

y volvé a ejecutar `init.sql`.

- Zona horaria de negocio: `America/Argentina/Buenos_Aires`
- Charset: `utf8mb4_unicode_ci`
- Schema: v1.0.0 (documentado en el encabezado de `init.sql`)

## Etapas del proyecto

| Etapa | Estado |
|-------|--------|
| 1. Infraestructura base | ✅ Completada |
| 2. Autenticación (Admin + Cliente) | ✅ Completada |
| 3. Configuración del estudio | ✅ Completada |
| 4. Módulo Clientes | ✅ Completada |
| 5. Planes y finanzas | ✅ Completada |
| 6. Horarios y clases | ✅ Completada |
| 7. Reservas | ✅ Completada |
| 8. Cambios de horario | ✅ Completada |
| 9. Dashboards y KPIs | ✅ Completada |
| 10. Notificaciones PWA + WhatsApp | ✅ Completada |
| 11. Reportes PDF/Excel + comprobantes | ✅ Completada |
| 12. PWA completa (instalable + offline) | ✅ Completada |

### Notificaciones (Etapa 10)

- **Push PWA**: requiere claves VAPID en `backend/.env`. Generarlas con:

```bash
npm run generate:vapid -w backend
```

  Activá las notificaciones desde el Dashboard o Configuración → Notificaciones (en el mismo dispositivo/celular donde querés recibirlas). Los avisos de clientes (reserva, cancelación, solicitud puntual, cambio de horario) llegan por push.
- **WhatsApp**: plantillas editables en Configuración → WhatsApp (recordatorio, deuda, comprobante, clase puntual y credenciales). Se abren con `wa.me` desde cada flujo.
- **Recordatorios 24 h**: cron horario automático en el backend (push al cliente).

### Reportes y comprobantes (Etapa 11)

- **Reportes**: panel en `/admin/reportes` con vista previa y exportación PDF/Excel.
- **Tipos**: clientes, finanzas, ocupación, reservas, planes, horarios, recuperaciones y resumen general.
- **Comprobantes**: en la pestaña Finanzas de cada cliente, los pagos tienen botones PDF, Imprimir y WhatsApp.
- **Datos fiscales**: configurá razón social, CUIT y domicilio en Configuración → Datos fiscales para los comprobantes.

### PWA completa (Etapa 12)

- **Instalable**: banner de instalación en inicio y paneles; manifest con iconos PNG 192/512 y maskable.
- **iOS / Safari**: guía “Agregar a inicio” cuando no existe `beforeinstallprompt`.
- **Actualizaciones**: banner “Nueva versión” + recarga controlada (sin swap silencioso mid-sesión).
- **Errores de pantalla**: Error Boundary evita que un crash tumbe toda la app.
- **Offline**: service worker con caché de shell, assets y página `offline.html`.
- **Indicador**: aviso superior cuando no hay conexión.
- **Iconos**: generarlos con `npm run generate:pwa-icons -w frontend` (se ejecuta automáticamente en `npm run build`).
- **Nota**: el service worker se registra en producción (`npm run build` + `npm run preview` o deploy). En `npm run dev` no se activa para no interferir con HMR.

## Deploy

Cada instancia (estudio) debe tener su propio deploy, dominio y base de datos.

### Checklist de producción

1. Ejecutá `database/init.sql` en MySQL de producción.
2. **Cambiá de inmediato** las contraseñas demo (`admin` / `Admin1234`, `cliente.demo` / `Cliente1234`) o eliminá esas cuentas. Con `NODE_ENV=production` la API **no arranca** si siguen activas (salvo `ALLOW_DEMO_CREDENTIALS=true` en staging).
3. Configurá `backend/.env` con secretos fuertes (≥32 caracteres aleatorios), `DB_PASSWORD`, `APP_URL` y `CORS_ORIGIN` en **HTTPS**.
4. Generá VAPID: `npm run generate:vapid -w backend` y pegá las claves (push PWA).
5. Frontend: `VITE_API_URL=https://tu-api.../api` y build (`npm run build`).
6. Cookies de sesión: con frontend y API en dominios distintos (p. ej. Vercel + Railway) usá el default `AUTH_COOKIE_SAMESITE=none` (secure). Si ambos van detrás del mismo dominio, seteá `AUTH_COOKIE_SAMESITE=lax` o `strict`.

Ejemplo backend producción:

```env
NODE_ENV=production
PORT=3001
APP_URL=https://app.tu-estudio.com
CORS_ORIGIN=https://app.tu-estudio.com
DB_HOST=...
DB_PASSWORD=...
JWT_ACCESS_SECRET=<aleatorio-largo>
JWT_REFRESH_SECRET=<otro-aleatorio-largo>
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@tu-estudio.com
```

Stack sugerido: Vercel (frontend) + Railway (API + MySQL).

## Licencia

Uso privado / comercial según acuerdo con el desarrollador.
