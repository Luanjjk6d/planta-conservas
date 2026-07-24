# Plataforma Conservas

Dos espacios independientes dentro del mismo proyecto: **MES Planta** (registro y costeo de producción) y **Gestión Conservas** (seguimiento de proyectos, actividades y decisiones del área). Frontend estático (HTML/CSS/JS sin build step) conectado a [Supabase](https://supabase.com) (Postgres) como base de datos.

`index.html` es la puerta de entrada — un selector con acceso por código provisional (ver `js/accessConfig.js`, nivel de seguridad cosmético, no reemplaza autenticación real) hacia `mes.html` o `gestion.html`.

## Estructura

```
index.html               selector de espacios (MES Planta / Gestión Conservas)
mes.html                  MES Planta — header, nav (4 módulos), modales
gestion.html              Gestión Conservas — header, nav (6 módulos), modales
css/
  styles.css               estilos compartidos (variables, header, nav, componentes)
  plataforma.css            estilos propios del selector (index.html)
js/
  config.example.js        plantilla de credenciales de Supabase
  config.js                 credenciales reales (ver Paso 3)
  supabaseClient.js         cliente Supabase (createClient)
  accessConfig.js, accessGate.js, exitGate.js   código de acceso por espacio (provisional)
  plataformaMain.js         wiring del selector (index.html)
  state.js                  arrays/objetos en memoria compartidos entre módulos
  utils.js, constants.js    utilidades y constantes compartidas
  lookups.js, modal.js      catálogos dinámicos (productos/procesos/equipos) y el modal "+"
  m1.js, m2.js, m3.js       lógica de cada módulo MES (Información general, Actividad, Costos)
  dashboard.js              KPIs y gráficos (Chart.js) — Dashboard del MES
  main.js                   punto de entrada de mes.html: carga inicial + wiring
  proyectos.js               módulo Proyectos (vive en Gestión Conservas)
  gestionMain.js             punto de entrada de gestion.html: carga inicial + wiring
sql/001_init.sql           schema completo + datos semilla + políticas RLS (más migraciones incrementales 002-019)
```

## Puesta en marcha

### 1. Crear el proyecto en Supabase

En [supabase.com](https://supabase.com) → **New Project** → elige nombre, región y contraseña de la base de datos.

### 2. Ejecutar el schema

En el dashboard de Supabase → **SQL Editor** → pega el contenido completo de [`sql/001_init.sql`](sql/001_init.sql) → **Run**.

Esto crea las tablas (`lotes`, `actividades`, `costos`, `latas`, `productos`, `procesos`, `equipos`), las siembra con las opciones actuales de la app, y habilita las políticas de acceso abierto (sin autenticación — ver el comentario en el propio archivo SQL).

### 3. Configurar las credenciales

En Supabase → **Project Settings → API**, copia el **Project URL** y la **anon public key**. Pégalas en [`js/config.js`](js/config.js):

```js
export const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
export const SUPABASE_ANON_KEY = 'tu-anon-key';
```

> La anon key de Supabase está diseñada para ser pública — el acceso real lo controlan las políticas RLS del paso 2, no el secreto de esta key. Es seguro que quede en el código del frontend.

### 4. Probar localmente

Los módulos ES requieren `http://`, no `file://`. Desde la carpeta `planta-conservas/`:

```bash
npx serve .
```

Abre la URL que te indique (normalmente `http://localhost:3000`) y prueba los 4 módulos de punta a punta.

### 5. Publicar en GitHub Pages

```bash
git init
git add .
git commit -m "Planta de Conservas MES con Supabase"
git remote add origin <URL-de-tu-repo-en-GitHub>
git push -u origin main
```

Luego en GitHub: **Settings → Pages → Source: "Deploy from a branch"** → rama `main`, carpeta `/(root)` → **Save**.

Tu app quedará publicada en `https://<tu-usuario>.github.io/<tu-repo>/`.

> `js/config.js` queda incluido en el commit (no está en `.gitignore`) porque la anon key es segura de exponer, como se explica en el paso 3. Si prefieres no mostrar la URL de tu proyecto Supabase públicamente, usa un repositorio privado — GitHub Pages también funciona con repos privados en planes de pago, o puedes usar Netlify/Vercel con variables de entorno en su lugar.

## Verificación

1. Registra un lote en el **Módulo 1**, una actividad en el **Módulo 2** (con su registro de latas), y costéala en el **Módulo 3**.
2. Revisa que el **Dashboard** refleje los totales.
3. Recarga la página — los datos deben seguir ahí (persistencia real).
4. Abre la app en otra pestaña o dispositivo y confirma que ve los mismos datos (acceso compartido, sin login).
