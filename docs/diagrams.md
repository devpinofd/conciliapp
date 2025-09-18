# Diagramas Técnicos - Conciliapp

Este documento contiene los diagramas técnicos que ilustran la arquitectura, flujos de datos y componentes del sistema Conciliapp.

## Diagrama de Arquitectura General

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI1[auth.html - Login/Registro]
        UI2[index.html - Dashboard Principal]
        UI3[dashboard.html - Panel Admin]
    end
    
    subgraph "Google Apps Script Backend"
        AUTH[AuthManager - Autenticación]
        DATA[DataFetcher - Datos]
        CACHE[CacheManager - Caché]
        MAINT[MaintenanceService - Mantenimiento]
        AUDIT[AuditLogger - Auditoría]
    end
    
    subgraph "Data Layer - Google Sheets"
        SHEETS[(Google Sheets)]
        RESP[Hoja: Respuestas]
        USER[Hoja: Usuarios]
        VEND[Hoja: Vendedores]
        AUDT[Hoja: Auditoria]
        DEL[Hoja: Eliminados]
    end
    
    subgraph "External APIs"
        EFACTORY[eFactory API - Vendedores]
    end
    
    UI1 --> AUTH
    UI2 --> DATA
    UI3 --> MAINT
    
    AUTH --> USER
    AUTH --> AUDT
    AUTH --> CACHE
    
    DATA --> RESP
    DATA --> VEND
    DATA --> CACHE
    DATA --> EFACTORY
    
    MAINT --> SHEETS
    AUDIT --> AUDT
    
    CACHE --> SHEETS
```

## Flujo de Autenticación Detallado

```mermaid
sequenceDiagram
    participant U as Usuario
    participant F as Frontend (auth.html)
    participant A as AuthManager
    participant C as CacheManager
    participant S as Google Sheets
    participant L as AuditLogger
    
    U->>F: Ingresa email/password
    F->>A: validateUser(email, password)
    
    A->>S: Consultar usuario en hoja "Usuarios"
    S-->>A: Datos usuario (hash, salt, intentos_fallidos)
    
    alt Usuario existe y no bloqueado
        A->>A: Verificar hash HMAC-SHA256
        
        alt Password correcto
            A->>C: Generar token sesión (6h TTL)
            A->>S: Actualizar ultimo_login, reset intentos_fallidos
            A->>L: Log LOGIN_SUCCESS
            A-->>F: Token válido + datos usuario
            F-->>U: Redirección a dashboard
        else Password incorrecto
            A->>S: Incrementar intentos_fallidos
            A->>L: Log LOGIN_FAILED
            
            alt intentos_fallidos >= 5
                A->>S: Bloquear cuenta (15 min)
                A->>L: Log ACCOUNT_LOCKED
                A-->>F: Error - Cuenta bloqueada
            else
                A-->>F: Error - Credenciales inválidas
            end
            
            F-->>U: Mensaje error apropiado
        end
    else Usuario bloqueado o no existe
        A->>L: Log LOGIN_DENIED
        A-->>F: Error - Acceso denegado
        F-->>U: Mensaje error genérico
    end
```

## Flujo de Registro de Cobranza

```mermaid
sequenceDiagram
    participant U as Usuario
    participant F as Frontend (index.html)
    participant A as AuthManager
    participant D as DataFetcher
    participant V as Validator
    participant S as Google Sheets
    participant L as AuditLogger
    
    U->>F: Completa formulario cobranza
    F->>F: Validaciones cliente (JS)
    
    alt Validaciones cliente OK
        F->>A: Verificar token sesión válido
        A-->>F: Usuario autenticado
        
        F->>D: saveCobranza(datos)
        D->>V: validateCobranzaData(datos)
        
        alt Validaciones servidor OK
            V->>S: Verificar vendedor autorizado
            V->>V: Validar formato facturas CSV
            V->>V: Validar monto numérico positivo
            V-->>D: Validación exitosa
            
            D->>D: Generar ID único registro
            D->>S: Insertar en hoja "Respuestas"
            S-->>D: Confirmación inserción
            
            D->>L: Log COBRANZA_CREATED
            D-->>F: Success + ID registro
            F-->>U: Confirmación visual + reset form
        else Validaciones fallan
            V-->>D: Errores validación
            D->>L: Log COBRANZA_VALIDATION_ERROR
            D-->>F: Lista errores específicos
            F-->>U: Mostrar errores en form
        end
    else Validaciones cliente fallan
        F-->>U: Mostrar errores inline
    end
```

## Flujo de Sincronización de Vendedores

```mermaid
sequenceDiagram
    participant T as Trigger (4h)
    participant D as DataFetcher
    participant E as eFactory API
    participant C as CacheManager
    participant S as Google Sheets
    participant L as AuditLogger
    
    T->>D: syncVendedoresFromAPI()
    D->>L: Log SYNC_STARTED
    
    D->>E: GET /vendedores
    
    alt API Response OK
        E-->>D: Lista vendedores JSON
        D->>D: Validar estructura datos
        D->>D: Comparar con datos existentes
        
        loop Para cada vendedor
            alt Vendedor nuevo o modificado
                D->>S: Actualizar/Insertar en "obtenerVendedoresPorUsuario"
            end
        end
        
        D->>C: Invalidar caché vendedores
        D->>L: Log SYNC_SUCCESS (count: updated/inserted)
        
    else API Error (timeout, 404, etc.)
        E-->>D: Error response
        D->>D: Preservar datos existentes
        D->>L: Log SYNC_ERROR + detalles error
        
        alt Error crítico
            D->>D: Activar modo degradado
            D->>L: Log DEGRADED_MODE_ACTIVATED
        end
    end
```

## Diagrama de Componentes

```mermaid
classDiagram
    class AuthManager {
        +validateUser(email, password) Boolean
        +registerUser(userData) Result
        +generateToken(user) String
        +validateToken(token) User
        +checkRateLimit(email) Boolean
        +logLoginAttempt(email, success) void
        -hashPassword(password, salt) String
        -generateSalt() String
        -isUserAuthorized(email) Boolean
    }
    
    class DataFetcher {
        +getVendedores() Array~Vendedor~
        +getClientes() Array~Cliente~
        +saveCobranza(data) Result
        +getRegistrosByUser(email) Array~Registro~
        +deleteRegistro(id, user) Result
        +syncVendedoresFromAPI() Result
        -validateData(data) ValidationResult
        -generateId() String
        -formatData(raw) Object
    }
    
    class CacheManager {
        +get(key) Any
        +set(key, value, ttl) void
        +invalidate(key) void
        +clear() void
        +getStats() CacheStats
        -isExpired(timestamp, ttl) Boolean
        -serialize(data) String
        -deserialize(data) Any
    }
    
    class MaintenanceService {
        +enableMaintenanceMode(reason) void
        +disableMaintenanceMode() void
        +cleanExpiredTokens() void
        +createBackup() Result
        +generateHealthReport() Report
        +optimizePerformance() void
        -isMaintenanceEnabled() Boolean
        -archiveOldData() void
        -validateDataIntegrity() Result
    }
    
    class AuditLogger {
        +logEvent(event, user, details) void
        +getEventsByUser(email) Array~Event~
        +getEventsByType(type) Array~Event~
        +getEventsInRange(start, end) Array~Event~
        -formatEvent(event) String
        -validateEventData(event) Boolean
    }
    
    class GoogleSheetsAdapter {
        +readRange(sheet, range) Array
        +writeRange(sheet, range, data) void
        +appendRow(sheet, data) void
        +findRows(sheet, criteria) Array
        +deleteRow(sheet, row) void
        -getSheet(name) Sheet
        -validateSheetStructure(sheet) Boolean
    }
    
    AuthManager --> CacheManager : stores tokens
    AuthManager --> GoogleSheetsAdapter : reads users
    AuthManager --> AuditLogger : logs events
    
    DataFetcher --> GoogleSheetsAdapter : CRUD operations
    DataFetcher --> CacheManager : caches data
    DataFetcher --> AuditLogger : logs operations
    
    MaintenanceService --> GoogleSheetsAdapter : maintenance ops
    MaintenanceService --> CacheManager : cache cleanup
    MaintenanceService --> AuditLogger : logs maintenance
    
    AuditLogger --> GoogleSheetsAdapter : persists logs
```

## Modelo de Datos (ER-Style)

```mermaid
erDiagram
    Usuario {
        string email PK
        string password_hash
        string salt
        datetime fecha_registro
        datetime ultimo_login
        int intentos_fallidos
        datetime bloqueado_hasta
    }
    
    Registro_Cobranza {
        string id PK
        datetime timestamp
        string email_usuario FK
        string cliente
        string vendedor
        string facturas_csv
        decimal monto
        string metodo_pago
        string estado
    }
    
    Vendedor {
        string email PK
        string nombre
        string codigo_vendedor
        boolean activo
        datetime ultima_sincronizacion
    }
    
    Evento_Auditoria {
        string id PK
        datetime timestamp
        string usuario
        string accion
        string detalles
        string ip
        string user_agent
        string resultado
    }
    
    Registro_Eliminado {
        string id PK
        datetime timestamp_eliminacion
        string usuario_elimino
        string datos_originales_json
        string motivo
    }
    
    Usuario ||--o{ Registro_Cobranza : creates
    Usuario ||--o{ Evento_Auditoria : generates
    Vendedor ||--o{ Registro_Cobranza : associated_with
    Registro_Cobranza ||--o| Registro_Eliminado : may_become
```

## Flujo de Estados del Sistema

```mermaid
stateDiagram-v2
    [*] --> Inicializando
    
    Inicializando --> Operativo : Configuración OK
    Inicializando --> Error : Configuración Falla
    
    Operativo --> Mantenimiento : Activar Mantenimiento
    Operativo --> Degradado : Error API Externa
    Operativo --> Error : Error Crítico
    
    Mantenimiento --> Operativo : Desactivar Mantenimiento
    Mantenimiento --> Error : Error Durante Mantenimiento
    
    Degradado --> Operativo : API Externa Recuperada
    Degradado --> Error : Múltiples Fallos
    
    Error --> Inicializando : Reset/Restart
    Error --> [*] : Shutdown
    
    state Operativo {
        [*] --> Normal
        Normal --> Alta_Carga : >80% Quota
        Alta_Carga --> Normal : <60% Quota
        Alta_Carga --> Throttling : >95% Quota
        Throttling --> Alta_Carga : <90% Quota
    }
    
    state Mantenimiento {
        [*] --> Solo_Lectura
        Solo_Lectura --> Backup_En_Curso : Iniciar Backup
        Backup_En_Curso --> Solo_Lectura : Backup Completo
        Solo_Lectura --> Actualizacion : Iniciar Update
        Actualizacion --> Solo_Lectura : Update Completo
    }
```

## Arquitectura de Seguridad

```mermaid
graph TB
    subgraph "Security Layers"
        subgraph "Authentication Layer"
            AUTH_UI[Login Form with CSRF Protection]
            AUTH_BE[AuthManager with Rate Limiting]
            AUTH_STORE[Encrypted Password Storage]
        end
        
        subgraph "Authorization Layer"
            RBAC[Role-Based Access Control]
            OWNERSHIP[Resource Ownership Validation]
            PERMISSIONS[Action Permissions Matrix]
        end
        
        subgraph "Data Protection Layer"
            VALIDATION[Input Validation & Sanitization]
            ENCRYPTION[Data Encryption at Rest]
            AUDIT_TRAIL[Complete Audit Trail]
        end
        
        subgraph "Infrastructure Security"
            HTTPS[HTTPS Enforcement]
            QUOTA[Quota & Rate Limiting]
            MONITORING[Security Monitoring]
        end
    end
    
    AUTH_UI --> AUTH_BE
    AUTH_BE --> AUTH_STORE
    AUTH_BE --> RBAC
    RBAC --> OWNERSHIP
    OWNERSHIP --> PERMISSIONS
    PERMISSIONS --> VALIDATION
    VALIDATION --> ENCRYPTION
    ENCRYPTION --> AUDIT_TRAIL
    AUDIT_TRAIL --> MONITORING
```

## Flujo de Performance y Caché

```mermaid
graph LR
    subgraph "Request Flow"
        REQ[User Request]
        CACHE_CHECK{Cache Hit?}
        CACHE_GET[Get from Cache]
        DB_QUERY[Query Database]
        CACHE_SET[Store in Cache]
        RESPONSE[Return Response]
    end
    
    subgraph "Cache Management"
        TTL[TTL Expiration]
        INVALIDATION[Manual Invalidation]
        CLEANUP[Automated Cleanup]
    end
    
    REQ --> CACHE_CHECK
    CACHE_CHECK -->|Yes| CACHE_GET
    CACHE_CHECK -->|No| DB_QUERY
    CACHE_GET --> RESPONSE
    DB_QUERY --> CACHE_SET
    CACHE_SET --> RESPONSE
    
    TTL --> CACHE_CHECK
    INVALIDATION --> CACHE_CHECK
    CLEANUP --> CACHE_CHECK
```

## Diagrama de Deployment

```mermaid
graph TB
    subgraph "Development Environment"
        DEV_GAS[Google Apps Script Project - Dev]
        DEV_SHEETS[Google Sheets - Test Data]
        DEV_PROPS[PropertiesService - Dev Config]
    end
    
    subgraph "Staging Environment"
        STAGE_GAS[Google Apps Script Project - Staging]
        STAGE_SHEETS[Google Sheets - Staging Data]
        STAGE_PROPS[PropertiesService - Staging Config]
    end
    
    subgraph "Production Environment"
        PROD_GAS[Google Apps Script Project - Production]
        PROD_SHEETS[Google Sheets - Live Data]
        PROD_PROPS[PropertiesService - Production Config]
        PROD_BACKUP[Google Drive - Backups]
    end
    
    subgraph "External Services"
        EFACTORY_API[eFactory API]
        MONITORING[Monitoring & Alerting]
    end
    
    DEV_GAS --> DEV_SHEETS
    DEV_GAS --> DEV_PROPS
    
    STAGE_GAS --> STAGE_SHEETS
    STAGE_GAS --> STAGE_PROPS
    
    PROD_GAS --> PROD_SHEETS
    PROD_GAS --> PROD_PROPS
    PROD_GAS --> PROD_BACKUP
    PROD_GAS --> EFACTORY_API
    PROD_GAS --> MONITORING
    
    DEV_GAS -.->|Deploy| STAGE_GAS
    STAGE_GAS -.->|Deploy| PROD_GAS
```

## Notas Técnicas

### Leyenda de Diagramas
- **Rectángulos**: Componentes/Servicios
- **Rombos**: Puntos de decisión
- **Cilindros**: Almacenamiento de datos
- **Flechas sólidas**: Flujo de datos/control
- **Flechas punteadas**: Relaciones opcionales/configurables

### Consideraciones de Implementación
- Todos los diagramas reflejan la arquitectura actual en Google Apps Script
- Los flujos incluyen manejo de errores y casos edge
- La seguridad está integrada en cada capa, no como añadido
- El performance está optimizado mediante caché estratégico

### Evolución Futura
- Los diagramas serán actualizados durante la migración a Firestore
- Se añadirán diagramas específicos para microservicios
- La arquitectura de seguridad se expandirá con OAuth2/OIDC
- Se incluirán diagramas de monitoring y observabilidad avanzados