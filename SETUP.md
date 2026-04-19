# BibleTrivia Youth — Guía de configuración

## 1. Crear proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) y crear un nuevo proyecto
2. Ir a **Settings > API** y copiar:
   - `Project URL`
   - `anon public` key

## 2. Configurar variables de entorno

Editar `.env.local` con tus datos reales:

```
NEXT_PUBLIC_SUPABASE_URL=https://tuproyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

## 3. Ejecutar el schema SQL en Supabase

1. Ir a **SQL Editor** en el dashboard de Supabase
2. Copiar y ejecutar el contenido de `supabase/schema.sql`
3. Esto crea las tablas, políticas RLS, triggers y datos de ejemplo

## 4. Crear tu cuenta de admin

1. Registrarte normalmente en la app (`/register`)
2. En Supabase > **Table Editor > profiles**, buscar tu usuario
3. Cambiar el campo `role` de `user` a `admin`
4. Ya podés acceder a `/admin`

## 5. Correr en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## 6. Deploy en Vercel

1. Subir el código a GitHub
2. Importar en [vercel.com](https://vercel.com)
3. Agregar las variables de entorno en Vercel
4. Deploy automático

---

## Estructura de la app

| Ruta | Descripción |
|------|-------------|
| `/` | Inicio con stats del usuario |
| `/login` | Login |
| `/register` | Registro |
| `/trivia` | Trivias del día (requiere login) |
| `/ranking` | Tabla de posiciones |
| `/anuncios` | Anuncios y eventos (público) |
| `/profile` | Perfil del usuario (requiere login) |
| `/admin` | Panel admin (requiere rol admin) |
| `/admin/preguntas` | Gestionar preguntas |
| `/admin/anuncios` | Gestionar anuncios |
| `/admin/eventos` | Gestionar eventos |
