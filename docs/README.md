# Documentación del Proyecto Diabetify

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

| Documento                                     | Descripción                                          |
| --------------------------------------------- | ---------------------------------------------------- |
| [README Principal](../README.md)              | Instalación rápida y comandos disponibles            |
| [Arquitectura del Sistema](./ARCHITECTURE.md) | Patrones de diseño, servicios y flujo de datos       |
| [Guía de Testing](./TESTING_GUIDE.md)         | Estrategias de testing (unitarios, integración, E2E) |
| [Algoritmos Médicos](./MEDICAL_ALGORITHMS.md) | Lógica de cálculos de glucosa e insulina             |
| [Manual de Usuario](./USER_GUIDE.md)          | Guía de uso para pacientes y familias                |

---

## Estructura del Proyecto

```
diabetify/
├── src/app/
│   ├── core/          # Servicios, guards, interceptores
│   ├── shared/        # Componentes reutilizables
│   ├── dashboard/     # Panel principal
│   ├── readings/      # Lecturas de glucosa
│   ├── appointments/  # Citas médicas
│   └── profile/       # Perfil de usuario
├── android/           # Proyecto Android nativo
├── docs/              # Esta documentación
└── playwright/        # Tests E2E
```

---

## Recursos Adicionales

### Capturas de Pantalla

Las capturas de la aplicación se encuentran en:

- `docs/assets/screenshots/` - Pantallas de la aplicación móvil
- `docs/screenshots/` - Pantallas del backoffice administrativo

---

## Stack Tecnológico

| Componente          | Tecnología                             |
| ------------------- | -------------------------------------- |
| Framework Frontend  | Angular 21 + Ionic 8                   |
| Plataforma Móvil    | Capacitor 8.0                          |
| Lenguaje            | TypeScript 5.9                         |
| Estilos             | Tailwind CSS 3.4 + DaisyUI 5           |
| Base de Datos Local | Dexie 4.2 (IndexedDB)                  |
| Testing             | Vitest 4 (unitarios), Playwright (E2E) |

---

## Contacto

Para consultas sobre el proyecto, contactar al equipo de desarrollo.

---

_Última actualización: Enero 2026_
