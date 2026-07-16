# Guía de Deploy a Producción — Studio Pilates RF

Arquitectura final:

| Pieza          | Servicio | URL final                          |
| -------------- | -------- | ---------------------------------- |
| Frontend (PWA) | Vercel   | `https://rfstudiopilates.com`      |
| Backend (API)  | Railway  | `https://api.rfstudiopilates.com`  |
| MySQL          | Railway  | red privada interna de Railway     |
| Dominio        | Hostinger (solo DNS) | —                      |

Seguí los pasos EN ORDEN. Tiempo estimado: 45–60 minutos (más la propagación de DNS).

---

## PASO 0 — Subir el proyecto a GitHub

Vercel y Railway despliegan desde GitHub. Desde la raíz del proyecto:

```powershell
git init
git add .
git commit -m "Studio Pilates RF - listo para produccion"
```

1. Entrá a https://github.com/new
2. Nombre: `studio-pilates-rf` → **Private** → Create repository.
3. Conectá y subí (reemplazá `TU_USUARIO`):

```powershell
git remote add origin https://github.com/TU_USUARIO/studio-pilates-rf.git
git branch -M main
git push -u origin main
```

> El `.gitignore` ya excluye los `.env`, así que tus contraseñas locales no se suben.

---

## PASO 1 — Crear MySQL en Railway

1. Entrá a https://railway.app → **Login with GitHub**.
2. **New Project** → **Deploy MySQL**. Esperá a que quede en verde.
3. Click en el servicio **MySQL** → pestaña **Variables**. Vas a usar dos cosas:
   - `MYSQL_PUBLIC_URL` (conexión pública, para inicializar el esquema desde tu PC).
   - Las variables internas (`MYSQLHOST`, etc.) las va a usar el backend por red privada.

### Inicializar el esquema (una sola vez)

Copiá el valor de `MYSQL_PUBLIC_URL` (formato `mysql://root:PASSWORD@xxxx.proxy.rlwy.net:PUERTO/railway`) y desde tu PC:

```powershell
cd "C:\Users\Jdiaz\Desktop\Proyectos\React\Studio pilates RF\backend"
npm run db:init -- --url "mysql://root:PASSWORD@xxxx.proxy.rlwy.net:PUERTO/railway"
```

Debe terminar con `[DB-INIT] Listo. Tablas en "railway": ...`.
Esto crea todas las tablas + el admin inicial (`admin` / `Admin1234`) y el cliente demo.

### Rotar las contraseñas demo (obligatorio, ahora mismo)

El backend en producción se NIEGA a arrancar si las cuentas demo siguen con su
contraseña original. Cambialas ya (usá la misma URL de conexión, elegí claves fuertes propias):

```powershell
node scripts/set-password.js --type admin --username admin --password "TU_CLAVE_ADMIN_FUERTE" --url "mysql://root:PASSWORD@xxxx.proxy.rlwy.net:PUERTO/railway"

node scripts/set-password.js --type client --username cliente.demo --password "OTRA_CLAVE_FUERTE" --url "mysql://root:PASSWORD@xxxx.proxy.rlwy.net:PUERTO/railway"
```

Anotá la clave del admin: es con la que vas a entrar al sistema.
(El cliente demo lo podés eliminar después desde el panel de admin.)

---

## PASO 2 — Generar los secretos

Desde `backend/`, ejecutá cada comando y guardá los resultados en un bloc de notas:

```powershell
# JWT_ACCESS_SECRET (ejecutalo una vez)
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# JWT_REFRESH_SECRET (ejecutalo OTRA vez, deben ser distintos)
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# Claves VAPID para notificaciones push
npm run generate:vapid
```

---

## PASO 3 — Deployar el backend en Railway

1. En el MISMO proyecto de Railway: **+ New** → **GitHub Repo** → elegí `studio-pilates-rf` (la primera vez te pide autorizar Railway en GitHub).
2. Click en el nuevo servicio → **Settings**:
   - **Root Directory**: `backend`
   - **Start Command**: `npm start` (suele detectarlo solo)
   - En **Deploy → Healthcheck Path** (opcional pero recomendado): `/api/health`
3. Pestaña **Variables** → **Raw Editor** → pegá esto (completá los secretos del Paso 2):

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

> `${{MySQL.MYSQLHOST}}` son referencias: Railway las reemplaza por los valores del servicio MySQL usando la red privada (sin salir a internet).

4. Guardá → se redeploya solo. En **Deployments → View Logs** tenés que ver:
   - `[DB] Conexión a MySQL establecida correctamente`
   - `[API] Servidor corriendo...`

### Dominio del backend

5. **Settings → Networking → Public Networking** → **+ Custom Domain** → escribí `api.rfstudiopilates.com`.
6. Railway te muestra un **CNAME** (algo como `xxxx.up.railway.app`). Anotalo para el Paso 5.

---

## PASO 4 — Deployar el frontend en Vercel

1. Entrá a https://vercel.com → **Login with GitHub**.
2. **Add New… → Project** → **Import** `studio-pilates-rf`.
3. Configuración:
   - **Root Directory**: `frontend` (click en Edit y seleccionala)
   - **Framework Preset**: Vite (lo detecta solo)
   - **Environment Variables**:

| Nombre          | Valor                                |
| --------------- | ------------------------------------ |
| `VITE_API_URL`  | `https://api.rfstudiopilates.com/api` |
| `VITE_APP_NAME` | `Studio Pilates RF`                  |

4. **Deploy**. Al terminar te da una URL `*.vercel.app` (todavía no va a poder loguear: falta el DNS).

### Dominio del frontend

5. En el proyecto de Vercel: **Settings → Domains** → agregá `rfstudiopilates.com` y también `www.rfstudiopilates.com` (elegí que `www` redirija al dominio principal).
6. Vercel te muestra los registros DNS exactos que necesita. Normalmente:
   - `A` para `@` → `76.76.21.21`
   - `CNAME` para `www` → `cname.vercel-dns.com`

---

## PASO 5 — Configurar DNS en Hostinger

1. Entrá a https://hpanel.hostinger.com → **Dominios** → `rfstudiopilates.com` → **DNS / Nameservers** → **Zona DNS**.
2. **Eliminá** los registros `A` y `CNAME` existentes de `@` y `www` (los que apuntan al parking de Hostinger).
3. Agregá estos 3 registros:

| Tipo  | Nombre | Contenido / Apunta a                  | TTL   |
| ----- | ------ | ------------------------------------- | ----- |
| A     | `@`    | `76.76.21.21` (el que indique Vercel) | 14400 |
| CNAME | `www`  | `cname.vercel-dns.com`                | 14400 |
| CNAME | `api`  | el CNAME que te dio Railway (Paso 3.6) | 14400 |

4. Esperá la propagación (10 min a 2 hs, a veces más). Podés verificar en https://dnschecker.org buscando `rfstudiopilates.com`.
5. Cuando propague, Vercel y Railway emiten el certificado HTTPS solos (en sus paneles el dominio pasa a "Valid" / candado verde).

---

## PASO 6 — Verificación

1. Abrí `https://api.rfstudiopilates.com/api/health` → debe responder JSON con `success: true`.
2. Abrí `https://rfstudiopilates.com` → debe cargar la app.
3. Logueate con `admin` y la contraseña que definiste en el Paso 1.
4. Probá crear un cliente, asignar plan, reservar. Verificá que al recargar la página la sesión se mantiene (eso confirma que la cookie de refresh funciona entre dominios).
5. En el celular: abrí el sitio, el navegador te va a ofrecer "Agregar a pantalla de inicio" (PWA instalable).

---

## PASO 7 — Últimos ajustes

1. Eliminá el cliente `cliente.demo` desde el panel de admin (o dejalo suspendido).
2. En la app → **Configuración**: cargá nombre del estudio, WhatsApp, horarios, capacidad, horas de cancelación, monto de deuda para bloqueo, etc.
3. Creá los horarios de clases y verificá en el calendario que se generen las clases de las próximas semanas (el backend las genera automáticamente al arrancar y cada noche).

---

## Mantenimiento

- **Actualizar la app**: hacé cambios locales → `git add . && git commit -m "..." && git push`. Vercel y Railway redespliegan automáticamente con cada push a `main`.
- **Logs del backend**: Railway → servicio backend → Deployments → View Logs.
- **Backups de MySQL**: Railway → servicio MySQL → pestaña Backups (activá los diarios).
- **Costo**: Railway es pago por uso (el plan Hobby ~USD 5/mes cubre esto de sobra). Vercel Hobby es gratis.

## Solución de problemas

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| El backend no arranca: "Faltan variables de entorno" | Falta alguna variable en Railway | Revisar Paso 3.3 |
| Error de CORS en el navegador | `CORS_ORIGIN` no coincide con el dominio exacto | Debe ser `https://rfstudiopilates.com,https://www.rfstudiopilates.com` sin barra final |
| Login funciona pero al recargar se cierra la sesión | Cookie bloqueada: estás usando la URL `*.vercel.app` en vez del dominio propio | Usar siempre `https://rfstudiopilates.com` |
| `api.rfstudiopilates.com` no responde | DNS aún no propagó o CNAME mal cargado | Verificar en dnschecker.org |
| El backend se cae con "Credenciales demo inseguras" | No rotaste las contraseñas demo (Paso 1) | Ejecutar `set-password.js` para `admin` y `cliente.demo` |
| "JWT_ACCESS_SECRET debe tener al menos 32 caracteres" | Secretos débiles o de ejemplo | Regenerarlos con el comando del Paso 2 |
