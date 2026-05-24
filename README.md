# NutriCR

Plataforma de nutrición personalizada con IA para Costa Rica. Conecta nutriólogos con sus pacientes a través de planes nutricionales inteligentes generados con Claude.

## Stack

- **Framework:** Next.js 14 (App Router)
- **Lenguaje:** TypeScript
- **Base de datos / Auth:** Supabase
- **Estilos:** Tailwind CSS
- **IA:** Anthropic SDK (Claude)
- **Pagos:** Stripe

## Usuarios

| Rol | Acceso | Ruta |
|-----|--------|------|
| Nutriólogo | Dashboard web | `/nutriologo/dashboard` |
| Paciente | PWA móvil | `/paciente/inicio` |

## Estructura del proyecto

```
NutriCR/
├── app/
│   ├── (nutriologo)/         # Dashboard nutriólogo
│   │   ├── dashboard/
│   │   ├── pacientes/
│   │   ├── planes/
│   │   ├── inventario/
│   │   └── recetas/
│   ├── (paciente)/           # PWA paciente
│   │   ├── inicio/
│   │   ├── plan/
│   │   ├── recetas/
│   │   └── perfil/
│   ├── api/                  # API routes
│   │   ├── pacientes/
│   │   ├── planes/
│   │   ├── recetas/
│   │   └── pagos/
│   ├── layout.tsx
│   └── page.tsx              # Landing / selector de rol
├── components/
│   ├── ui/                   # Button, Card, Input
│   ├── nutriologo/           # Sidebar, Header
│   └── paciente/             # BottomNav, Header
├── lib/
│   ├── supabase/             # client.ts, server.ts, database.types.ts
│   ├── anthropic/            # client.ts
│   └── utils.ts
├── public/
│   ├── manifest.json         # PWA manifest
│   └── sw.js                 # Service worker
└── supabase/
    └── schema.sql            # Schema completo con RLS
```

## Cómo correr localmente

### 1. Clonar e instalar dependencias

```bash
git clone <repo>
cd NutriCR
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus credenciales:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Configurar Supabase

#### Opción A: Supabase Cloud

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta el contenido de `supabase/schema.sql`
3. Copia las credenciales desde **Settings → API** a tu `.env.local`

#### Opción B: Supabase local

```bash
# Instalar Supabase CLI
brew install supabase/tap/supabase

# Iniciar servicios locales
supabase init
supabase start

# Aplicar schema
supabase db reset
```

Las credenciales locales aparecen en la salida de `supabase start`.

### 4. Levantar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

- **Landing:** [http://localhost:3000](http://localhost:3000)
- **Dashboard Nutriólogo:** [http://localhost:3000/nutriologo/dashboard](http://localhost:3000/nutriologo/dashboard)
- **App Paciente:** [http://localhost:3000/paciente/inicio](http://localhost:3000/paciente/inicio)

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `/api/pacientes` | Listar / crear pacientes |
| GET/POST | `/api/planes` | Listar / crear planes |
| GET/POST | `/api/recetas` | Listar / generar receta con IA |
| GET/POST | `/api/pagos` | Listar / crear intención de pago |

## PWA

La app de paciente está configurada como PWA. Para instalarla en móvil:

1. Abre `/paciente/inicio` en Chrome/Safari móvil
2. Usa "Agregar a pantalla de inicio"

El service worker cachea las rutas del paciente para uso offline.

## Próximos pasos

- [ ] Implementar autenticación con Supabase Auth
- [ ] Políticas RLS por usuario autenticado
- [ ] UI de generación de recetas con streaming
- [ ] Integración Stripe completa (webhooks)
- [ ] Generación de íconos PWA reales
- [ ] Tests con Playwright / Vitest

## Variables de entorno requeridas

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (solo servidor) |
| `ANTHROPIC_API_KEY` | Clave API de Anthropic |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secreto del webhook de Stripe |
