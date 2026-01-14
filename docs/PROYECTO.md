# Descripción del Proyecto

## 1. Introducción

### 1.1 Contexto

La diabetes tipo 1 en pacientes pediátricos requiere un monitoreo constante de los niveles de glucosa en sangre. Los pacientes y sus familias deben registrar múltiples lecturas diarias, gestionar citas médicas y mantener comunicación con el equipo de salud.

El Hospital de Pediatría Garrahan, centro de referencia nacional en Argentina, atiende a cientos de pacientes pediátricos con diabetes. Actualmente, muchos pacientes registran sus lecturas en papel o aplicaciones genéricas que no están adaptadas a sus necesidades específicas.

### 1.2 Problema

Los sistemas existentes presentan las siguientes limitaciones:

1. **Conectividad**: Requieren conexión permanente a internet, problemático en zonas con conectividad limitada
2. **Idioma**: Mayoría en inglés, sin soporte adecuado para español
3. **Complejidad**: Interfaces diseñadas para adultos, no adaptadas a pacientes pediátricos
4. **Integración**: No se integran con sistemas de glucómetros continuos como Tidepool

---

## 2. Objetivos

### 2.1 Objetivo General

Desarrollar una aplicación móvil que permita a pacientes pediátricos con diabetes y sus familias gestionar su tratamiento de forma simple, accesible y sin dependencia de conectividad.

### 2.2 Objetivos Específicos

1. Implementar registro de lecturas de glucosa con funcionamiento offline
2. Desarrollar sistema de gestión de citas médicas con notificaciones
3. Integrar autenticación con Tidepool para acceso a datos de glucómetros continuos
4. Soportar múltiples idiomas (español e inglés)
5. Diseñar interfaz accesible para distintos grupos etarios

---

## 3. Alcance

### 3.1 Incluido

- Registro manual de lecturas de glucosa (SMBG)
- Gestión de citas médicas con recordatorios
- Autenticación mediante Tidepool OAuth
- Sincronización de datos con backend cuando hay conectividad
- Soporte para Android y navegadores web
- Interfaz en español e inglés

### 3.2 Excluido

- Sincronización automática de datos desde dispositivos CGM
- Soporte para iOS (fuera del alcance inicial)
- Integración con historia clínica electrónica del hospital
- Funcionalidades de telemedicina

---

## 4. Usuarios

### 4.1 Usuarios Primarios

- **Pacientes pediátricos** (6-18 años): Registro de lecturas con supervisión
- **Padres/tutores**: Gestión completa de la cuenta y citas

### 4.2 Usuarios Secundarios

- **Equipo médico**: Visualización de datos de pacientes (mediante backend)
- **Administradores**: Gestión de usuarios y configuración

---

## 5. Requerimientos Funcionales

| ID   | Requerimiento                                               | Prioridad |
| ---- | ----------------------------------------------------------- | --------- |
| RF01 | Registro de lecturas de glucosa con valor, fecha y contexto | Alta      |
| RF02 | Visualización de historial de lecturas                      | Alta      |
| RF03 | Funcionamiento sin conexión a internet                      | Alta      |
| RF04 | Sincronización automática al recuperar conectividad         | Alta      |
| RF05 | Gestión de citas médicas                                    | Media     |
| RF06 | Notificaciones de recordatorio                              | Media     |
| RF07 | Autenticación mediante Tidepool                             | Media     |
| RF08 | Cambio de idioma (ES/EN)                                    | Baja      |
| RF09 | Tema claro/oscuro                                           | Baja      |

---

## 6. Requerimientos No Funcionales

| ID    | Requerimiento           | Métrica                      |
| ----- | ----------------------- | ---------------------------- |
| RNF01 | Tiempo de carga inicial | < 3 segundos                 |
| RNF02 | Funcionamiento offline  | 100% de funcionalidades core |
| RNF03 | Cobertura de tests      | > 70%                        |
| RNF04 | Accesibilidad           | WCAG 2.1 AA                  |
| RNF05 | Soporte de dispositivos | Android 8+                   |

---

## 7. Metodología

El desarrollo siguió una metodología iterativa con las siguientes etapas:

1. **Análisis**: Relevamiento de necesidades con equipo médico del Hospital Garrahan
2. **Diseño**: Definición de arquitectura y diseño de interfaces
3. **Implementación**: Desarrollo iterativo con integración continua
4. **Testing**: Pruebas unitarias, de integración y E2E
5. **Despliegue**: Instalación en dispositivos de prueba

---

## 8. Cronograma

| Fase                 | Duración  | Entregables                          |
| -------------------- | --------- | ------------------------------------ |
| Análisis y diseño    | 4 semanas | Documento de requerimientos, mockups |
| Desarrollo core      | 8 semanas | Módulos de lecturas y citas          |
| Integración Tidepool | 3 semanas | Autenticación OAuth                  |
| Testing y ajustes    | 3 semanas | Informe de pruebas                   |
| Documentación        | 2 semanas | Documentación técnica y de usuario   |

---

## 9. Riesgos

| Riesgo                            | Probabilidad | Impacto | Mitigación                                      |
| --------------------------------- | ------------ | ------- | ----------------------------------------------- |
| Cambios en API de Tidepool        | Media        | Alto    | Capa de abstracción, monitoreo de cambios       |
| Problemas de rendimiento offline  | Baja         | Alto    | IndexedDB optimizado, límites de almacenamiento |
| Incompatibilidad con dispositivos | Media        | Medio   | Testing en múltiples dispositivos               |

---

## 10. Conclusiones

El proyecto Diabetify aborda una necesidad real del Hospital Garrahan, proporcionando una herramienta adaptada a pacientes pediátricos con diabetes. La arquitectura offline-first y el soporte bilingüe lo diferencian de soluciones genéricas existentes.
