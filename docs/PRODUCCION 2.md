# Pasar TransLogix a producción

Esta guía resume qué revisar o cambiar en **Supabase**, **Resend**, **variables del front (Vite)** y **plantillas de correo** antes o al publicar en producción.

---

## 1. Front (Vite) y URL pública

### Variables obligatorias (`.env` en el build de producción)

| Variable | Uso |
|----------|-----|
| `VITE_SUPABASE_URL` | URL del proyecto (ej. `https://xxxx.supabase.co`). |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima del proyecto (segura en el navegador con RLS). |

### URL pública en los correos (`localhost` vs dominio real)

Los enlaces de “iniciar sesión” dentro de los correos (aprobación / rechazo) se generan en `src/lib/resendNotify.ts`.

- **Por defecto** se usa el **origen del navegador** del administrador en el momento de aprobar. Si el admin abre el panel en `http://localhost:5173`, el correo llevará enlaces a `localhost`.
- **En producción** define **`VITE_PUBLIC_SITE_URL`** con la URL pública del sitio **sin** barra final, por ejemplo:

```bash
VITE_PUBLIC_SITE_URL=https://app.tudominio.com
```

Si existe, **tiene prioridad** sobre el origen del navegador. Así puedes probar en local contra Supabase de producción y que los correos sigan apuntando al dominio real.

Tras cambiar variables, vuelve a generar el build (`npm run build`) y despliega el contenido de `dist/`.

---

## 2. Supabase

### Edge Functions `send-email` y `notify-admins`

- Deben estar **desplegadas** en el mismo proyecto que usan `VITE_SUPABASE_URL` y la anon key.
- **`send-email`**: correos de aprobación/rechazo (solo admins). Código: `supabase/functions/send-email/index.ts`.
- **`notify-admins`**: avisos a admins cuando un usuario enlaza un registro pendiente o crea una solicitud de servicio. Código: `supabase/functions/notify-admins/index.ts`. Usa los mismos secrets **`RESEND_API_KEY`** y **`RESEND_FROM`** que `send-email`.
- Los administradores deben tener **`email`** rellenado en `profiles` (además de `is_admin = true`) para recibir estos avisos; si no hay correos, la función responde correctamente pero no envía nada.

### Secrets (Edge Functions → Secrets en el panel, o CLI)

| Secret | Descripción |
|--------|-------------|
| `RESEND_API_KEY` | API key de Resend (`re_...`). |
| `RESEND_FROM` | Remitente permitido por Resend (ver sección Resend). |

Las variables `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` las inyecta el alojamiento en la función; no hace falta definirlas a mano en secrets para el flujo actual.

### Auth y administradores

- Revisa **confirmación de correo**, **redirect URLs** y URLs permitidas para tu dominio de producción.
- Los usuarios con permiso para disparar correos desde el panel deben tener **`is_admin`** en la tabla `profiles` (según tu modelo de datos y migraciones).

### Base de datos

- Aplica todas las **migraciones** del directorio `supabase/migrations/` en el entorno de producción (orden cronológico).
- Comprueba políticas **RLS** y RPCs usadas por registro, waitlist y aprobación.

---

## 3. Resend

### API key

- Crea una clave en el panel de Resend y guárdala solo en **secrets de Supabase** (`RESEND_API_KEY`), no en variables `VITE_*` (el navegador no debe ver la clave).

### Remitente (`RESEND_FROM`)

- **Pruebas:** suele valer un valor como `TransLogix <onboarding@resend.dev>` (según la documentación actual de Resend para el dominio de prueba).
- **Producción:** verifica **tu dominio** en Resend (registros DNS que indiquen), luego usa por ejemplo `TransLogix <noreply@tudominio.com>`.

El remitente debe estar **autorizado** en Resend; si no, la API devolverá error y el admin verá un mensaje genérico en el panel.

### Entregabilidad

- Configura SPF/DKIM según Resend para tu dominio.
- Revisa cuotas y límites del plan.

---

## 4. Plantillas de correo (código)

Las plantillas HTML de **aprobación** y **rechazo** viven en **`src/lib/resendNotify.ts`**:

- `buildHtmlAprobacion` — correo cuando un admin aprueba.
- `buildHtmlRechazo` — correo cuando un admin rechaza.
- `emailShell` — marco común (cabecera, botón, pie).

### Qué personalizar para producción

- **Marca:** textos “TransLogix”, colores del degradado y del botón (busca `#2563eb`, `#1d4ed8`, `#475569`, etc.).
- **Tono:** párrafos de saludo y cierre dentro de `buildHtmlAprobacion` / `buildHtmlRechazo`.
- **Asuntos** de los correos: en `notifyAccesoAprobado` y `notifySolicitudRechazada` (propiedad `subject` al llamar a `invokeSendEmail`).

Los enlaces del botón y del pie usan `loginUrlForEmails()` (misma lógica que `VITE_PUBLIC_SITE_URL` + `/iniciar-sesion`).

### Plantilla en la Edge Function

La Edge **`send-email`** solo arma el envío a la API de Resend (`from`, `to`, `subject`, `html`). El HTML lo construye el **front** antes de invocar la función; no hay segunda plantilla duplicada en Deno salvo el valor por defecto de `RESEND_FROM` allí si falta el secret.

---

## 5. Checklist rápido antes de producción

1. [ ] `VITE_SUPABASE_*` apuntan al proyecto de producción.
2. [ ] `VITE_PUBLIC_SITE_URL` = URL real del sitio (evita `localhost` en correos).
3. [ ] `send-email` y `notify-admins` desplegadas; `RESEND_API_KEY` / `RESEND_FROM` configurados (compartidas).
4. [ ] Dominio verificado en Resend y `RESEND_FROM` acorde.
5. [ ] Migraciones aplicadas; admins con `is_admin` donde corresponda.
6. [ ] Auth: URLs de redirección y CORS / sitio permitidos para el dominio final.
7. [ ] Revisar textos y asuntos en `resendNotify.ts` con el tono de marca definitivo.

---

## 6. Desarrollo local sin tocar producción en correos

- Opción A: `VITE_PUBLIC_SITE_URL` apuntando al dominio de staging o producción mientras desarrollas.
- Opción B: aceptar enlaces a `localhost` solo en entornos de prueba internos.

Si quieres que en local los enlaces sean siempre a producción, **solo** hace falta `VITE_PUBLIC_SITE_URL`; no necesitas cambiar código adicional.

---

## 7. Acceso administrativo (solo equipo)

La ruta **`/admin-login`** (`AdminLoginPage` en `App.tsx`) es el formulario de acceso para administradores. **No está enlazada** desde la página pública de inicio de sesión: comparte la URL solo con quien deba operar el panel. El resto de usuarios entran por **`/iniciar-sesion`**.
