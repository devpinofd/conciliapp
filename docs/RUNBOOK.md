# Runbook Operativo - Conciliapp

Este runbook proporciona procedimientos operativos, guías de resolución de problemas y tareas de mantenimiento para el sistema Conciliapp.

## Información del Sistema

### Arquitectura General
- **Plataforma**: Google Apps Script
- **Base de Datos**: Google Sheets
- **Autenticación**: Custom (HMAC-SHA256)
- **APIs Externas**: eFactory para sincronización de vendedores
- **Usuarios Objetivo**: ~50-100 vendedores activos

### Componentes Críticos
- AuthManager: Gestión de autenticación y autorización
- DataFetcher: Sincronización con APIs externas  
- CacheManager: Optimización de consultas y sesiones
- MaintenanceService: Operaciones de mantenimiento programadas

## Operaciones Rutinarias

### Tareas Diarias

#### 1. Verificación de Salud del Sistema
```bash
Frecuencia: Diaria (8:00 AM)
Duración: 5-10 minutos
```

**Pasos:**
1. Acceder a Google Apps Script > Ejecuciones
2. Revisar ejecuciones de las últimas 24 horas
3. Verificar que no hay errores críticos
4. Comprobar el reporte de salud automático

**Métricas a Verificar:**
- Cantidad de logins exitosos vs fallidos
- Número de registros de cobranza creados
- Status de sincronización de vendedores
- Uso de quota de Apps Script

**Acciones si hay Problemas:**
- Si errores > 5%: Investigar logs detallados
- Si quota > 80%: Activar modo de optimización
- Si API externa falla: Verificar conectividad

#### 2. Revisión de Auditoría
```bash
Frecuencia: Diaria (6:00 PM)
Duración: 10-15 minutos
```

**Verificar en Hoja "Auditoria":**
- Intentos de login sospechosos (múltiples fallas)
- Registros de cobranza fuera de horario laboral
- Eliminaciones de registros (revisar justificación)
- Cambios en configuración del sistema

**Alertas que Requieren Acción:**
- Más de 10 intentos fallidos del mismo usuario
- Logins desde IPs geográficamente inesperadas
- Eliminación masiva de registros
- Errores de sincronización con eFactory

### Tareas Semanales

#### 1. Backup Completo de Datos
```bash
Frecuencia: Domingos 2:00 AM (automático)
Verificación: Lunes 8:00 AM
```

**Procedimiento de Verificación:**
1. Ejecutar función `diagnosticarBackups()`
2. Verificar que backup está en Google Drive
3. Comprobar integridad de datos principales
4. Confirmar que backup es restaurable

```javascript
function diagnosticarBackups() {
  const folders = DriveApp.getFoldersByName('Backup-Conciliapp');
  while (folders.hasNext()) {
    const folder = folders.next();
    const files = folder.getFiles();
    Logger.log('Backup folder: ' + folder.getName());
    Logger.log('Archivos: ' + Array.from(files).length);
  }
}
```

#### 2. Limpieza de Datos Obsoletos
```bash
Frecuencia: Viernes 11:00 PM
Duración: 30 minutos
```

**Tareas de Limpieza:**
- Eliminar tokens de sesión expirados (>7 días)
- Archivar registros de auditoría antiguos (>90 días)
- Limpiar caché de datos no utilizados
- Consolidar logs de sincronización

### Tareas Mensuales

#### 1. Análisis de Performance
- Revisar métricas de tiempo de respuesta
- Analizar uso de quotas y optimizar si es necesario
- Evaluar crecimiento de datos y planificar escalabilidad
- Revisar y actualizar configuraciones de caché

#### 2. Actualización de Vendedores
- Verificar sincronización completa con eFactory
- Revisar usuarios inactivos y marcar para limpieza
- Actualizar permisos según cambios organizacionales

## Procedimientos de Emergencia

### Problema: Sistema No Responde

#### Síntomas:
- Web app retorna errores 500
- Timeouts en todas las operaciones
- Logs muestran errores masivos

#### Diagnóstico Rápido:
```javascript
function diagnosticoEmergencia() {
  // Verificar quota
  const quotaStatus = obtenerEstadoQuota();
  Logger.log('Quota status: ' + JSON.stringify(quotaStatus));
  
  // Verificar conectividad con Sheet
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    Logger.log('Sheet conexión: OK');
  } catch (e) {
    Logger.log('Sheet ERROR: ' + e.toString());
  }
  
  // Verificar caché
  const cache = CacheService.getScriptCache();
  cache.put('test', 'value', 10);
  const testValue = cache.get('test');
  Logger.log('Cache status: ' + (testValue ? 'OK' : 'ERROR'));
}
```

#### Soluciones por Prioridad:
1. **Inmediata**: Activar modo mantenimiento para prevenir más errores
2. **5 minutos**: Limpiar caché completamente
3. **10 minutos**: Reiniciar triggers si están causando loops
4. **15 minutos**: Rollback a versión anterior si es problema de deploy

#### Activar Modo Mantenimiento:
```javascript
function activarModoMantenimiento(motivo) {
  PropertiesService.getScriptProperties().setProperty('MAINTENANCE_MODE', 'true');
  PropertiesService.getScriptProperties().setProperty('MAINTENANCE_REASON', motivo);
  Logger.log('Modo mantenimiento activado: ' + motivo);
}

function desactivarModoMantenimiento() {
  PropertiesService.getScriptProperties().setProperty('MAINTENANCE_MODE', 'false');
  Logger.log('Modo mantenimiento desactivado');
}
```

### Problema: Autenticación Fallando Masivamente

#### Síntomas:
- Múltiples usuarios reportan no poder hacer login
- Logs muestran errores de validación de password
- Cache manager reporta errores

#### Diagnóstico:
1. Verificar integridad de hoja "Usuarios"
2. Comprobar que SECRET_KEY no ha cambiado
3. Revisar si hay corrupción en datos de salt/hash

#### Solución de Emergencia:
```javascript
function resetearAutenticacion() {
  // SOLO usar en emergencia - resetea passwords de todos los usuarios
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName('Usuarios');
  const data = sheet.getDataRange().getValues();
  
  // Crear password temporal para todos los usuarios
  const tempPassword = 'ConciliApp2024!';
  
  for (let i = 1; i < data.length; i++) {
    const email = data[i][0];
    const salt = generateSalt();
    const hash = hashPassword(tempPassword, salt);
    
    sheet.getRange(i + 1, 2).setValue(hash); // Password hash
    sheet.getRange(i + 1, 3).setValue(salt); // Salt
  }
  
  Logger.log('Passwords reseteados. Password temporal: ' + tempPassword);
  // IMPORTANTE: Notificar a todos los usuarios del cambio
}
```

### Problema: Datos Corruptos en Sheets

#### Síntomas:
- Errores al guardar registros nuevos
- Datos aparecen malformados
- Consultas retornan resultados inesperados

#### Procedimiento de Recuperación:
1. **Inmediato**: Activar modo mantenimiento
2. **Backup**: Crear copia de seguridad del estado actual
3. **Análisis**: Identificar scope de la corrupción
4. **Restauración**: Usar backup más reciente verificado
5. **Verificación**: Probar funcionalidad crítica

```javascript
function restaurarDesdeBackup(fechaBackup) {
  const backupFolder = DriveApp.getFoldersByName('Backup-Conciliapp-' + fechaBackup).next();
  const files = backupFolder.getFiles();
  
  while (files.hasNext()) {
    const file = files.next();
    if (file.getName().includes('Respuestas')) {
      // Proceso de restauración
      Logger.log('Restaurando: ' + file.getName());
      // Implementar lógica de restauración específica
    }
  }
}
```

## Monitoreo y Alertas

### Métricas Clave a Monitorear

#### Performance
- Tiempo de respuesta promedio: < 3 segundos
- Tasa de éxito de operaciones: > 95%
- Uso de quota diaria: < 80%
- Errores por hora: < 5

#### Seguridad
- Intentos de login fallidos por usuario: < 3/día
- Logins fuera de horario laboral: revisar
- Cambios de configuración: auditar inmediatamente
- Accesos desde nuevas ubicaciones: validar

#### Operacional
- Registros de cobranza por día: monitorear tendencias
- Sincronización eFactory: éxito diario
- Espacio de almacenamiento: < 75% límite
- Backup diario: confirmar éxito

### Configurar Alertas Automáticas

```javascript
function configurarAlertas() {
  // Trigger para verificar métricas cada hora
  ScriptApp.newTrigger('verificarMetricas')
    .timeBased()
    .everyHours(1)
    .create();
}

function verificarMetricas() {
  const alertas = [];
  
  // Verificar quota
  const quotaUsage = obtenerUsoQuota();
  if (quotaUsage > 0.8) {
    alertas.push('Quota usage alto: ' + (quotaUsage * 100) + '%');
  }
  
  // Verificar errores recientes
  const errores = contarErroresUltimaHora();
  if (errores > 5) {
    alertas.push('Errores elevados: ' + errores + ' en última hora');
  }
  
  // Enviar alertas si hay problemas
  if (alertas.length > 0) {
    enviarAlertaAdministrador(alertas.join('\n'));
  }
}
```

## Tareas de Mantenimiento

### Optimización de Performance

#### Limpieza de Caché
```javascript
function limpiezaProfundaCache() {
  const cache = CacheService.getScriptCache();
  const scriptCache = CacheService.getScriptCache();
  
  // Eliminar todas las entradas de caché
  cache.removeAll(['vendedores', 'clientes', 'config']);
  
  // Reconstruir caché crítico
  poblarCacheVendedores();
  poblarCacheClientes();
  
  Logger.log('Limpieza de caché completada');
}
```

#### Optimización de Consultas
```javascript
function optimizarConsultas() {
  // Identificar consultas lentas en logs
  const queries = analizarLogsConsultas();
  
  // Sugerir optimizaciones
  queries.forEach(query => {
    if (query.tiempo > 2000) { // > 2 segundos
      Logger.log('Query lenta detectada: ' + query.operation);
      Logger.log('Tiempo: ' + query.tiempo + 'ms');
      Logger.log('Sugerencia: Implementar caché o paginación');
    }
  });
}
```

### Seguridad

#### Auditoría de Accesos
```javascript
function auditoriaSemanal() {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName('Auditoria');
  const data = sheet.getDataRange().getValues();
  
  const reporteSemanal = {
    logins_únicos: new Set(),
    intentos_fallidos: 0,
    registros_creados: 0,
    registros_eliminados: 0
  };
  
  const haceUnaSemana = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  data.forEach(row => {
    const fecha = new Date(row[0]);
    if (fecha > haceUnaSemana) {
      const usuario = row[1];
      const accion = row[2];
      
      reporteSemanal.logins_únicos.add(usuario);
      
      if (accion === 'LOGIN_FAILED') reporteSemanal.intentos_fallidos++;
      if (accion === 'REGISTRO_CREATED') reporteSemanal.registros_creados++;
      if (accion === 'REGISTRO_DELETED') reporteSemanal.registros_eliminados++;
    }
  });
  
  Logger.log('Reporte semanal:', JSON.stringify(reporteSemanal));
}
```

#### Rotación de Claves
```javascript
// Ejecutar mensualmente
function rotarClaveSecreta() {
  const nuevaClave = generarClaveSegura(32);
  
  // IMPORTANTE: Primero hacer backup de clave actual
  const claveActual = PropertiesService.getScriptProperties().getProperty('SECRET_KEY');
  PropertiesService.getScriptProperties().setProperty('SECRET_KEY_BACKUP', claveActual);
  
  // Establecer nueva clave
  PropertiesService.getScriptProperties().setProperty('SECRET_KEY', nuevaClave);
  
  Logger.log('Clave secreta rotada exitosamente');
  
  // TODO: Implementar re-hash de passwords existentes si es necesario
}
```

## Escalación y Contactos

### Niveles de Escalación

#### Nivel 1 - Operador (0-30 minutos)
- Problemas menores de conectividad
- Consultas de usuarios sobre funcionalidad
- Tareas rutinarias de mantenimiento

#### Nivel 2 - Administrador Técnico (30-120 minutos)
- Errores de aplicación que afectan múltiples usuarios
- Problemas de performance significativos
- Fallas en sincronización de datos

#### Nivel 3 - Desarrollador Principal (2-8 horas)
- Errores críticos del sistema
- Corrupción de datos
- Problemas de seguridad
- Necesidad de rollback o restauración

### Información de Contacto

```
Operador Nivel 1:
- Email: soporte@empresa.com
- Teléfono: +58-XXX-XXXX
- Horario: Lunes-Viernes 8AM-6PM

Administrador Técnico:
- Email: admin-tecnico@empresa.com
- Teléfono: +58-XXX-XXXX (24/7)
- Slack: @admin-conciliapp

Desarrollador Principal:
- Email: dev-principal@empresa.com
- Teléfono: +58-XXX-XXXX (emergencias)
- Slack: @dev-conciliapp
```

### Plantillas de Comunicación

#### Notificación de Mantenimiento
```
Asunto: [CONCILIAPP] Mantenimiento Programado - [FECHA]

Estimados usuarios,

El sistema Conciliapp estará en mantenimiento el [FECHA] de [HORA INICIO] a [HORA FIN].

Durante este tiempo:
- No podrán acceder al sistema
- Los registros en progreso se guardarán automáticamente
- La funcionalidad se restaurará completamente al finalizar

Motivo del mantenimiento: [DESCRIPCIÓN]

Disculpen las molestias.
Equipo Técnico Conciliapp
```

#### Reporte de Incidente
```
Asunto: [INCIDENTE] Conciliapp - [DESCRIPCIÓN BREVE]

Hora de inicio: [TIMESTAMP]
Severidad: [Crítica/Alta/Media/Baja]
Sistemas afectados: [COMPONENTES]
Usuarios impactados: [NÚMERO/PORCENTAJE]

Descripción del problema:
[DETALLES TÉCNICOS]

Acciones tomadas:
1. [ACCIÓN 1]
2. [ACCIÓN 2]

Estado actual: [EN PROGRESO/RESUELTO/INVESTIGANDO]
Próxima actualización: [HORA]
```

## Procedimientos de Contingencia

### Plan de Continuidad del Negocio

En caso de falla total del sistema:

1. **Inmediato (0-15 minutos)**:
   - Activar sistema manual temporal (formularios offline)
   - Notificar a usuarios del modo de contingencia
   - Iniciar diagnóstico técnico

2. **Corto plazo (15-60 minutos)**:
   - Implementar workarounds específicos
   - Priorizar funcionalidades críticas
   - Mantener comunicación regular con usuarios

3. **Medio plazo (1-4 horas)**:
   - Ejecutar plan de recuperación
   - Restaurar desde backups si es necesario
   - Validar integridad de datos

4. **Seguimiento (4+ horas)**:
   - Migrar datos de sistema temporal
   - Realizar análisis post-mortem
   - Implementar mejoras preventivas