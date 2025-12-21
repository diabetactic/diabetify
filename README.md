# Diabetify

Aplicación móvil desarrollada con Ionic/Angular para la gestión de lecturas de glucosa en pacientes diabéticos. Integración con Tidepool para autenticación de usuarios.

## Descripción del Proyecto

Diabetactic es una aplicación móvil multiplataforma diseñada para facilitar el seguimiento y control de niveles de glucosa en sangre. El sistema permite a los usuarios registrar sus lecturas, visualizar tendencias históricas y gestionar citas médicas. Los datos se almacenan en el backend de Diabetactic, con autenticación opcional vía Tidepool.

### Características Principales

- Registro y visualización de lecturas de glucosa
- Dashboard con estadísticas y tendencias
- Gestión de citas médicas
- Soporte offline con sincronización automática
- Interfaz bilingüe (Español/Inglés)
- Temas claro y oscuro

## Stack Tecnológico

| Componente          | Tecnología                             |
| ------------------- | -------------------------------------- |
| Framework Frontend  | Angular 21 + Ionic 8                   |
| Plataforma Móvil    | Capacitor 8.0                          |
| Lenguaje            | TypeScript 5.9                         |
| Estilos             | Tailwind CSS 3.4 + DaisyUI 5           |
| Base de Datos Local | Dexie 4.2 (IndexedDB)                  |
| Testing             | Vitest 4 (unitarios), Playwright (E2E) |

## Requisitos Previos

- Node.js 20+
- pnpm 10+ (recomendado) o npm 10+
- Android Studio (para compilación Android)
- Java 21

## Instalación

```bash
git clone https://github.com/diabetactic/diabetify.git
cd diabetify

# Con pnpm (recomendado)
pnpm install
pnpm run start:mock  # Sin backend (recomendado para desarrollo)

# O con npm (si no tienes pnpm)
npm install
npm run start:mock
```

La aplicación estará disponible en `http://localhost:4200`

## Scripts Disponibles

### Desarrollo

```bash
pnpm start             # Servidor de desarrollo
pnpm run build         # Compilación desarrollo
pnpm run build:prod    # Compilación producción
```

### Testing

```bash
pnpm run test:unit     # Tests unitarios
pnpm run test:ci       # Tests para CI (headless)
pnpm run test:coverage # Tests con reporte de cobertura
pnpm run test:e2e      # Tests E2E con Playwright
```

### Calidad de Código

```bash
pnpm run lint          # Análisis estático (ESLint)
pnpm run lint:fix      # Corrección automática
pnpm run format        # Formateo (Prettier)
pnpm run format:check  # Verificar formato
```

### Compilación Móvil

```bash
pnpm run cap:sync      # Sincronizar assets con plataformas nativas
pnpm run cap:android   # Abrir proyecto en Android Studio
pnpm run cap:run:android # Compilar y ejecutar en dispositivo
```

## Estructura del Proyecto

```
src/
├── app/
│   ├── core/              # Servicios singleton e interceptores
│   │   ├── services/      # Lógica de negocio
│   │   ├── models/        # Interfaces y tipos
│   │   └── guards/        # Guards de navegación
│   ├── shared/            # Componentes reutilizables
│   ├── dashboard/         # Módulo principal
│   ├── readings/          # Gestión de lecturas
│   ├── appointments/      # Gestión de citas
│   ├── profile/           # Perfil de usuario
│   └── login/             # Autenticación
├── assets/
│   └── i18n/              # Archivos de traducción
├── environments/          # Configuración por entorno
└── theme/                 # Estilos globales
```

## Arquitectura

La aplicación sigue una arquitectura modular con los siguientes principios:

- **Componentes Standalone**: Angular 21 sin NgModules
- **Servicios Singleton**: Inyección de dependencias en root
- **Offline-First**: Almacenamiento local con sincronización diferida
- **Lazy Loading**: Carga bajo demanda de módulos

### Flujo de Datos

1. Los datos se almacenan localmente en IndexedDB (Dexie)
2. Se sincronizan con el backend cuando hay conexión
3. Los servicios exponen Observables para reactividad

## Testing

### Tests Unitarios

Ejecutados con Vitest:

```bash
pnpm test             # Ejecutar tests
pnpm run test:watch   # Modo watch
pnpm run test:coverage # Con reporte de cobertura
```

### Tests E2E

Ejecutados con Playwright:

```bash
pnpm run test:e2e
```

Los tests se encuentran en `playwright/tests/`

## Configuración de Entornos

El proyecto soporta múltiples entornos:

- `environment.ts` - Desarrollo
- `environment.prod.ts` - Producción
- `environment.mock.ts` - Datos simulados
- `environment.heroku.ts` - Backend en Heroku

## Documentación Adicional

- [Arquitectura](docs/ARCHITECTURE.md)
- [Guía de Estilos](docs/STYLING_GUIDE.md)
- [Guía de Testing](docs/TESTING_GUIDE.md)
- [Guía de Traducciones](docs/TRANSLATION_GUIDE.md)

## Autores

Trabajo Profesional - FIUBA
