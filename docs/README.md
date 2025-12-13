# Documentación del Proyecto Diabetactic

Trabajo Profesional de Ingeniería Informática
**Universidad de Buenos Aires - Facultad de Ingeniería**

---

## Índice de Documentación

### Documentación Académica

| Documento                                     | Descripción                                            |
| --------------------------------------------- | ------------------------------------------------------ |
| [Descripción del Proyecto](./PROYECTO.md)     | Contexto, objetivos, alcance, metodología y cronograma |
| [Despliegue y Configuración](./DESPLIEGUE.md) | Requisitos, arquitectura de despliegue e instalación   |

### Documentación Técnica

| Documento                                     | Descripción                                      |
| --------------------------------------------- | ------------------------------------------------ |
| [README Principal](../README.md)              | Instalación rápida y comandos disponibles        |
| [Arquitectura del Sistema](./ARCHITECTURE.md) | Patrones de diseño, servicios y flujo de datos   |
| [Guía de Testing](./TESTING_GUIDE.md)         | Estrategias de testing (unitarios, E2E, Maestro) |
| [Manual de Usuario](./USER_GUIDE.md)          | Guía de uso para pacientes y familias            |

---

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
├── android/           # Proyecto Android nativo
├── docs/              # Esta documentación
├── playwright/        # Tests E2E web
└── maestro/           # Tests E2E mobile
```

---

## Recursos Adicionales

### Capturas de Pantalla

Las capturas de la aplicación se encuentran en:

- `docs/assets/screenshots/` - Pantallas de la aplicación móvil
- `docs/screenshots/` - Pantallas del backoffice administrativo

### APK de Prueba

Disponible en `docs/diabetactic-v0.0.1.apk` para instalación en dispositivos Android.

---

## Contacto

Para consultas sobre el proyecto, contactar al equipo de desarrollo.
