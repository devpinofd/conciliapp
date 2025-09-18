# Historias de Usuario - Conciliapp

Este documento contiene las historias de usuario detalladas con criterios de aceptación para el sistema de registro de cobranzas Conciliapp.

## Historia 1: Autenticación de Usuario

**Como** vendedor/administrador  
**Quiero** autenticarme de forma segura en el sistema  
**Para** acceder a las funcionalidades de registro de cobranzas

### Criterios de Aceptación:
- El usuario debe proporcionar email y contraseña válidos
- El email debe existir en la hoja 'obtenerVendedoresPorUsuario'
- La contraseña debe ser validada usando HMAC-SHA256 con salt único por usuario
- Tras 5 intentos fallidos, la cuenta debe bloquearse temporalmente (15 minutos)
- Todos los intentos de login deben registrarse en la hoja 'Auditoria'
- El token de sesión debe durar 6 horas y almacenarse en CacheService
- La página debe redirigir a index.html tras login exitoso

### Definición de Terminado:
- [ ] Formulario de login funcional en Auth.html
- [ ] Validación backend implementada en auth.js
- [ ] Registro de auditoría funcionando
- [ ] Rate limiting implementado
- [ ] Redirección post-login funcionando
- [ ] Pruebas manuales exitosas

---

## Historia 2: Registro de Usuario

**Como** nuevo usuario autorizado  
**Quiero** registrarme en el sistema  
**Para** obtener acceso a las funcionalidades de cobranza

### Criterios de Aceptación:
- El email debe existir en 'obtenerVendedoresPorUsuario'
- La contraseña debe cumplir criterios mínimos de seguridad
- Se debe generar un salt único para el usuario
- La información debe almacenarse en la hoja 'Usuarios'
- Debe enviarse confirmación de registro exitoso
- Prevenir registros duplicados por email

### Definición de Terminado:
- [ ] Formulario de registro funcional
- [ ] Validación de email contra vendedores autorizados
- [ ] Generación y almacenamiento seguro de credenciales
- [ ] Prevención de duplicados
- [ ] Mensajes de confirmación/error apropiados

---

## Historia 3: Registro de Cobranza

**Como** vendedor autenticado  
**Quiero** registrar información de cobranza  
**Para** mantener un seguimiento de las facturas cobradas

### Criterios de Aceptación:
- Formulario debe incluir: cliente, vendedor, facturas (CSV), monto total, método de pago
- Validación de campos obligatorios
- El vendedor debe corresponder al usuario autenticado
- Las facturas deben seguir formato CSV válido (sin duplicados)
- El monto debe ser numérico positivo
- Los datos deben guardarse en la hoja 'Respuestas'
- Debe generarse timestamp de creación
- Confirmación visual del registro exitoso

### Definición de Terminado:
- [ ] Formulario dinámico con selects poblados
- [ ] Validaciones cliente y servidor implementadas
- [ ] Almacenamiento en Google Sheets funcionando
- [ ] Mensajes de confirmación/error
- [ ] Pruebas con diferentes tipos de datos

---

## Historia 4: Sincronización de Vendedores

**Como** administrador del sistema  
**Quiero** que la lista de vendedores se sincronice automáticamente  
**Para** mantener actualizada la información sin intervención manual

### Criterios de Aceptación:
- Trigger time-driven ejecutándose cada 4 horas
- Conexión con API de eFactory funcionando
- Actualización de hoja 'obtenerVendedoresPorUsuario'
- Logging de sincronizaciones exitosas y fallidas
- Manejo de errores de API (timeout, 404, etc.)
- Preservación de datos existentes si API falla

### Definición de Terminado:
- [ ] Trigger configurado y funcionando
- [ ] Integración con API externa
- [ ] Manejo robusto de errores
- [ ] Logging de eventos de sincronización
- [ ] Validación de datos recibidos

---

## Historia 5: Gestión de Registros

**Como** usuario autenticado  
**Quiero** ver y gestionar mis registros recientes  
**Para** corregir errores o eliminar entradas incorrectas

### Criterios de Aceptación:
- Tabla mostrando últimos 50 registros del usuario
- Filtros por fecha, cliente, estado
- Botón de eliminar con confirmación modal
- Solo permitir eliminar registros propios (ownership)
- Registros eliminados deben moverse a 'Registros Eliminados' con auditoría
- Actualización en tiempo real de la tabla

### Definición de Terminado:
- [ ] Tabla dinámica con paginación
- [ ] Filtros funcionando correctamente
- [ ] Modal de confirmación implementado
- [ ] Validación de ownership
- [ ] Auditoría de eliminaciones
- [ ] Actualizaciones en tiempo real

---

## Historia 6: Generación de Reportes

**Como** supervisor/administrador  
**Quiero** generar reportes en PDF de registros por período  
**Para** realizar análisis y auditorías

### Criterios de Aceptación:
- Formulario para seleccionar rango de fechas
- Filtros opcionales por vendedor, cliente
- Generación de PDF con datos tabulados
- Descarga automática del archivo
- Inclusión de totales y estadísticas básicas
- Formato profesional y legible

### Definición de Terminado:
- [ ] Interfaz de selección de criterios
- [ ] Generación de PDF funcionando
- [ ] Descarga automática implementada
- [ ] Formato de reporte aprobado
- [ ] Validación de rangos de fecha

---

## Historia 7: Modo Mantenimiento

**Como** administrador técnico  
**Quiero** activar un modo de mantenimiento  
**Para** realizar operaciones de sistema sin interferencia de usuarios

### Criterios de Aceptación:
- Banner visual indicando modo mantenimiento
- Bloqueo de operaciones de escritura para usuarios normales
- Permitir acceso de solo lectura
- Administradores pueden continuar operando normalmente
- Activación/desactivación mediante configuration
- Logs de actividades durante mantenimiento

### Definición de Terminado:
- [ ] Banner de mantenimiento implementado
- [ ] Controles de acceso por rol funcionando
- [ ] Configuration manager operativo
- [ ] Logging durante mantenimiento
- [ ] Pruebas de diferentes escenarios

---

## Historia 8: Caché y Optimización

**Como** usuario del sistema  
**Quiero** que la aplicación responda rápidamente  
**Para** tener una experiencia de usuario fluida

### Criterios de Aceptación:
- Caché de datos de vendedores y clientes
- Invalidación automática de caché cuando sea necesario
- Tiempos de respuesta < 3 segundos para operaciones comunes
- Manejo de quotas de Google Apps Script
- Optimización de consultas a hojas de cálculo

### Definición de Terminado:
- [ ] Sistema de caché implementado
- [ ] Estrategias de invalidación funcionando
- [ ] Métricas de performance dentro de objetivos
- [ ] Optimizaciones de consultas aplicadas
- [ ] Monitoreo de quotas implementado

---

## Notas para el Equipo de Desarrollo

### Priorizacion:
1. **Alta**: Historias 1-3 (autenticación y registro básico)
2. **Media**: Historias 4-6 (funcionalidades operativas)
3. **Baja**: Historias 7-8 (optimizaciones)

### Consideraciones Técnicas:
- Todas las validaciones deben implementarse tanto en cliente como servidor
- Usar PropertiesService para configuraciones sensibles
- Implementar logging consistente en todas las operaciones
- Mantener compatibilidad con Google Apps Script
- Preparar para futura migración a Firestore

### Criterios de Aceptación Globales:
- Código debe pasar linting
- Funcionalidades deben ser probadas manualmente
- Documentación debe actualizarse para cada nueva feature
- Compatibilidad con navegadores modernos
- Responsive design para dispositivos móviles