# Guía de Contribución - Conciliapp

¡Gracias por tu interés en contribuir a Conciliapp! Esta guía te ayudará a empezar y seguir las mejores prácticas del proyecto.

## Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [Primeros Pasos](#primeros-pasos)
- [Proceso de Desarrollo](#proceso-de-desarrollo)
- [Estándares de Código](#estándares-de-código)
- [Testing](#testing)
- [Documentación](#documentación)
- [Proceso de Pull Request](#proceso-de-pull-request)
- [Reporte de Issues](#reporte-de-issues)

## Código de Conducta

### Nuestro Compromiso

Nos comprometemos a mantener un ambiente abierto y acogedor para todos, independientemente de edad, discapacidad, etnia, identidad de género, nivel de experiencia, nacionalidad, apariencia personal, raza, religión o identidad y orientación sexual.

### Comportamientos Esperados

- Uso de lenguaje inclusivo y respetuoso
- Respeto por diferentes puntos de vista y experiencias
- Aceptación constructiva de críticas
- Enfoque en lo mejor para la comunidad
- Empatía hacia otros miembros de la comunidad

### Comportamientos Inaceptables

- Uso de lenguaje o imágenes sexualizadas
- Trolling, comentarios insultantes o ataques personales
- Acoso público o privado
- Publicar información privada sin consentimiento
- Cualquier conducta que sea inapropiada en un ambiente profesional

## Primeros Pasos

### Configuración del Ambiente de Desarrollo

1. **Clonar el Repositorio**
   ```bash
   git clone https://github.com/devpinofd/conciliapp.git
   cd conciliapp
   ```

2. **Configurar Google Apps Script**
   - Crear nuevo proyecto en [script.google.com](https://script.google.com)
   - Configurar `appsscript.json` según documentación
   - Habilitar Advanced Google Services necesarios

3. **Configurar Google Sheets**
   - Crear hoja de cálculo con estructura definida
   - Configurar pestañas: Respuestas, Usuarios, Auditoria, etc.
   - Configurar permisos apropiados

4. **Variables de Entorno**
   ```javascript
   // Configurar en PropertiesService
   const properties = PropertiesService.getScriptProperties();
   properties.setProperties({
     'SHEET_ID': 'tu_sheet_id',
     'SECRET_KEY': 'clave_secreta_minimo_32_chars',
     'EFACTORY_API_URL': 'https://api.efactory.com/vendedores'
   });
   ```

### Estructura del Proyecto

```
conciliapp/
├── docs/                    # Documentación del proyecto
│   ├── AGILE_OVERVIEW.md   # Visión general Agile
│   ├── ARCHITECTURE.md     # Arquitectura del sistema
│   ├── CONTRIBUTING.md     # Esta guía
│   ├── DEPLOYMENT.md       # Guía de despliegue
│   ├── PRODUCT_BACKLOG.md  # Backlog priorizado
│   ├── RUNBOOK.md          # Procedimientos operativos
│   ├── SPRINT_PLAN.md      # Plan de sprint actual
│   ├── TEST_PLAN.md        # Estrategia de testing
│   ├── USER_STORIES.md     # Historias de usuario
│   └── diagrams.md         # Diagramas técnicos
├── auth.html               # Página de autenticación
├── auth.js                 # Lógica de autenticación
├── codigo.js               # Lógica principal de negocio
├── dashboard.html          # Panel administrativo
├── index.html              # Interfaz principal
├── maintenance.js          # Servicios de mantenimiento
├── Report.html             # Template de reportes
├── appsscript.json         # Configuración del proyecto
└── README.md               # Documentación principal
```

## Proceso de Desarrollo

### Workflow de Git

Seguimos **GitFlow** adaptado para nuestro contexto:

```
main                 # Código de producción
├─ develop          # Código de desarrollo integrado
   ├─ feature/*     # Nuevas funcionalidades
   ├─ bugfix/*      # Corrección de bugs
   ├─ hotfix/*      # Correcciones urgentes
   └─ docs/*        # Actualizaciones de documentación
```

### Creación de Branches

```bash
# Para nueva funcionalidad
git checkout develop
git pull origin develop
git checkout -b feature/US-001-autenticacion-robusta

# Para corrección de bug
git checkout develop
git checkout -b bugfix/fix-login-validation

# Para documentación
git checkout develop
git checkout -b docs/update-api-documentation

# Para hotfix en producción
git checkout main
git checkout -b hotfix/critical-security-fix
```

### Convenciones de Naming

#### Branches
- `feature/US-XXX-descripcion-corta`
- `bugfix/fix-descripcion-problema`
- `hotfix/critical-descripcion-urgente`
- `docs/update-descripcion-docs`

#### Commits
Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Tipos válidos:**
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Cambios de formato (no afectan lógica)
- `refactor`: Refactoring de código
- `test`: Añadir o modificar tests
- `chore`: Tareas de mantenimiento

**Ejemplos:**
```bash
feat(auth): implement HMAC-SHA256 password hashing

fix(validation): correct email format validation regex

docs(api): update authentication endpoint documentation

refactor(cache): optimize cache invalidation logic
```

## Estándares de Código

### JavaScript/Google Apps Script

#### Estilo de Código
```javascript
// ✅ Usar const/let, evitar var
const userEmail = Session.getActiveUser().getEmail();
let attempts = 0;

// ✅ Funciones descriptivas con JSDoc
/**
 * Valida las credenciales de un usuario
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña en texto plano
 * @returns {Object} Resultado de validación con success y mensaje
 */
function validateUser(email, password) {
  // implementación
}

// ✅ Manejo de errores consistente
try {
  const result = someRiskyOperation();
  return { success: true, data: result };
} catch (error) {
  Logger.log('Error en operación: ' + error.toString());
  return { success: false, error: error.message };
}

// ❌ Evitar funciones demasiado largas
// ❌ No usar console.log, usar Logger.log
// ❌ No hardcodear valores, usar PropertiesService
```

#### Estructura de Módulos
```javascript
/**
 * Módulo para gestión de autenticación
 * Sigue patrón Singleton para Google Apps Script
 */
const AuthManager = (function() {
  // Variables privadas
  const HASH_ALGORITHM = 'HmacSHA256';
  const SESSION_TIMEOUT = 6 * 60 * 60 * 1000; // 6 horas
  
  // Métodos privados
  function generateSalt() {
    return Utilities.getUuid();
  }
  
  // API pública
  return {
    validateUser: function(email, password) {
      // implementación
    },
    
    generateToken: function(user) {
      // implementación
    }
  };
})();
```

### HTML/CSS

#### Estructura HTML
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conciliapp - Autenticación</title>
  
  <!-- CSS inline para Apps Script -->
  <style>
    /* Usar BEM methodology para clases */
    .auth-form { }
    .auth-form__input { }
    .auth-form__button--primary { }
  </style>
</head>
<body>
  <!-- Estructura semántica -->
  <main class="auth-container">
    <form class="auth-form" id="loginForm">
      <!-- contenido -->
    </form>
  </main>
  
  <!-- JavaScript al final -->
  <script>
    // Usar funciones específicas, evitar código inline
  </script>
</body>
</html>
```

### Estándares de Seguridad

#### Validación de Entrada
```javascript
// ✅ Validar en cliente Y servidor
function validateCobranzaData(data) {
  const errors = [];
  
  // Email validation
  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Email inválido');
  }
  
  // Sanitize string inputs
  data.cliente = sanitizeString(data.cliente);
  data.facturas = sanitizeCSV(data.facturas);
  
  // Validate numeric inputs
  if (!data.monto || isNaN(parseFloat(data.monto)) || data.monto <= 0) {
    errors.push('Monto debe ser un número positivo');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors,
    sanitizedData: data
  };
}
```

#### Manejo de Secretos
```javascript
// ✅ Usar PropertiesService para datos sensibles
function getSecretKey() {
  return PropertiesService.getScriptProperties().getProperty('SECRET_KEY');
}

// ❌ NO hardcodear claves
const SECRET_KEY = 'mi-clave-secreta'; // ¡NUNCA HACER ESTO!
```

## Testing

### Estrategia de Testing

Dado las limitaciones de Google Apps Script, implementamos testing híbrido:

#### Tests Unitarios (Simulados)
```javascript
/**
 * Test suite para AuthManager
 * Ejecutar manualmente en Apps Script IDE
 */
function testAuthManager() {
  const tests = [];
  
  // Test 1: Hash consistency
  tests.push(function() {
    const password = 'testPassword123';
    const salt = 'fixedSalt';
    const hash1 = hashPassword(password, salt);
    const hash2 = hashPassword(password, salt);
    
    if (hash1 !== hash2) {
      throw new Error('Hash inconsistency: same password+salt should produce same hash');
    }
    return 'PASS: Hash consistency';
  });
  
  // Test 2: Rate limiting
  tests.push(function() {
    const email = 'test@example.com';
    
    // Simular 5 intentos fallidos
    for (let i = 0; i < 5; i++) {
      logFailedAttempt(email);
    }
    
    if (checkRateLimit(email)) {
      throw new Error('Rate limit should block after 5 attempts');
    }
    return 'PASS: Rate limiting works';
  });
  
  // Ejecutar tests
  tests.forEach((test, index) => {
    try {
      const result = test();
      Logger.log(`Test ${index + 1}: ${result}`);
    } catch (error) {
      Logger.log(`Test ${index + 1} FAILED: ${error.message}`);
    }
  });
}
```

#### Tests de Integración
```javascript
/**
 * Test de flujo completo de autenticación
 */
function testIntegrationLogin() {
  const testEmail = 'test@vendedor.com';
  const testPassword = 'TestPassword123!';
  
  // Setup: Crear usuario de prueba
  const setupResult = createTestUser(testEmail, testPassword);
  if (!setupResult.success) {
    throw new Error('Setup failed: ' + setupResult.error);
  }
  
  try {
    // Test login exitoso
    const loginResult = validateUser(testEmail, testPassword);
    if (!loginResult.success) {
      throw new Error('Login should succeed with valid credentials');
    }
    
    // Test login fallido
    const badLoginResult = validateUser(testEmail, 'wrongPassword');
    if (badLoginResult.success) {
      throw new Error('Login should fail with invalid credentials');
    }
    
    Logger.log('Integration test PASSED');
    
  } finally {
    // Cleanup: Eliminar usuario de prueba
    cleanupTestUser(testEmail);
  }
}
```

### Proceso de Testing

1. **Pre-commit**: Ejecutar tests unitarios locales
2. **Pre-PR**: Ejecutar suite completa de tests
3. **Post-merge**: Validar en ambiente de development
4. **Pre-release**: Testing completo en staging

## Documentación

### Comentarios en Código

#### JSDoc para Funciones Públicas
```javascript
/**
 * Registra un evento en la bitácora de auditoría
 * @param {string} eventType - Tipo de evento (LOGIN, REGISTRO_CREATED, etc.)
 * @param {string} userEmail - Email del usuario que ejecuta la acción
 * @param {Object} details - Detalles adicionales del evento
 * @param {string} [details.ip] - Dirección IP del usuario
 * @param {string} [details.userAgent] - User agent del navegador
 * @param {Object} [details.metadata] - Metadatos adicionales
 * @returns {boolean} true si el evento se registró exitosamente
 * @example
 * logAuditEvent('LOGIN_SUCCESS', 'user@example.com', {
 *   ip: '192.168.1.1',
 *   userAgent: 'Mozilla/5.0...'
 * });
 */
function logAuditEvent(eventType, userEmail, details = {}) {
  // implementación
}
```

#### Comentarios Inline
```javascript
function validateCobranzaData(data) {
  // Validar campos obligatorios primero
  if (!data.email || !data.cliente || !data.vendedor) {
    return { valid: false, error: 'Campos obligatorios faltantes' };
  }
  
  // TODO: Implementar validación de formato de facturas CSV
  // FIXME: Esta validación no maneja casos edge con espacios
  const facturas = data.facturas.split(',').map(f => f.trim());
  
  // HACK: Workaround temporal para Google Sheets API quota
  // Reemplazar con solución más robusta en US-009
  if (facturas.length > 100) {
    return { valid: false, error: 'Máximo 100 facturas por registro' };
  }
  
  return { valid: true, sanitizedData: data };
}
```

### Documentación de APIs

Documentar todas las funciones públicas que actúan como API:

```javascript
/**
 * API: Registro de nueva cobranza
 * 
 * Endpoint: No aplica (Google Apps Script)
 * Método: doPost() handler
 * 
 * Request Body:
 * {
 *   "action": "registrarCobranza",
 *   "data": {
 *     "cliente": "string",
 *     "vendedor": "string", 
 *     "facturas": "string (CSV)",
 *     "monto": "number",
 *     "metodoPago": "string"
 *   }
 * }
 * 
 * Response:
 * {
 *   "success": boolean,
 *   "data": {
 *     "id": "string",
 *     "timestamp": "ISO string"
 *   },
 *   "error": "string (if success=false)"
 * }
 * 
 * Errores posibles:
 * - 401: Usuario no autenticado
 * - 400: Datos de entrada inválidos
 * - 500: Error interno del servidor
 */
```

## Proceso de Pull Request

### Antes de Crear el PR

#### Checklist Pre-PR
- [ ] Branch actualizada con develop/main
- [ ] Todos los tests unitarios pasando
- [ ] Tests de integración ejecutados
- [ ] Linting aplicado (manual en Apps Script)
- [ ] Documentación actualizada
- [ ] No hay credentials hardcodeados
- [ ] Funcionalidad probada manualmente

### Creación del Pull Request

#### Template de PR
```markdown
## Descripción
Breve descripción de los cambios realizados.

## Tipo de Cambio
- [ ] Bug fix (cambio que corrige un issue)
- [ ] Nueva funcionalidad (cambio que añade funcionalidad)
- [ ] Breaking change (cambio que puede romper funcionalidad existente)
- [ ] Actualización de documentación

## User Story/Issue Relacionado
Closes #123

## Criterios de Aceptación Completados
- [ ] Criterio 1: Descripción específica
- [ ] Criterio 2: Descripción específica
- [ ] Criterio 3: Descripción específica

## Testing Realizado
- [ ] Tests unitarios: Descripción de tests ejecutados
- [ ] Tests de integración: Flujos probados
- [ ] Testing manual: Escenarios validados
- [ ] Testing de regresión: Funcionalidad existente verificada

## Screenshots/Videos (si aplica)
[Incluir capturas de pantalla de cambios en UI]

## Checklist de Revisión
- [ ] Código sigue estándares del proyecto
- [ ] Cambios son backward compatible
- [ ] Documentación actualizada
- [ ] Tests adecuados incluidos
- [ ] Performance no se ve afectada negativamente
- [ ] Security review completado (si aplica)

## Notas Adicionales
Cualquier información adicional para los reviewers.
```

### Proceso de Review

#### Para Reviewers
1. **Code Review Guidelines**:
   - Verificar lógica de negocio
   - Validar manejo de errores
   - Verificar security best practices
   - Confirmar que tests son adecuados
   - Verificar documentación

2. **Comentarios Constructivos**:
   ```
   // ✅ Comentario constructivo
   Considera usar const en lugar de let aquí, ya que el valor no cambia.
   
   // ❌ Comentario no constructivo
   Este código está mal.
   ```

3. **Categorías de Feedback**:
   - **Must Fix**: Problemas que deben solucionarse antes del merge
   - **Suggestion**: Mejoras recomendadas pero no bloqueantes
   - **Question**: Clarificaciones sobre implementación
   - **Praise**: Reconocimiento de buenas prácticas

#### Para Authors
1. **Responder a Todos los Comentarios**
2. **Hacer Follow-up Commits si es Necesario**
3. **Actualizar la Descripción del PR si Cambia el Scope**
4. **Ejecutar Tests Después de Cada Cambio**

### Merge Guidelines

- **Squash and Merge**: Para feature branches pequeñas
- **Merge Commit**: Para features grandes con historia importante
- **Rebase and Merge**: Para cambios simples sin conflictos

## Reporte de Issues

### Tipos de Issues

#### Bug Report
```markdown
**Descripción del Bug**
Descripción clara y concisa del problema.

**Pasos para Reproducir**
1. Ir a '...'
2. Hacer clic en '....'
3. Scroll down to '....'
4. Ver error

**Comportamiento Esperado**
Descripción clara de lo que esperabas que pasara.

**Comportamiento Actual**
Descripción de lo que realmente pasa.

**Screenshots**
Si aplica, añadir screenshots para explicar el problema.

**Ambiente**
- Navegador: [e.g. Chrome 91.0]
- Dispositivo: [e.g. Desktop, iPhone]
- Versión del Sistema: [e.g. Windows 10, iOS 14]

**Información Adicional**
Cualquier contexto adicional sobre el problema.
```

#### Feature Request
```markdown
**¿Tu feature request está relacionado con un problema?**
Descripción clara y concisa del problema. Ej: Estoy siempre frustrado cuando [...]

**Describe la solución que te gustaría**
Descripción clara y concisa de lo que quieres que pase.

**Describe alternativas que hayas considerado**
Descripción clara y concisa de cualquier solución alternativa.

**Contexto adicional**
Añade cualquier contexto adicional o screenshots sobre el feature request.
```

### Etiquetas de Issues

- `bug`: Algo no está funcionando
- `enhancement`: Nueva funcionalidad o request
- `documentation`: Mejoras o adiciones a documentación
- `good first issue`: Bueno para newcomers
- `help wanted`: Se busca ayuda adicional
- `question`: Información adicional es solicitada
- `security`: Relacionado con seguridad
- `priority:high`: Prioridad alta
- `priority:medium`: Prioridad media
- `priority:low`: Prioridad baja

## Recursos Adicionales

### Enlaces Útiles
- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [Google Sheets API Reference](https://developers.google.com/sheets/api)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitFlow Workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow)

### Canales de Comunicación
- **Slack**: #conciliapp-dev para discusiones técnicas
- **Email**: dev-team@empresa.com para comunicación formal
- **Issues**: GitHub Issues para bugs y feature requests
- **Discussions**: GitHub Discussions para preguntas generales

### Mentoring y Onboarding
- **Buddy System**: Nuevos contribuidores son asignados un mentor
- **Code Pairing**: Sesiones de pair programming para knowledge transfer
- **Documentation First**: Antes de preguntar, revisar documentación existente
- **Ask Questions**: No hay preguntas tontas, mejor preguntar que asumir

¡Gracias por contribuir a Conciliapp! 🚀