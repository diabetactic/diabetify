# Documentación - Diabetactic

Documentación del proyecto Diabetactic, aplicación móvil para gestión de diabetes.

## Índice de Documentación

### Guías Principales

| Documento                                      | Descripción                                          |
| ---------------------------------------------- | ---------------------------------------------------- |
| [README Principal](../README.md)               | Visión general del proyecto e instalación            |
| [Arquitectura](./ARCHITECTURE.md)              | Arquitectura del sistema y patrones de diseño        |
| [Guía de Estilos](./STYLING_GUIDE.md)          | Convenciones de CSS y componentes UI                 |
| [Guía de Testing](./TESTING_GUIDE.md)          | Estrategias de testing (unitarios, integración, E2E) |
| [Guía de Traducciones](./TRANSLATION_GUIDE.md) | Implementación de i18n                               |
| [Guía Hospital](./HOSPITAL_SETUP_GUIDE.md)     | Guía de configuración para TI del hospital           |
| [Guía de Usuario](./USER_GUIDE.md)             | Manual de uso para usuarios finales                  |
| [Scripts NPM](./NPM_SCRIPTS_GUIDE.md)          | Referencia completa de comandos npm                  |
| [Modos de Backend](./BACKEND_MODE_GUIDE.md)    | Configuración de mock/local/cloud                    |
| [Desarrollo Android](./ANDROID_DEVELOPMENT.md) | Configuración y compilación Android                  |

## Estructura del Proyecto

```
diabetactic/
├── src/app/
│   ├── core/          # Servicios, guards, interceptores
│   ├── shared/        # Componentes reutilizables
│   ├── dashboard/     # Panel principal
│   ├── readings/      # Lecturas de glucosa
│   ├── appointments/  # Citas médicas
│   └── profile/       # Perfil de usuario
├── docs/              # Esta documentación
└── playwright/tests/  # Tests E2E
```

## Enlaces Rápidos

### Desarrollo

- [Instalación](../README.md#instalación)
- [Scripts Disponibles](../README.md#scripts-disponibles)
- [Estructura del Proyecto](../README.md#estructura-del-proyecto)

### Testing

- [Tests Unitarios](./TESTING_GUIDE.md#tests-unitarios)
- [Tests de Integración](./TESTING_GUIDE.md#tests-unitarios-jest)
- [Tests E2E](./TESTING_GUIDE.md#tests-e2e)

### Estilos

- [Tailwind CSS](./STYLING_GUIDE.md#stack-de-estilos)
- [Modo Oscuro](./STYLING_GUIDE.md#modo-oscuro)
- [Patrones Comunes](./STYLING_GUIDE.md#patrones-comunes)

## Automatización y Scripts

Flujos de automatización disponibles en `scripts/`:

- `./scripts/run-integration-suite.sh` — levanta servicios backend (vía container-managing), verifica salud y ejecuta `npm run test:integration` (Jest).
- `./scripts/check-state.sh` — pre-flight de entorno Android (SDK, Java 25, dispositivo/emulador, APK disponible).
- `./scripts/aliases.sh` — funciones de conveniencia (rebuild/deploy, screenshots, logs). Sugerido: `source scripts/aliases.sh` en tu shell.

## Soporte

Para dudas sobre el proyecto, consultar la documentación correspondiente o contactar al equipo de desarrollo.
