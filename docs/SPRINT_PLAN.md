# Plan de Sprint - Conciliapp Sprint 1

## Información General del Sprint

- **Sprint #**: 1
- **Duración**: 2 semanas (10 días hábiles)
- **Fecha Inicio**: 2024-01-15
- **Fecha Fin**: 2024-01-26
- **Sprint Goal**: Establecer las bases de seguridad y autenticación robusta del sistema Conciliapp

## Composición del Equipo

| Rol | Nombre | Capacity (horas) | Disponibilidad |
|-----|--------|------------------|----------------|
| Product Owner | María González | 20 | 100% |
| Scrum Master | Carlos Rodríguez | 40 | 100% |
| Senior Developer | Ana López | 80 | 100% |
| Developer | Roberto Martín | 80 | 100% |
| QA Engineer | Laura Fernández | 70 | 87.5% (vacaciones viernes) |

**Total Capacity**: 270 horas (34 story points estimados)

## Sprint Goal

> "Implementar un sistema de autenticación seguro y robusto que permita a vendedores autorizados acceder al sistema de manera segura, con auditoría completa y protección contra ataques de fuerza bruta, estableciendo las bases de seguridad para todas las funcionalidades futuras."

### Objetivos Medibles del Sprint Goal
- 100% de logins validados contra lista de vendedores autorizados
- Sistema de rate limiting bloqueando cuentas después de 5 intentos fallidos
- Auditoría registrando el 100% de los intentos de acceso
- Tiempo de respuesta de login < 2 segundos en 95% de los casos
- Cero vulnerabilidades de seguridad identificadas en review

## Sprint Backlog

### User Stories Comprometidas

#### US-001: Autenticación Robusta con Rate Limiting 
**Prioridad**: Crítica | **Estimación**: 8 SP | **Asignado**: Ana López + Roberto Martín

**Tareas de Desarrollo:**
- [ ] **T-001.1**: Implementar función hashPassword con HMAC-SHA256 (4h) - *Ana*
- [ ] **T-001.2**: Crear función generateSalt para usuarios únicos (2h) - *Roberto*
- [ ] **T-001.3**: Desarrollar validateUser con verificación hash+salt (6h) - *Ana*
- [ ] **T-001.4**: Implementar rate limiting con CacheService (4h) - *Roberto*
- [ ] **T-001.5**: Crear sistema de bloqueo temporal de cuentas (3h) - *Ana*
- [ ] **T-001.6**: Integrar validación contra hoja vendedores (3h) - *Roberto*

**Tareas de Testing:**
- [ ] **T-001.7**: Tests unitarios para funciones de hash (3h) - *Laura*
- [ ] **T-001.8**: Tests de rate limiting y bloqueo (4h) - *Laura*
- [ ] **T-001.9**: Tests de integración end-to-end de login (4h) - *Laura*

**Criterios de Aceptación Específicos:**
- [x] ✅ Función hashPassword genera hash consistente con mismo salt
- [ ] 🔄 Rate limiting bloquea después de exactamente 5 intentos
- [ ] 🔄 Bloqueo temporal dura exactamente 15 minutos
- [ ] 🔄 Solo usuarios en hoja vendedores pueden autenticarse
- [ ] 🔄 Tokens de sesión expiran después de 6 horas

#### US-004: Auditoría Completa de Eventos
**Prioridad**: Alta | **Estimación**: 3 SP | **Asignado**: Roberto Martín

**Tareas de Desarrollo:**
- [ ] **T-004.1**: Crear estructura de hoja 'Auditoria' (1h) - *Roberto*
- [ ] **T-004.2**: Implementar función logEvent genérica (3h) - *Roberto*
- [ ] **T-004.3**: Integrar logging en AuthManager (2h) - *Roberto*
- [ ] **T-004.4**: Añadir logging de eventos críticos (2h) - *Roberto*

**Tareas de Testing:**
- [ ] **T-004.5**: Verificar integridad de logs generados (2h) - *Laura*
- [ ] **T-004.6**: Validar timestamps y formatos (1h) - *Laura*

**Criterios de Aceptación Específicos:**
- [ ] 🔄 Todos los logins exitosos y fallidos se registran
- [ ] 🔄 Logs incluyen timestamp, usuario, acción, IP si disponible
- [ ] 🔄 Logs son inmutables una vez escritos
- [ ] 🔄 Formato de logs es consistente y parseable

#### US-002: Protección en Modo Mantenimiento
**Prioridad**: Media | **Estimación**: 3 SP | **Asignado**: Ana López

**Tareas de Desarrollo:**
- [ ] **T-002.1**: Implementar MaintenanceService con PropertiesService (3h) - *Ana*
- [ ] **T-002.2**: Crear banner de mantenimiento en UI (2h) - *Ana*
- [ ] **T-002.3**: Implementar bloqueo de operaciones de escritura (3h) - *Ana*
- [ ] **T-002.4**: Permitir bypass para administradores (2h) - *Ana*

**Tareas de Testing:**
- [ ] **T-002.5**: Verificar activación/desactivación de modo (2h) - *Laura*
- [ ] **T-002.6**: Probar bloqueo efectivo de operaciones (2h) - *Laura*

### Tareas Técnicas Adicionales

#### Preparación de Infraestructura
- [ ] **T-INFRA.1**: Configurar Google Sheets con estructura inicial (2h) - *Carlos*
- [ ] **T-INFRA.2**: Configurar PropertiesService con valores iniciales (1h) - *Carlos*
- [ ] **T-INFRA.3**: Configurar ambiente de testing separado (2h) - *Carlos*

#### Documentación
- [ ] **T-DOC.1**: Documentar APIs de AuthManager (2h) - *Ana*
- [ ] **T-DOC.2**: Crear guía de setup inicial (2h) - *Roberto*
- [ ] **T-DOC.3**: Documentar procedimientos de testing (2h) - *Laura*

## Distribución de Trabajo por Día

### Semana 1

#### Día 1 (Lunes 15/01)
- **Todos**: Sprint Planning (4h)
- **Carlos**: Setup de infraestructura inicial
- **Ana**: Inicio T-001.1 (hashPassword)
- **Roberto**: Inicio T-001.2 (generateSalt)

#### Día 2 (Martes 16/01)
- **Ana**: Completar T-001.1, iniciar T-001.3
- **Roberto**: Completar T-001.2, iniciar T-004.1
- **Laura**: Setup ambiente testing, planificar tests

#### Día 3 (Miércoles 17/01)
- **Ana**: Continuar T-001.3 (validateUser)
- **Roberto**: T-004.2 (logEvent function)
- **Laura**: Comenzar T-001.7 (tests unitarios)

#### Día 4 (Jueves 18/01)
- **Ana**: Completar T-001.3, iniciar T-001.5
- **Roberto**: T-001.4 (rate limiting)
- **Laura**: T-001.8 (tests rate limiting)

#### Día 5 (Viernes 19/01)
- **Ana**: T-002.1 (MaintenanceService)
- **Roberto**: T-001.6 (validación vendedores)
- **Laura**: Día libre (vacaciones)

### Semana 2

#### Día 6 (Lunes 22/01)
- **Todos**: Sprint Review primera semana (1h)
- **Ana**: T-002.2 (banner UI)
- **Roberto**: T-004.3 (integrar logging)
- **Laura**: T-001.9 (tests integración)

#### Día 7 (Martes 23/01)
- **Ana**: T-002.3 (bloqueo operaciones)
- **Roberto**: T-004.4 (logging eventos críticos)
- **Laura**: T-004.5 (verificar logs)

#### Día 8 (Miércoles 24/01)
- **Ana**: T-002.4 (bypass administradores)
- **Roberto**: Documentación T-DOC.2
- **Laura**: T-002.5 y T-002.6 (tests mantenimiento)

#### Día 9 (Jueves 25/01)
- **Todos**: Testing integrado y bug fixes
- **Ana**: T-DOC.1 (documentar APIs)
- **Laura**: T-DOC.3 (procedimientos testing)

#### Día 10 (Viernes 26/01)
- **Todos**: Sprint Review y Demo (2h)
- **Todos**: Sprint Retrospective (1.5h)
- **Preparación**: Setup Sprint 2

## Definición de Done para este Sprint

### Criterios Técnicos
- [ ] Código implementado según especificaciones
- [ ] All unit tests passing (simulación manual documentada)
- [ ] Integration tests completados sin errores críticos
- [ ] Code review completado por peer senior
- [ ] No security vulnerabilities identificadas
- [ ] Performance dentro de objetivos (<2s para login)

### Criterios de Proceso
- [ ] Documentación técnica actualizada
- [ ] Demo exitosa con Product Owner
- [ ] Deploy realizado en ambiente de testing
- [ ] Acceptance criteria validados por PO
- [ ] Logs de auditoría funcionando correctamente

### Criterios de Negocio
- [ ] Vendedores pueden loguearse con credenciales válidas
- [ ] Intentos de fuerza bruta son bloqueados efectivamente
- [ ] Sistema mantiene integridad ante intentos maliciosos
- [ ] Modo mantenimiento protege operaciones durante updates

## Gestión de Riesgos del Sprint

### Riesgos Identificados

| Riesgo | Probabilidad | Impacto | Mitigación | Owner |
|--------|---------------|---------|------------|-------|
| Complejidad de HMAC en Apps Script | Media | Alto | Spike técnico día 1, fallback a SHA256 | Ana |
| Performance de rate limiting | Media | Medio | Tests de carga, optimización caché | Roberto |
| Disponibilidad de Laura | Alta | Bajo | Cross-training, documentación detallada | Equipo |
| Integración con Google Sheets | Baja | Alto | Tests tempranos, environment backup | Carlos |

### Plan de Contingencia
- **Si HMAC es muy complejo**: Fallback a SHA256 + salt robusto
- **Si performance es insuficiente**: Simplificar rate limiting inicial
- **Si testing se atrasa**: Priorizar happy path, defer edge cases

## Métricas de Éxito del Sprint

### Métricas de Desarrollo
- **Velocity Target**: 14 story points completados
- **Defect Rate**: <1 defecto por story point
- **Code Review Coverage**: 100% del código nuevo
- **Test Coverage**: >80% de funciones críticas

### Métricas de Calidad
- **Security Review**: 0 vulnerabilidades críticas o altas
- **Performance**: Login response time <2 segundos promedio
- **Availability**: Testing environment uptime >95%

### Métricas de Proceso
- **Daily Standup Attendance**: >90%
- **Sprint Goal Achievement**: 100% (binary: achieved or not)
- **Stakeholder Satisfaction**: Product Owner approval of demo

## Ceremonias del Sprint

### Daily Standups
- **Horario**: 9:00 AM todos los días
- **Duración**: 15 minutos
- **Formato**: What did I do yesterday? What will I do today? Any blockers?
- **Facilitador**: Carlos (Scrum Master)

### Sprint Review
- **Fecha**: Viernes 26/01, 2:00 PM
- **Duración**: 2 horas
- **Audiencia**: Product Owner + stakeholders clave
- **Demo**: Live demo de funcionalidades completadas

### Sprint Retrospective
- **Fecha**: Viernes 26/01, 4:00 PM
- **Duración**: 1.5 horas
- **Formato**: Start/Stop/Continue + Action Items
- **Facilitador**: Carlos

## Comunicación y Coordinación

### Canales de Comunicación
- **Slack #conciliapp-dev**: Updates diarios y coordinación técnica
- **Email**: Comunicación formal con stakeholders
- **Google Meet**: Daily standups y sesiones de pair programming

### Reportes de Estado
- **Daily**: Update en Slack al final del día
- **Weekly**: Email summary a stakeholders viernes
- **Sprint**: Formal report post-retrospective

### Escalación
- **Blockers técnicos**: Escalar a Ana (senior dev) inmediatamente
- **Scope changes**: Escalar a María (PO) para decisión
- **Process issues**: Carlos (SM) facilita resolución

## Preparación para Sprint 2

### Items Candidatos (Preliminary)
- US-003: Registro de Cobranza con Validaciones (5 SP)
- US-005: Sincronización de Vendedores (5 SP)
- Refinement de US-006: Gestión de Registros (preparación)

### Dependencies a Resolver
- Acceso a API eFactory para sincronización
- Definir estructura exacta de datos de cobranza
- Mockups aprobados para UI de registro

### Knowledge Transfer
- Documentar learnings de implementación de seguridad
- Compartir patterns exitosos de testing en Apps Script
- Preparar onboarding si hay cambios en el equipo