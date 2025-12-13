# Guía de Configuración Hospital - Diabetactic

Guía rápida para el equipo de TI del hospital. Cubre instalación, seguridad y mantenimiento.

---

## Requisitos del Sistema

| Componente  | Versión   |
| ----------- | --------- |
| Node.js     | 20+       |
| npm         | 10+       |
| Java JDK    | 21        |
| Android SDK | API 22-34 |

**Dispositivos Android**: Android 5.1+ con WebView Chromium 90+

---

## Instalación Rápida

```bash
git clone https://github.com/diabetactic/diabetactic-app.git
cd diabetactic-app
npm install
npm test
```

Para configuración detallada, ver:

- [Desarrollo Android](./ANDROID_DEVELOPMENT.md) - Compilación y despliegue
- [Modos de Backend](./BACKEND_MODE_GUIDE.md) - Configuración mock/local/cloud
- [Scripts NPM](./NPM_SCRIPTS_GUIDE.md) - Comandos disponibles

---

## Seguridad

- **PHI**: Logger redacta datos sensibles automáticamente
- **Credenciales**: Almacenadas en Android Keystore
- **HTTPS**: Obligatorio en producción
- **Tokens**: Expiran por inactividad

---

## Backup

### Archivos Críticos (NO commitear)

- `android/keystore.jks` - Guardar en lugar seguro
- `android/keystore.properties`
- `src/environments/environment.prod.ts`

### Backup de Datos Android

```bash
adb backup -f diabetactic-backup.ab io.diabetactic.app
adb restore diabetactic-backup.ab
```

---

## Versionado

En `android/app/build.gradle`:

```groovy
versionCode 1        // Incrementar cada release
versionName "1.0.0"  // Semántico
```

---

## Mantenimiento

| Frecuencia | Tarea                              |
| ---------- | ---------------------------------- |
| Diario     | Revisar logs de error              |
| Semanal    | Verificar actualizaciones npm      |
| Mensual    | Parches de seguridad               |
| Trimestral | Actualizar Angular/Ionic/Capacitor |

---

## Documentación Relacionada

- [Desarrollo Android](./ANDROID_DEVELOPMENT.md) - Configuración completa Android
- [Modos de Backend](./BACKEND_MODE_GUIDE.md) - Entornos mock/local/cloud
- [Guía de Testing](./TESTING_GUIDE.md) - Pruebas unitarias y E2E
- [Guía de Usuario](./USER_GUIDE.md) - Manual para usuarios finales
