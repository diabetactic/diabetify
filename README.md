# Diabetactic

Aplicación móvil desarrollada con Ionic/Angular para la gestión de lecturas de glucosa en pacientes diabéticos, con integración a la API de Tidepool.

## Descripción del Proyecto

Diabetactic es una aplicación móvil multiplataforma diseñada para facilitar el seguimiento y control de niveles de glucosa en sangre. El sistema permite a los usuarios registrar sus lecturas, visualizar tendencias históricas y sincronizar datos con servicios externos como Tidepool.

### Características Principales

- Registro y visualización de lecturas de glucosa
- Dashboard con estadísticas y tendencias
- Gestión de citas médicas
- Soporte offline con sincronización automática
- Interfaz bilingüe (Español/Inglés)
- Temas claro y oscuro

## Stack Tecnológico

| Componente          | Tecnología                         |
| ------------------- | ---------------------------------- |
| Framework Frontend  | Angular 20 + Ionic 8               |
| Plataforma Móvil    | Capacitor 6.2                      |
| Lenguaje            | TypeScript 5.8                     |
| Estilos             | Tailwind CSS v3 + DaisyUI          |
| Base de Datos Local | Dexie (IndexedDB)                  |
| Testing             | Jest (unitarios), Playwright (E2E) |

## Requisitos Previos

- Node.js 20+
- npm 10+
- Android Studio (para compilación Android)
- Java 21

### Compatibilidad Android

| Versión                | SDK | Soporte            |
| ---------------------- | --- | ------------------ |
| Android 5.1 (Lollipop) | 22  | Mínimo             |
| Android 14             | 34  | Target/Compilación |

Cubre aproximadamente 98% de dispositivos activos.

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/diabetactic/diabetactic-app.git
cd diabetactic-app

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm start
```

La aplicación estará disponible en `http://localhost:4200`

## Scripts Disponibles

### Desarrollo

```bash
npm start              # Servidor de desarrollo
npm run build          # Compilación desarrollo
npm run build:prod     # Compilación producción
```

### Testing

```bash
npm run test:unit      # Tests unitarios
npm run test:ci        # Tests para CI (headless)
npm run test:coverage  # Tests con reporte de cobertura
npm run test:e2e       # Tests E2E con Playwright
```

### Calidad de Código

```bash
npm run lint           # Análisis estático (ESLint)
npm run lint:fix       # Corrección automática
npm run format         # Formateo (Prettier)
npm run format:check   # Verificar formato
```

### Compilación Móvil

```bash
npm run mobile:sync    # Build producción + sincronizar con Capacitor
npm run android:open   # Abrir proyecto en Android Studio
npm run mobile:run     # Compilar e instalar en dispositivo conectado
npm run deploy:device  # Build + reinstalar APK en dispositivo
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

- **Componentes Standalone**: Angular 20 sin NgModules
- **Servicios Singleton**: Inyección de dependencias en root
- **Offline-First**: Almacenamiento local con sincronización diferida
- **Lazy Loading**: Carga bajo demanda de módulos

### Flujo de Datos

1. Los datos se almacenan localmente en IndexedDB (Dexie)
2. Se sincronizan con el backend cuando hay conexión
3. Los servicios exponen Observables para reactividad

## Testing

### Tests Unitarios

Ejecutados con Jest:

```bash
npm test              # Ejecutar tests
npm run test:watch    # Modo watch
npm run test:coverage # Con reporte de cobertura
```

### Tests E2E

Ejecutados con Playwright:

```bash
npm run test:e2e
```

Los tests se encuentran en `playwright/tests/`

## Configuración de Entornos

El proyecto soporta múltiples entornos:

- `environment.ts` - Desarrollo
- `environment.prod.ts` - Producción
- `environment.mock.ts` - Datos simulados
- `environment.heroku.ts` - Backend en Heroku

## Documentación

- [Guía Rápida Android](docs/ANDROID_QUICK_START.md) - Compilar e instalar
- [Modos de Backend](docs/BACKEND_MODE_GUIDE.md) - mock/local/cloud
- [Testing](docs/TESTING_GUIDE.md) - Jest y Playwright
- [Arquitectura](docs/ARCHITECTURE.md) - Estructura del proyecto

> La configuración de Android Studio ya está incluida en el repositorio (carpeta `android/.idea/`)

## Autores

Trabajo Profesional - FIUBA
