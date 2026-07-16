# Deploy desde cero — Studio Pilates RF

## Arquitectura (servicios separados)

| Pieza | Dónde | Carpeta del repo | URL final |
| --- | --- | --- | --- |
| Frontend (React/PWA) | **solo Vercel** | `frontend/` | `https://rfstudiopilates.com` |
| Backend (API Node) | **solo Railway** | `backend/` | `https://api.rfstudiopilates.com` |
| Base de datos MySQL | **solo Railway** | — | red privada (sin URL pública para la app) |
| Dominio | Hostinger (solo DNS) | — | `rfstudiopilates.com` |

**Regla de oro:** NUNCA subas el frontend a Railway ni el backend a Vercel.

El código ya está preparado:
- `backend/railway.toml` → start + healthcheck `/api/health`
- `frontend/vercel.json` → SPA + PWA
- Cada carpeta tiene su propio `package-lock.json` (instalan independientes)

---

## PASO 0 — Borrar lo anterior y subir el código nuevo

### 0.1 Limpiar Railway
1. Entrá a https://railway.app
2. Abrí el proyecto viejo (`studio-pilates-rf` / `abundant-beauty` / el que sea)
3. Settings del **proyecto** (no del servicio) → **Delete Project**
4. Confirmá. Queda todo limpio.

### 0.2 Limpiar Vercel (si ya importaste el proyecto)
1. https://vercel.com → el proyecto
2. Settings → General → abajo → **Delete Project**

### 0.3 Subir estos cambios a GitHub

Desde la raíz del proyecto, en PowerShell:

```powershell
cd "C:\Users\Jdiaz\Desktop\Proyectos\React\Studio pilates RF"
git add .
git status
git commit -m "Prepara deploy separado: backend Railway + frontend Vercel"
git push origin main
```

Si `git push` falla por autenticación, resolvelo en GitHub y volvé a intentar. Sin este push, Railway/Vercel van a desplegar código viejo.

---

## PASO 1 — MySQL en Railway (solo la base)

1. https://railway.app → **New Project** → **Deploy MySQL**
2. Esperá a que el servicio MySQL quede en verde
3. Click en **MySQL** → pestaña **Variables**
4. Copiá el valor de **`MYSQL_PUBLIC_URL`**  
   (formato: `mysql://root:PASSWORD@xxxxx.proxy.rlwy.net:12345/railway`)

Guardalo en el Bloc de notas. Lo usás solo desde tu PC para inicializar.

### 1.1 Crear las tablas (desde tu PC, una sola vez)

```powershell
cd "C:\Users\Jdiaz\Desktop\Proyectos\React\Studio pilates RF\backend"

npm run db:init -- --url "PEGAR_AQUI_MYSQL_PUBLIC_URL"
```

Tiene que terminar con: `[DB-INIT] Listo. Tablas en "railway": ...`

### 1.2 Cambiar contraseñas demo (obligatorio)

```powershell
npm run set:password -- --type admin --username admin --password "TU_CLAVE_ADMIN_FUERTE" --url "PEGAR_AQUI_MYSQL_PUBLIC_URL"

npm run set:password -- --type client --username cliente.demo --password "OTRA_CLAVE_FUERTE" --url "PEGAR_AQUI_MYSQL_PUBLIC_URL"
```

Anotá la clave del **admin**. Sin esto el backend en producción se niega a arrancar.

---

## PASO 2 — Generar secretos (desde tu PC)

```powershell
cd "C:\Users\Jdiaz\Desktop\Proyectos\React\Studio pilates RF\backend"

# 1) JWT access (copiá el resultado)
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 2) JWT refresh (ejecutalo OTRA vez; tiene que ser distinto)
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3) Push notifications
npm run generate:vapid
```

Guardá en el Bloc de notas:
- `JWT_ACCESS_SECRET=...`
- `JWT_REFRESH_SECRET=...`
- `VAPID_PUBLIC_KEY=...`
- `VAPID_PRIVATE_KEY=...`

---

## PASO 3 — Backend en Railway (solo la API)

### 3.1 Crear el servicio
1. En el **mismo** proyecto donde está MySQL: botón **+ Create** / **+ New**
2. Elegí **GitHub Repo** → `studio-pilates-rf` (autorizá Railway si te lo pide)
3. **Importante:** si te ofrece crear varios servicios, creá **UNO solo** para el backend. No agregues un servicio “frontend” en Railway.

### 3.2 Settings del servicio backend

Renombrá el servicio a `backend` (click en el nombre → Rename).

Entrá a **Settings** y configurá exactamente así:

| Campo | Valor |
| --- | --- |
| **Root Directory** | `backend` (click en “Add Root Directory” si no está) |
| **Branch** | `main` |
| **Custom Start Command** | dejalo vacío (usa `railway.toml` → `npm start`) o poné `npm start` |
| **Healthcheck Path** | `/api/health` (si el campo aparece; ya está en `railway.toml`) |
| **Watch Paths** | si existe, poné `/backend/**` o borrá lo que diga otra cosa |

Guardá.

### 3.3 Variables del backend

Pestaña **Variables** → **Raw Editor** → pegá esto:

```env
NODE_ENV=production
APP_URL=https://rfstudiopilates.com
CORS_ORIGIN=https://rfstudiopilates.com,https://www.rfstudiopilates.com
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}
JWT_ACCESS_SECRET=PEGAR_SECRETO_1
JWT_REFRESH_SECRET=PEGAR_SECRETO_2
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
TZ=America/Argentina/Buenos_Aires
VAPID_PUBLIC_KEY=PEGAR_VAPID_PUBLICA
VAPID_PRIVATE_KEY=PEGAR_VAPID_PRIVADA
VAPID_SUBJECT=mailto:admin@rfstudiopilates.com
```

**Si `${{MySQL....}}` no funciona:**
1. Borrá esas 5 líneas `DB_*`
2. Click **+ New Variable** → **Add Reference**
3. Elegí el servicio MySQL y mapeá:
   - `DB_HOST` ← `MYSQLHOST`
   - `DB_PORT` ← `MYSQLPORT`
   - `DB_USER` ← `MYSQLUSER`
   - `DB_PASSWORD` ← `MYSQLPASSWORD`
   - `DB_NAME` ← `MYSQLDATABASE`

(El nombre del servicio MySQL en Railway tiene que coincidir; si se llama distinto de `MySQL`, usá siempre **Add Reference**.)

### 3.4 Verificar que el backend arrancó

1. Pestaña **Deployments** → el último deploy → **View Logs**
2. Tiene que aparecer:
   - `[DB] Conexión a MySQL establecida correctamente`
   - `[API] Servidor corriendo...`
3. Si falla, leé el error (casi siempre: falta variable, secreto débil, o contraseñas demo sin rotar)

### 3.5 Dominio público del backend

1. **Settings → Networking**
2. Primero click **Generate Domain** (te da algo como `backend-xxxx.up.railway.app`)
3. Probá en el navegador: `https://ESE_DOMINIO.up.railway.app/api/health`  
   Debe responder JSON con `"success": true`
4. Después: **Custom Domain** → `api.rfstudiopilates.com`
5. Anotá el **CNAME** que te muestra Railway (para Hostinger)

---

## PASO 4 — Frontend en Vercel (solo la web)

1. https://vercel.com → Login with GitHub
2. **Add New… → Project** → Importá `studio-pilates-rf`
3. Configuración **antes** de Deploy:

| Campo | Valor |
| --- | --- |
| **Root Directory** | `frontend` (Edit → seleccioná la carpeta) |
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` (default) |
| **Output Directory** | `dist` (default) |

4. **Environment Variables** (Production):

| Name | Value |
| --- | --- |
| `VITE_API_URL` | `https://api.rfstudiopilates.com/api` |
| `VITE_APP_NAME` | `Studio Pilates RF` |

> Si el DNS todavía no está listo, podés poner temporalmente  
> `VITE_API_URL=https://TU_DOMINIO_RAILWAY.up.railway.app/api`  
> y después cambiarlo al dominio final y redeployar.

5. **Deploy**

### 4.1 Dominio del frontend
1. En Vercel → proyecto → **Settings → Domains**
2. Agregá `rfstudiopilates.com`
3. Agregá `www.rfstudiopilates.com` (redirigir a sin www)
4. Anotá los registros DNS que te pide Vercel (normalmente `A` → `76.76.21.21` y `CNAME www`)

---

## PASO 5 — DNS en Hostinger

1. https://hpanel.hostinger.com → Dominios → `rfstudiopilates.com` → **DNS / Zona DNS**
2. Eliminá registros viejos de `@` y `www` (parking de Hostinger)
3. Creá:

| Tipo | Nombre | Apunta a | TTL |
| --- | --- | --- | --- |
| A | `@` | el IP que diga Vercel (suele ser `76.76.21.21`) | 14400 |
| CNAME | `www` | lo que diga Vercel (suele ser `cname.vercel-dns.com`) | 14400 |
| CNAME | `api` | el CNAME de Railway del Paso 3.5 | 14400 |

4. Esperá propagación (10 min – 2 hs). Chequeá en https://dnschecker.org
5. Cuando esté verde en Vercel y Railway, el HTTPS se genera solo

---

## PASO 6 — Probar que todo funciona

1. `https://api.rfstudiopilates.com/api/health` → JSON OK
2. `https://rfstudiopilates.com` → carga la app
3. Login con `admin` + la clave del Paso 1.2
4. Recargá la página: la sesión debe mantenerse
5. Creá un cliente de prueba, asigná plan, reservá un turno

---

## PASO 7 — Cierre profesional

1. Eliminá o suspendé `cliente.demo` desde el panel
2. Configuración del estudio: WhatsApp, horarios, capacidad, cancelación, monto de deuda
3. Activá backups diarios en Railway → MySQL → Backups

---

## Cómo actualizar después

```powershell
git add .
git commit -m "descripcion del cambio"
git push origin main
```

- Cambios en `backend/` → Railway redeploya solo el backend
- Cambios en `frontend/` → Vercel redeploya solo el frontend

---

## Problemas frecuentes

| Síntoma | Qué hacer |
| --- | --- |
| GitHub dice “Deployment failed” | Es Railway. Abrí Logs del deploy fallido, no es un error de Git |
| “Faltan variables de entorno” | Completá Variables del Paso 3.3 |
| “Credenciales demo inseguras” | Repetí el Paso 1.2 (`set:password`) |
| “Problem processing request” en Branch | Disconnect/Reconnect el repo, o F5; elegí `main` |
| CORS en el navegador | `CORS_ORIGIN` sin barra final; incluir `https://` y también `www` |
| Login se pierde al recargar | Usá el dominio propio, no `*.vercel.app` |
| Frontend en Railway fallando | Borrá ese servicio. El frontend va **solo** en Vercel |
| Root Directory no aparece | En Settings → Source → **Add Root Directory** → `backend` |

---

## Checklist rápido

- [ ] Proyecto Railway viejo eliminado
- [ ] Código nuevo pusheado a `main`
- [ ] MySQL verde + `db:init` + `set:password`
- [ ] Servicio **backend** con Root Directory = `backend` (sin servicio frontend en Railway)
- [ ] Variables del backend cargadas
- [ ] `/api/health` responde OK
- [ ] Vercel con Root Directory = `frontend` + `VITE_API_URL`
- [ ] DNS `@`, `www`, `api` en Hostinger
- [ ] Login admin funciona en `rfstudiopilates.com`
