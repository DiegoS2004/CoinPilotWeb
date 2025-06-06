# CoinPilot

![CoinPilot Logo](public/coinpilot.png)

**CoinPilot** es una aplicación web moderna para la gestión de finanzas personales, con soporte para ahorros, inversiones y criptomonedas.

## 🚀 Demo

[Ver demo en producción](https://coin-pilot.vercel.app)

## Características
- Registro e inicio de sesión con Google y GitHub
- Dashboard con balance, ingresos, gastos y reportes
- Sección de ahorros y transferencias al balance neto
- Sección de inversiones
- Sección de criptomonedas (BTC/ETH) con consulta en tiempo real
- Modo discreto para ocultar montos
- UI moderna y responsiva

## Instalación

```bash
# Clona el repositorio
 git clone https://github.com/tuusuario/coinpilot.git
 cd coinpilot/coinpilot

# Instala dependencias
 npm install

# Copia el archivo de entorno y configura tus claves de Supabase
 cp .env.example .env.local

# Inicia el servidor de desarrollo
 npm run dev
```

## Configuración
1. Crea un proyecto en [Supabase](https://supabase.com/).
2. Configura las variables de entorno en `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Habilita los proveedores de Google y GitHub en Supabase Auth.
4. Crea las tablas necesarias usando el SQL de la carpeta `/sql` o desde el dashboard de Supabase.

## Scripts útiles
- `npm run dev` — Inicia el servidor de desarrollo
- `npm run build` — Compila la app para producción
- `npm run start` — Inicia la app en modo producción

## Contribuir
¡Las contribuciones son bienvenidas! Abre un issue o pull request para sugerencias o mejoras.

## Licencia
MIT

---


