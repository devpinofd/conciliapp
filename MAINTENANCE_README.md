# Modo Mantenimiento - Documentación de Implementación

## Descripción General

Se ha implementado un sistema completo de modo mantenimiento para la aplicación Conciliapp que permite:

- **Gestión centralizada**: Control del estado de mantenimiento desde el backend
- **Dos modos de operación**: Completo (`full`) y Solo Lectura (`read-only`)
- **Bypass para administradores**: Los administradores pueden operar durante mantenimiento
- **UI accesible**: Banner y overlay con soporte para accesibilidad
- **Integración segura**: Validación tanto en frontend como backend

## Archivos Modificados/Creados

### 1. `maintenance.js` (NUEVO)
- **MaintenanceService**: Clase principal para gestión del estado
- **Endpoints públicos**: `getMaintenanceStatus()`, `enableMaintenance()`, `disableMaintenance()`
- **Persistencia**: Utiliza PropertiesService para almacenar estado
- **Administración**: Sistema de permisos basado en ADMIN_EMAILS

### 2. `auth.js` (MODIFICADO)
- **processLogin()**: Agregado verificación de mantenimiento antes del login
- **Integración**: Usa `MaintenanceService.assertOperationAllowed()` para validar acceso

### 3. `index.html` (MODIFICADO)
- **CSS**: Estilos para banner y overlay de mantenimiento
- **HTML**: Elementos de UI para mostrar estado de mantenimiento
- **JavaScript**: Clase `MaintenanceUI` para gestión de interfaz
- **Integración**: Verificaciones en `submitForm()` y `deleteRecord()`

### 4. `maintenance-test.js` (NUEVO)
- **Pruebas manuales**: Scripts para validar funcionalidad
- **Documentación**: Instrucciones de uso y configuración

## Configuración Inicial

### 1. Configurar Administradores
En Script Properties de Google Apps Script, añadir:
```
ADMIN_EMAILS = "admin1@empresa.com,admin2@empresa.com"
```

### 2. Ejecutar Pruebas
```javascript
// En la consola de GAS
setupAdmins(); // Configurar administradores
runAllTests(); // Ejecutar todas las pruebas
```

## Uso del Sistema

### Activar Mantenimiento Completo
```javascript
enableMaintenance({
  mode: 'full',
  message: 'Sistema en mantenimiento programado. Reiniciamos a las 14:00.',
  allowAdmins: true,
  until: '2024-01-15T14:00:00.000Z'
});
```

### Activar Modo Solo Lectura
```javascript
enableMaintenance({
  mode: 'read-only',
  message: 'Actualizando base de datos. Solo consulta disponible.',
  allowAdmins: false
});
```

### Desactivar Mantenimiento
```javascript
disableMaintenance();
```

### Consultar Estado
```javascript
getMaintenanceStatus();
```

## Comportamiento de la UI

### Modo Completo (`full`)
- ✅ Banner naranja visible en la parte superior
- ✅ Overlay modal que bloquea toda la interfaz
- ✅ Formulario completamente deshabilitado
- ✅ Mensaje personalizable en overlay

### Modo Solo Lectura (`read-only`)
- ✅ Banner naranja visible en la parte superior
- ❌ Sin overlay modal
- ✅ Navegación y consulta permitida
- ❌ Botones de envío y eliminación deshabilitados

### Mantenimiento Desactivado
- ❌ Sin banner ni overlay
- ✅ Funcionalidad completa disponible

## Características de Seguridad

### Backend
- **Validación en login**: `processLogin()` verifica estado antes de autenticar
- **Control de operaciones**: `assertOperationAllowed()` valida cada acción
- **Permisos de admin**: Solo administradores pueden cambiar estado
- **Auditoría**: Logs de cambios con timestamp y usuario

### Frontend
- **Doble validación**: UI y backend verifican estado independientemente
- **Degradación gradual**: La app funciona aunque falle la verificación
- **Accesibilidad**: Uso de `aria-live` y `aria-modal`

## Flujo de Trabajo

### 1. Activación de Mantenimiento
1. Admin ejecuta `enableMaintenance()`
2. Estado se guarda en PropertiesService
3. Usuarios existentes ven banner/overlay inmediatamente
4. Nuevos logins son bloqueados (excepto admins si `allowAdmins=true`)

### 2. Durante Mantenimiento
- **Modo Full**: UI completamente bloqueada, solo consulta de estado
- **Modo Read-Only**: Navegación permitida, operaciones de escritura bloqueadas
- **Admins**: Pueden hacer bypass si `allowAdmins=true`

### 3. Desactivación
1. Admin ejecuta `disableMaintenance()`
2. Banner y overlay se ocultan automáticamente
3. Funcionalidad se restaura completamente

## Principios SOLID Aplicados

### Single Responsibility Principle (SRP)
- `MaintenanceService`: Solo gestiona estado de mantenimiento
- `MaintenanceUI`: Solo gestiona interfaz de mantenimiento

### Open/Closed Principle (OCP)
- Estado extensible con nuevas propiedades sin cambiar API
- Nuevos modos de mantenimiento pueden agregarse fácilmente

### Liskov Substitution Principle (LSP)
- `getMaintenanceStatus()` siempre retorna el mismo formato
- Comportamiento predecible independiente del estado interno

### Interface Segregation Principle (ISP)
- Frontend solo depende de `getMaintenanceStatus()`
- Gestión administrativa separada en endpoints específicos

### Dependency Inversion Principle (DIP)
- UI depende de abstracciones, no de implementaciones específicas
- Persistencia encapsulada detrás del servicio

## Pruebas Manuales Recomendadas

### Configuración Inicial
1. Ejecutar `setupAdmins()` con emails reales
2. Verificar que `ADMIN_EMAILS` esté configurado correctamente

### Pruebas de Funcionamiento
1. **Modo Completo**: Activar y verificar overlay + banner
2. **Modo Solo Lectura**: Activar y verificar solo banner
3. **Bypass Admin**: Verificar que admins pueden operar cuando `allowAdmins=true`
4. **Bloqueo Login**: Intentar login durante mantenimiento
5. **Desactivación**: Verificar que UI vuelve a la normalidad

### Verificaciones de Seguridad
1. Usuario no-admin no puede activar/desactivar mantenimiento
2. Backend bloquea operaciones de escritura en modo mantenimiento
3. Estado persiste correctamente entre sesiones

## Notas de Implementación

- **Compatibilidad**: 100% compatible con Google Apps Script
- **Sin dependencias**: No requiere librerías externas
- **Retrocompatibilidad**: No afecta funcionalidad existente
- **Rendimiento**: Mínimo impacto, verificación asíncrona
- **Escalabilidad**: Preparado para futuras extensiones

## Futuras Mejoras Sugeridas

1. **Programación automática**: Timer para activar/desactivar automáticamente
2. **Notificaciones**: Email a usuarios sobre mantenimiento programado
3. **Métricas**: Tracking de uso durante mantenimiento
4. **UI de administración**: Panel para gestionar mantenimiento sin código
5. **Mantenimiento selectivo**: Por módulos o usuarios específicos