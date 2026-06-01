# Portal de Mantenimiento Hidráulico - Frontend

Aplicación web para la gestión y seguimiento de componentes hidráulicos en proceso de mantenimiento.

## Tecnologías

- Next.js 16.0.1
- React 19.2.0
- TypeScript 5
- Tailwind CSS 4.1.16
- Zustand
- Radix UI
- React Hook Form
- Zod

## Requisitos Previos

- Node.js 18 o superior
- npm, yarn, pnpm o bun
- Backend API corriendo

## Instalación

1. Navegar al directorio:

```bash
cd ingetec-front
```

2. Instalar dependencias:

```bash
npm install
```

3. Configurar variables de entorno:

Crear archivo `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_ENCRYPTION_KEY=tu-clave-de-encriptacion-32-caracteres
```

4. Iniciar servidor de desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## Scripts Disponibles

- `npm run dev` - Desarrollo
- `npm run build` - Compilar para producción
- `npm start` - Producción
- `npm run lint` - Ejecutar linter

## Estructura del Proyecto

```
ingetec-front/
├── public/                    # Archivos estáticos
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/            # Componentes React
│   │   ├── auth/              # Autenticación
│   │   ├── dashboard/         # Dashboards
│   │   ├── components/         # Componentes hidráulicos
│   │   ├── management/        # Gestión administrativa
│   │   ├── common/             # Componentes reutilizables
│   │   └── ui/                 # Componentes UI base
│   ├── hooks/                 # Custom hooks
│   ├── lib/                    # Utilidades
│   ├── services/               # Servicios API
│   └── store/                 # Zustand stores
├── package.json
└── tsconfig.json
```

## Roles y Permisos

### Administrador (admin)
- Acceso completo al sistema
- Gestión de usuarios, empresas y componentes
- Modificación de timeline

### Gestor de Usuarios (user_manager)
- Gestión de usuarios (solo clientes e internos)
- Gestión de empresas
- Visualización de componentes (solo lectura)

### Interno (internal)
- Creación de componentes
- Visualización de todos los componentes
- Actualización de estados

### Cliente (client)
- Visualización de componentes de su empresa
- Acceso a detalles y timeline
- Sin permisos de modificación

## Credenciales de Prueba

Después de ejecutar el seed del backend:

- Administrador: `ADMIN` / `password`
- Gestor de Usuarios: `MANAGER` / `password`
- Interno: `INTERNO001` / `password`

## Características

- Sistema de autenticación con JWT
- Gestión de componentes hidráulicos
- Control de flujo de trabajo
- Sistema de roles y permisos
- Timeline de progreso
- Carga de documentos
- UI responsive
- Lazy loading de imágenes
- Notificaciones toast

## Variables de Entorno

| Variable | Descripción | Requerido |
|----------|-------------|-----------|
| `NEXT_PUBLIC_API_URL` | URL del backend API (local) o `/` en producción con proxy | Sí |
| `INTERNAL_API_URL` | URL del backend para SSR y proxy en Vercel | Producción |
| `NEXT_PUBLIC_USE_SAME_ORIGIN_API` | `true` para API vía mismo dominio (Safari móvil) | Producción Vercel |
| `NEXT_PUBLIC_ENCRYPTION_KEY` | Clave para encriptar localStorage | Sí |

## Compatibilidad entre navegadores

Navegadores soportados (últimas 2 versiones estables):

- Chrome / Edge (Chromium)
- Firefox
- Safari macOS e iOS

### Producción (Vercel + backend externo)

Para que la sesión funcione en **Safari iPhone** y Firefox móvil, el front no debe llamar al API en otro dominio desde el navegador. Configura en Vercel:

```env
NEXT_PUBLIC_USE_SAME_ORIGIN_API=true
NEXT_PUBLIC_API_URL=/
INTERNAL_API_URL=https://tu-backend.onrender.com
```

El front reenvía `/api/*` al backend (rewrite en `next.config.ts`). Tras el deploy, los usuarios deben **volver a iniciar sesión** en cada dispositivo.

Sin `NEXT_PUBLIC_USE_SAME_ORIGIN_API=true`, Chrome en PC suele funcionar, pero Safari móvil puede mostrar el dashboard sin datos (cookies bloqueadas).

### Desarrollo local

Con front y back en `localhost` (mismo sitio efectivo para cookies), no hace falta el proxy; usa `NEXT_PUBLIC_API_URL=http://localhost:4000` como en `env.example`.

### Safari, modo privado y WhatsApp

| Contexto | Comportamiento |
|----------|----------------|
| Safari / Chrome normal | Sesión vía cookies httpOnly; caché local opcional |
| Safari modo privado | `localStorage` puede fallar; login sigue si las cookies funcionan |
| WhatsApp / Instagram in-app | Suele bloquear cookies; la app muestra aviso para abrir en Safari/Chrome |
| WebView genérico | Mismo aviso; no se usa caché local sin validar `/api/users/me` |

**Seguridad de localStorage:** no guarda contraseñas ni tokens. Solo perfil (nombre, rol, empresa). El cifrado AES con `NEXT_PUBLIC_ENCRYPTION_KEY` solo ofusca en el dispositivo; la clave está en el JavaScript público. **La autenticación real son las cookies httpOnly del backend.**

## Desarrollo

### Estado Global

El estado global se maneja con Zustand en `src/store/`:
- `auth-store.ts`: Estado de autenticación
- `components-store.ts`: Estado de componentes
- `users-store.ts`: Estado de usuarios

### API Client

El cliente API está en `src/lib/api.ts` y maneja:
- Autenticación JWT automática
- Refresh tokens automático
- Manejo de errores centralizado

## Producción

### Build

```bash
npm run build
```

### Iniciar Servidor

```bash
npm start
```

## Notas Importantes

- El frontend requiere que el backend esté corriendo
- Las variables de entorno deben estar configuradas correctamente
- El sistema usa encriptación para datos sensibles en localStorage
- Los tokens JWT se renuevan automáticamente

## Licencia

Este proyecto es privado y de uso interno de INGETEC.
