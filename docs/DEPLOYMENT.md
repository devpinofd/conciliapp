# Guía de Despliegue - Conciliapp

Esta guía proporciona instrucciones paso a paso para desplegar la aplicación Conciliapp en Google Apps Script.

## Prerrequisitos

### Cuentas y Accesos Necesarios
- Cuenta de Google con acceso a Google Apps Script
- Acceso a Google Sheets para crear/gestionar hojas de cálculo
- Permisos para crear triggers y publicar web apps
- API Key para servicio eFactory (opcional, para sincronización)

### Herramientas Requeridas
- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Editor de texto (para modificar configuraciones si es necesario)
- Acceso a Google Apps Script IDE

## Configuración Inicial

### 1. Crear Proyecto en Google Apps Script

1. Navegar a [script.google.com](https://script.google.com)
2. Hacer clic en "Nuevo proyecto"
3. Renombrar el proyecto a "Conciliapp"
4. Configurar el archivo `appsscript.json`:

```json
{
  "timeZone": "America/Caracas",
  "dependencies": {
    "enabledAdvancedServices": [
      {
        "userSymbol": "Drive",
        "serviceId": "drive",
        "version": "v2"
      }
    ]
  },
  "webapp": {
    "access": "ANYONE_ANONYMOUS",
    "executeAs": "USER_DEPLOYING"
  },
  "executionApi": {
    "access": "ANYONE"
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/drive"
  ]
}
```

### 2. Subir Archivos del Código

Copiar los siguientes archivos al proyecto de Apps Script:

#### Archivo `codigo.js`
- Contiene la lógica principal de la aplicación
- Servicios: AuthManager, DataFetcher, CacheManager, etc.
- Funciones de manejo de formularios y validaciones

#### Archivo `auth.js`
- Lógica de autenticación y autorización
- Funciones de hash y validación de credenciales
- Gestión de tokens de sesión

#### Archivo `maintenance.js`
- Servicios de mantenimiento del sistema
- Funciones de limpieza y optimización
- Triggers programados

#### Archivo `index.html`
- Interfaz principal de la aplicación
- Formulario de registro de cobranzas
- Tabla de gestión de registros

#### Archivo `auth.html`
- Página de login y registro
- Formularios de autenticación
- Validaciones del lado cliente

#### Archivo `dashboard.html` (opcional)
- Panel de administración
- Métricas y reportes
- Gestión de usuarios

### 3. Configurar Google Sheets

#### Crear Hoja de Cálculo Principal
1. Crear nueva hoja en Google Sheets
2. Renombrar a "Conciliapp-Data"
3. Crear las siguientes pestañas:

##### Pestaña "Respuestas"
```
Columnas: Timestamp | Email | Cliente | Vendedor | Facturas | Monto | Metodo_Pago | ID_Registro
```

##### Pestaña "Usuarios"
```
Columnas: Email | Password_Hash | Salt | Fecha_Registro | Ultimo_Login | Intentos_Fallidos | Bloqueado_Hasta
```

##### Pestaña "Auditoria"
```
Columnas: Timestamp | Usuario | Accion | Detalles | IP | User_Agent | Resultado
```

##### Pestaña "obtenerVendedoresPorUsuario"
```
Columnas: Email | Nombre | Codigo_Vendedor | Activo | Ultima_Sincronizacion
```

##### Pestaña "Registros Eliminados"
```
Columnas: Timestamp_Eliminacion | Usuario_Elimino | Datos_Originales | Motivo
```

### 4. Configurar Variables de Entorno

Usar PropertiesService para almacenar configuraciones sensibles:

```javascript
// Ejecutar una sola vez para configurar propiedades
function setupProperties() {
  const properties = PropertiesService.getScriptProperties();
  
  properties.setProperties({
    'SHEET_ID': 'ID_DE_TU_HOJA_DE_CALCULO',
    'SECRET_KEY': 'clave_secreta_para_hashing_minimo_32_caracteres',
    'EFACTORY_API_URL': 'https://api.efactory.com/vendedores',
    'EFACTORY_API_KEY': 'tu_api_key_de_efactory',
    'MAINTENANCE_MODE': 'false',
    'SESSION_TIMEOUT_HOURS': '6',
    'MAX_LOGIN_ATTEMPTS': '5',
    'LOCKOUT_DURATION_MINUTES': '15'
  });
}
```

## Proceso de Despliegue

### 1. Despliegue en Ambiente de Desarrollo

#### Configurar Web App
1. En el IDE de Apps Script, ir a "Implementar" > "Nueva implementación"
2. Seleccionar tipo: "Aplicación web"
3. Configurar:
   - **Descripción**: "Conciliapp - Desarrollo"
   - **Ejecutar como**: "Yo (tu_email@gmail.com)"
   - **¿Quién tiene acceso?**: "Cualquier persona, incluso anónima"
4. Hacer clic en "Implementar"
5. Copiar la URL de la web app para pruebas

#### Configurar Triggers
```javascript
// Ejecutar para crear triggers necesarios
function setupTriggers() {
  // Trigger para sincronización de vendedores cada 4 horas
  ScriptApp.newTrigger('sincronizarVendedoresDesdeApi')
    .timeBased()
    .everyHours(4)
    .create();
  
  // Trigger para limpieza de caché diaria
  ScriptApp.newTrigger('limpiarCacheExpirado')
    .timeBased()
    .everyDays(1)
    .atHour(2) // 2 AM
    .create();
  
  // Trigger para backup semanal
  ScriptApp.newTrigger('backupDatos')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(1)
    .create();
}
```

### 2. Pruebas en Desarrollo

#### Lista de Verificación Pre-Producción
- [ ] Probar flujo completo de login/registro
- [ ] Verificar registro de cobranzas funciona
- [ ] Confirmar que auditoría se registra correctamente
- [ ] Probar sincronización de vendedores
- [ ] Validar generación de reportes
- [ ] Verificar modo mantenimiento
- [ ] Probar en diferentes navegadores
- [ ] Validar comportamiento en móviles

#### Comandos de Diagnóstico
```javascript
// Función para verificar configuración
function diagnosticarSistema() {
  const properties = PropertiesService.getScriptProperties();
  const config = properties.getProperties();
  
  Logger.log('Configuración actual:');
  Logger.log(config);
  
  // Verificar conectividad con Sheets
  const sheetId = config.SHEET_ID;
  try {
    const sheet = SpreadsheetApp.openById(sheetId);
    Logger.log('Conexión con Sheet: OK');
    Logger.log('Pestañas disponibles: ' + sheet.getSheets().map(s => s.getName()));
  } catch (e) {
    Logger.log('Error conectando con Sheet: ' + e.toString());
  }
  
  // Verificar API externa
  try {
    const response = UrlFetchApp.fetch(config.EFACTORY_API_URL + '?test=1');
    Logger.log('API eFactory: OK (' + response.getResponseCode() + ')');
  } catch (e) {
    Logger.log('Error API eFactory: ' + e.toString());
  }
}
```

### 3. Despliegue en Producción

#### Crear Nueva Implementación
1. Una vez probado en desarrollo, crear nueva implementación
2. Configurar:
   - **Descripción**: "Conciliapp - Producción v1.0"
   - **Ejecutar como**: "Yo"
   - **¿Quién tiene acceso?**: "Cualquier persona, incluso anónima"
3. Actualizar configuración de producción si es necesario

#### Configurar Monitoreo
```javascript
// Función para monitoreo básico
function configurarMonitoreo() {
  // Crear trigger para reportes de salud diarios
  ScriptApp.newTrigger('reporteSaludSistema')
    .timeBased()
    .everyDays(1)
    .atHour(8) // 8 AM
    .create();
}

function reporteSaludSistema() {
  const stats = {
    usuarios_activos: contarUsuariosActivos(),
    registros_hoy: contarRegistrosHoy(),
    errores_recientes: contarErroresRecientes(),
    quota_utilizada: obtenerQuotaUtilizada()
  };
  
  Logger.log('Reporte de salud: ' + JSON.stringify(stats));
  
  // Opcional: enviar email con stats
  if (stats.errores_recientes > 10) {
    enviarAlertaAdministrador('Errores elevados detectados', stats);
  }
}
```

## Configuración de Ambientes

### Desarrollo
```javascript
const CONFIG_DEV = {
  SHEET_ID: 'sheet_id_desarrollo',
  DEBUG_MODE: true,
  LOG_LEVEL: 'DEBUG',
  CACHE_TTL: 300, // 5 minutos para pruebas rápidas
  API_TIMEOUT: 10000
};
```

### Staging
```javascript
const CONFIG_STAGING = {
  SHEET_ID: 'sheet_id_staging',
  DEBUG_MODE: false,
  LOG_LEVEL: 'INFO',
  CACHE_TTL: 1800, // 30 minutos
  API_TIMEOUT: 30000
};
```

### Producción
```javascript
const CONFIG_PROD = {
  SHEET_ID: 'sheet_id_produccion',
  DEBUG_MODE: false,
  LOG_LEVEL: 'ERROR',
  CACHE_TTL: 3600, // 1 hora
  API_TIMEOUT: 30000
};
```

## Rollback y Recuperación

### Procedimiento de Rollback
1. Identificar la implementación anterior estable
2. En Apps Script, ir a "Implementar" > "Gestionar implementaciones"
3. Localizar versión anterior
4. Hacer clic en "Editar" > cambiar a versión estable
5. Actualizar triggers si es necesario
6. Verificar funcionalidad crítica

### Backup de Datos
```javascript
// Función para crear backup manual
function crearBackupCompleto() {
  const timestamp = Utilities.formatDate(new Date(), 'GMT-4', 'yyyy-MM-dd-HH-mm');
  const backupFolder = DriveApp.createFolder('Backup-Conciliapp-' + timestamp);
  
  const sheets = ['Respuestas', 'Usuarios', 'Auditoria', 'obtenerVendedoresPorUsuario'];
  const mainSheet = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));
  
  sheets.forEach(sheetName => {
    const sheet = mainSheet.getSheetByName(sheetName);
    if (sheet) {
      const newSpreadsheet = SpreadsheetApp.create('Backup-' + sheetName + '-' + timestamp);
      sheet.copyTo(newSpreadsheet);
      DriveApp.getFileById(newSpreadsheet.getId()).moveTo(backupFolder);
    }
  });
  
  Logger.log('Backup creado en: ' + backupFolder.getUrl());
}
```

## Monitoreo y Mantenimiento

### Métricas Clave
- Número de logins diarios
- Registros de cobranza creados
- Errores de API externa
- Tiempo de respuesta promedio
- Uso de quota de Google Apps Script

### Logs y Auditoría
- Todos los eventos se registran en la hoja "Auditoria"
- Logs técnicos disponibles en Apps Script > Ejecuciones
- Configurar alertas para errores críticos

### Actualizaciones
1. Desarrollar cambios en ambiente de desarrollo
2. Probar exhaustivamente
3. Crear nueva implementación con número de versión
4. Monitorear por 24-48 horas
5. Confirmar estabilidad antes de siguiente release

## Checklist de Despliegue

### Pre-Despliegue
- [ ] Código revisado y aprobado
- [ ] Pruebas unitarias e integración pasando
- [ ] Configuración de propiedades actualizada
- [ ] Backup de datos actual realizado
- [ ] Documentación actualizada

### Durante Despliegue
- [ ] Nueva implementación creada
- [ ] Triggers configurados correctamente
- [ ] URL de producción actualizada donde sea necesario
- [ ] Verificación de funcionalidad crítica

### Post-Despliegue
- [ ] Monitoreo de logs por 2 horas
- [ ] Pruebas de smoke en producción
- [ ] Verificación de métricas de performance
- [ ] Comunicación a usuarios del nuevo despliegue
- [ ] Documentar cualquier issue encontrado