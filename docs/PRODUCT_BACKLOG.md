# Product Backlog (Priorizado) - Conciliapp

Este backlog ha sido generado a partir del análisis del código existente, los requisitos técnicos documentados y las necesidades del negocio. Las entradas están ordenadas por prioridad y valor de negocio (Alto → Medio → Bajo).

## Épicas Principales

### Épica 1: Seguridad y Autenticación 🛡️
Asegurar que el sistema sea robusto y seguro para manejar datos financieros sensibles.

### Épica 2: Experiencia de Usuario 👥
Optimizar la interfaz y flujos para maximizar la productividad de los vendedores.

### Épica 3: Integridad de Datos 📊
Garantizar la calidad, consistencia y trazabilidad de toda la información.

### Épica 4: Escalabilidad Técnica 🚀
Preparar el sistema para crecimiento futuro y mejores capacidades.

---

## Backlog Items (Priorizados)

### ALTA PRIORIDAD (Must Have)

#### US-001: Autenticación Robusta con Rate Limiting
- **Épica**: Seguridad y Autenticación
- **Descripción**: Implementar sistema de autenticación seguro con HMAC-SHA256, salting por usuario y rate limiting para prevenir ataques de fuerza bruta
- **Valor de Negocio**: Protección de datos financieros críticos y cumplimiento de seguridad
- **Estimación**: 8 story points
- **Criterios de Aceptación**:
  - Login con email/password validado contra vendedores autorizados
  - Hash HMAC-SHA256 con salt único por usuario
  - Bloqueo temporal después de 5 intentos fallidos (15 minutos)
  - Auditoría completa de intentos de acceso
  - Tokens de sesión con expiración de 6 horas
- **Dependencias**: Ninguna
- **Riesgos**: Complejidad de implementación en Google Apps Script

#### US-002: Protección en Modo Mantenimiento
- **Épica**: Seguridad y Autenticación
- **Descripción**: Sistema para activar modo mantenimiento que bloquee operaciones de escritura manteniendo acceso de lectura
- **Valor de Negocio**: Permitir mantenimiento sin interrumpir completamente las operaciones
- **Estimación**: 3 story points
- **Criterios de Aceptación**:
  - Banner visual indicando modo mantenimiento
  - Bloqueo de operaciones de escritura para usuarios normales
  - Administradores pueden continuar operando
  - Configuración activable mediante PropertiesService
  - Logging de actividades durante mantenimiento
- **Dependencias**: US-001 (roles de usuario)
- **Riesgos**: Bajo

#### US-003: Registro de Cobranza con Validaciones Robustas
- **Épica**: Experiencia de Usuario
- **Descripción**: Formulario principal para registro de cobranzas con validaciones exhaustivas del lado cliente y servidor
- **Valor de Negocio**: Funcionalidad core del sistema, directamente impacta productividad
- **Estimación**: 5 story points
- **Criterios de Aceptación**:
  - Formulario dinámico con dropdowns poblados automáticamente
  - Validación de facturas en formato CSV (sin duplicados)
  - Validación de montos numéricos positivos
  - Verificación de ownership (vendedor = usuario autenticado)
  - Confirmación visual de registro exitoso
  - Manejo de errores informativo
- **Dependencias**: US-001 (autenticación)
- **Riesgos**: Complejidad de validaciones cross-field

#### US-004: Auditoría Completa de Eventos
- **Épica**: Integridad de Datos
- **Descripción**: Sistema de logging que registre todos los eventos críticos del sistema para auditoría y compliance
- **Valor de Negocio**: Trazabilidad requerida para datos financieros y debugging
- **Estimación**: 3 story points
- **Criterios de Aceptación**:
  - Registro de logins, registros de cobranza, eliminaciones
  - Timestamps precisos en zona horaria correcta
  - Información de usuario, IP y user agent cuando sea posible
  - Logs inmutables en hoja separada
  - Búsqueda y filtrado básico de eventos
- **Dependencias**: Todas las US que generen eventos
- **Riesgos**: Volume de logs puede impactar performance

### PRIORIDAD MEDIA (Should Have)

#### US-005: Sincronización Automática de Vendedores
- **Épica**: Integridad de Datos
- **Descripción**: Trigger time-driven para sincronizar automáticamente la lista de vendedores con API de eFactory
- **Valor de Negocio**: Eliminar mantenimiento manual y asegurar datos actualizados
- **Estimación**: 5 story points
- **Criterios de Aceptación**:
  - Trigger ejecutándose cada 4 horas
  - Manejo robusto de errores de API (timeout, 404, etc.)
  - Preservación de datos existentes si API falla
  - Logging de sincronizaciones exitosas y fallidas
  - Validación de datos recibidos antes de actualizar
- **Dependencias**: Acceso a API eFactory
- **Riesgos**: Dependencia de servicio externo, posibles cambios en API

#### US-006: Gestión de Registros Existentes
- **Épica**: Experiencia de Usuario
- **Descripción**: Interfaz para ver, filtrar y gestionar registros de cobranza existentes con capacidad de eliminación auditada
- **Valor de Negocio**: Permite corrección de errores y mejor gestión operativa
- **Estimación**: 8 story points
- **Criterios de Aceptación**:
  - Tabla mostrando últimos 50 registros del usuario autenticado
  - Filtros por fecha, cliente, estado
  - Eliminación con confirmación modal
  - Solo permitir eliminar registros propios (ownership validation)
  - Registros eliminados movidos a hoja 'Registros Eliminados'
  - Actualización en tiempo real de la tabla
- **Dependencias**: US-001 (autenticación), US-004 (auditoría)
- **Riesgos**: Complejidad de UI, performance con grandes volúmenes

#### US-007: Generación de Reportes PDF
- **Épica**: Experiencia de Usuario
- **Descripción**: Funcionalidad para generar y descargar reportes en PDF de registros por período
- **Valor de Negocio**: Facilita auditorías y análisis de gestión
- **Estimación**: 5 story points
- **Criterios de Aceptación**:
  - Formulario para seleccionar rango de fechas
  - Filtros opcionales por vendedor, cliente
  - Generación de PDF con datos tabulados y totales
  - Descarga automática del archivo
  - Formato profesional y legible
- **Dependencias**: US-003 (datos de cobranza)
- **Riesgos**: Límites de Google Apps Script para generación de PDFs

#### US-008: Dashboard Administrativo
- **Épica**: Experiencia de Usuario
- **Descripción**: Panel de control para administradores con métricas básicas y gestión de usuarios
- **Valor de Negocio**: Visibilidad operativa y control administrativo
- **Estimación**: 8 story points
- **Criterios de Aceptación**:
  - Métricas básicas: registros por día, usuarios activos, errores
  - Lista de usuarios con último login y estado
  - Capacidad de resetear passwords de usuario
  - Vista de eventos de auditoría recientes
  - Acceso restringido a administradores
- **Dependencias**: US-001 (roles), US-004 (auditoría)
- **Riesgos**: Complejidad de agregación de datos

### PRIORIDAD BAJA (Could Have)

#### US-009: Optimización de Performance y Caché
- **Épica**: Escalabilidad Técnica
- **Descripción**: Implementar sistema de caché inteligente y optimizaciones para mejorar tiempo de respuesta
- **Valor de Negocio**: Mejor experiencia de usuario y uso eficiente de quotas
- **Estimación**: 5 story points
- **Criterios de Aceptación**:
  - Caché de datos de vendedores y clientes
  - Invalidación automática cuando datos cambian
  - Optimización de consultas a Google Sheets
  - Tiempos de respuesta < 3 segundos para operaciones comunes
  - Monitoreo de quotas de Google Apps Script
- **Dependencias**: US-005 (sincronización), US-003 (operaciones principales)
- **Riesgos**: Complejidad de invalidación de caché

#### US-010: Notificaciones y Alertas
- **Épica**: Experiencia de Usuario
- **Descripción**: Sistema de notificaciones para eventos importantes del sistema
- **Valor de Negocio**: Mejor comunicación y response time a problemas
- **Estimación**: 3 story points
- **Criterios de Aceptación**:
  - Notificaciones email para errores críticos
  - Alertas cuando quota se acerca al límite
  - Notificación diaria de resumen de actividad
  - Configuración por usuario de preferencias de notificación
- **Dependencias**: US-004 (eventos para notificar)
- **Riesgos**: Límites de email en Google Apps Script

#### US-011: Backup y Recuperación Automática
- **Épica**: Integridad de Datos
- **Descripción**: Sistema automatizado de backup y herramientas de recuperación
- **Valor de Negocio**: Protección contra pérdida de datos y recuperación rápida
- **Estimación**: 8 story points
- **Criterios de Aceptación**:
  - Backup automático diario de todas las hojas
  - Almacenamiento en Google Drive con retención de 30 días
  - Herramientas para restauración selectiva
  - Verificación de integridad de backups
  - Proceso documentado de recuperación
- **Dependencias**: Ninguna
- **Riesgos**: Espacio de almacenamiento, complejidad de restauración

#### US-012: Migración a Firestore (Preparación)
- **Épica**: Escalabilidad Técnica
- **Descripción**: Preparar arquitectura y herramientas para migración futura a Firestore
- **Valor de Negocio**: Escalabilidad a largo plazo y mejor performance
- **Estimación**: 13 story points
- **Criterios de Aceptación**:
  - Análisis de esquema de datos para Firestore
  - Scripts de migración de datos históricos
  - Adaptadores para dual-write (Sheets + Firestore)
  - Documentación de plan de migración
  - Proof of concept con subset de datos
- **Dependencias**: Todas las funcionalidades core estables
- **Riesgos**: Alto - nueva tecnología, migración de datos compleja

### PRIORIDAD TÉCNICA (Technical Debt)

#### TECH-001: Refactoring de Arquitectura
- **Descripción**: Reorganizar código en módulos más cohesivos y reducir duplicación
- **Estimación**: 5 story points
- **Beneficio**: Mantenibilidad, facilita testing y nuevas features

#### TECH-002: Testing Automatizado
- **Descripción**: Implementar suite de tests automatizados adaptada a Google Apps Script
- **Estimación**: 8 story points
- **Beneficio**: Calidad de código, confianza en deployments

#### TECH-003: Documentación Técnica Completa
- **Descripción**: API docs, code comments, architecture decision records
- **Estimación**: 3 story points
- **Beneficio**: Onboarding de desarrolladores, mantenimiento

---

## Gestión del Backlog

### Criterios de Priorización
1. **Valor de Negocio**: Impacto directo en productividad y revenue
2. **Riesgo**: Mitigación de riesgos técnicos y de seguridad
3. **Dependencias**: Items que desbloquean otros trabajos
4. **Esfuerzo**: Ratio valor/esfuerzo favorable
5. **Urgencia**: Necesidades del negocio con timeline específico

### Process de Refinement
- **Backlog Grooming**: Sesión semanal de 1 hora
- **Story Estimation**: Planning poker con todo el equipo
- **Acceptance Criteria Review**: Validación con Product Owner
- **Technical Spike**: Para stories con alta incertidumbre

### Métricas de Seguimiento
- **Velocity**: Story points completados por sprint
- **Burndown**: Progress hacia release goals
- **Cycle Time**: Tiempo promedio desde inicio hasta done
- **Quality**: Defects escapados a producción

## Notas para el Product Owner

### Release Planning
- **Release 1.0** (MVP): US-001 a US-004 (funcionalidades core seguras)
- **Release 1.1** (Operational): US-005 a US-007 (eficiencia operativa)
- **Release 2.0** (Advanced): US-008 a US-012 (features avanzadas y escalabilidad)

### Stakeholder Management
- **Vendedores**: Enfoque en UX y eficiencia (US-003, US-006, US-007)
- **Administradores**: Control y visibilidad (US-002, US-004, US-008)
- **IT/Seguridad**: Robustez y compliance (US-001, US-004, US-011)
- **Management**: ROI y métricas de negocio (US-008, reportes)

### Success Metrics
- **Adoption**: >90% de vendedores usando el sistema regularmente
- **Efficiency**: 50% reducción en tiempo de proceso de cobranza
- **Quality**: <2% de registros con errores de validación
- **Availability**: >99% uptime del sistema