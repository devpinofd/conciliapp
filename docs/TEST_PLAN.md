# Plan de Pruebas - Conciliapp

Este documento describe la estrategia de pruebas para el sistema de registro de cobranzas Conciliapp, incluyendo pruebas unitarias, de integración y manuales.

## Objetivos del Plan de Pruebas

- Garantizar la funcionalidad correcta de todas las características
- Validar la seguridad del sistema de autenticación
- Verificar la integridad de los datos almacenados
- Asegurar la compatibilidad con Google Apps Script
- Validar el comportamiento bajo condiciones de error

## Estrategia de Pruebas

### 1. Pruebas Unitarias

**Framework**: Simulación manual (Google Apps Script no soporta frameworks tradicionales)

#### Módulo AuthManager
```javascript
// Casos de prueba para validateUser()
- Test: Usuario válido con credenciales correctas
- Test: Usuario con contraseña incorrecta
- Test: Usuario no existente en vendedores
- Test: Validación de salt y hash HMAC-SHA256
- Test: Rate limiting después de 5 intentos fallidos
```

#### Módulo CacheManager
```javascript
// Casos de prueba para gestión de caché
- Test: Almacenar y recuperar datos del caché
- Test: Expiración automática de tokens (6 horas)
- Test: Invalidación manual de caché
- Test: Manejo de caché corrupto
```

#### Módulo DataFetcher
```javascript
// Casos de prueba para sincronización
- Test: Fetch exitoso de API eFactory
- Test: Manejo de timeout de API
- Test: Respuesta malformada de API
- Test: Actualización de hoja vendedores
```

### 2. Pruebas de Integración

#### Flujo Completo de Autenticación
```
Escenario: Login exitoso
1. Usuario ingresa credenciales válidas
2. Sistema valida contra hoja vendedores
3. Se genera token de sesión
4. Se almacena en caché por 6 horas
5. Se registra evento en auditoría
6. Usuario es redirigido a dashboard

Escenario: Login fallido
1. Usuario ingresa credenciales inválidas
2. Sistema incrementa contador de intentos
3. Se registra intento fallido en auditoría
4. Tras 5 intentos, cuenta se bloquea temporalmente
5. Usuario recibe mensaje de error apropiado
```

#### Flujo de Registro de Cobranza
```
Escenario: Registro exitoso
1. Usuario autenticado accede al formulario
2. Selecciona cliente y vendedor
3. Ingresa facturas en formato CSV
4. Especifica monto y método de pago
5. Sistema valida todos los campos
6. Datos se almacenan en hoja Respuestas
7. Se muestra confirmación al usuario

Escenario: Validación de datos
1. Campos obligatorios vacíos → Error
2. Formato de facturas inválido → Error
3. Monto no numérico → Error
4. Usuario no autenticado → Redirección a login
```

### 3. Pruebas de Seguridad

#### Autenticación y Autorización
- [ ] Verificar que passwords se almacenan hasheados (HMAC-SHA256)
- [ ] Confirmar que cada usuario tiene salt único
- [ ] Validar que tokens expiran correctamente
- [ ] Probar que usuarios no autenticados no pueden acceder
- [ ] Verificar que rate limiting funciona correctamente
- [ ] Confirmar logging de todos los intentos de acceso

#### Protección de Datos
- [ ] Verificar que datos sensibles no se exponen en logs
- [ ] Confirmar que solo usuarios propietarios pueden ver sus datos
- [ ] Validar que eliminaciones se auditan correctamente
- [ ] Probar que configuraciones secretas usan PropertiesService

### 4. Pruebas de Performance

#### Límites de Google Apps Script
- [ ] Verificar que las operaciones completan en < 6 minutos
- [ ] Confirmar manejo adecuado de quotas diarias
- [ ] Probar performance con volúmenes altos de datos
- [ ] Validar que el caché mejora tiempos de respuesta

#### Optimización de Consultas
- [ ] Medir tiempo de carga de vendedores/clientes
- [ ] Verificar eficiencia de consultas a hojas
- [ ] Probar paginación en listados grandes
- [ ] Validar que filtros reducen tiempo de búsqueda

### 5. Pruebas de Usabilidad

#### Experiencia de Usuario
- [ ] Navegación intuitiva entre páginas
- [ ] Mensajes de error claros y útiles
- [ ] Confirmaciones visuales para acciones exitosas
- [ ] Responsividad en dispositivos móviles
- [ ] Compatibilidad con navegadores principales

#### Flujos de Trabajo
- [ ] Proceso de registro de nuevo usuario
- [ ] Flujo completo de registro de cobranza
- [ ] Generación y descarga de reportes
- [ ] Gestión de registros existentes

### 6. Pruebas de Compatibilidad

#### Navegadores
- [ ] Chrome (versiones recientes)
- [ ] Firefox (versiones recientes)
- [ ] Safari (versiones recientes)
- [ ] Edge (versiones recientes)

#### Dispositivos
- [ ] Desktop (Windows, Mac, Linux)
- [ ] Tablets (iOS, Android)
- [ ] Móviles (iOS, Android)

### 7. Casos de Prueba Detallados

#### CP-001: Login con Credenciales Válidas
```
Precondiciones:
- Usuario existe en hoja 'obtenerVendedoresPorUsuario'
- Contraseña correcta disponible

Pasos:
1. Navegar a Auth.html
2. Ingresar email válido
3. Ingresar contraseña correcta
4. Hacer clic en "Iniciar Sesión"

Resultado Esperado:
- Redirección a index.html
- Token de sesión creado
- Evento registrado en auditoría
```

#### CP-002: Rate Limiting de Login
```
Precondiciones:
- Usuario existe en sistema
- Contador de intentos en 0

Pasos:
1. Intentar login con contraseña incorrecta 5 veces
2. Intentar login con contraseña correcta

Resultado Esperado:
- Primeros 5 intentos fallan con mensaje de error
- Sexto intento (correcto) debe ser bloqueado
- Mensaje de "cuenta bloqueada temporalmente"
- Evento de bloqueo en auditoría
```

#### CP-003: Registro de Cobranza Completo
```
Precondiciones:
- Usuario autenticado
- Datos de clientes y vendedores disponibles

Pasos:
1. Navegar a formulario de registro
2. Seleccionar cliente del dropdown
3. Confirmar vendedor autenticado
4. Ingresar facturas: "FAC001,FAC002,FAC003"
5. Ingresar monto: "150000.50"
6. Seleccionar método de pago
7. Hacer clic en "Registrar"

Resultado Esperado:
- Datos guardados en hoja 'Respuestas'
- Mensaje de confirmación mostrado
- Formulario se resetea para nuevo registro
```

### 8. Pruebas de Regresión

#### Lista de Verificación Post-Deploy
- [ ] Login y registro funcionando
- [ ] Sincronización de vendedores operativa
- [ ] Formulario de cobranza guardando datos
- [ ] Generación de reportes exitosa
- [ ] Modo mantenimiento activable
- [ ] Auditoría registrando eventos
- [ ] Performance dentro de parámetros aceptables

### 9. Automatización de Pruebas

#### Scripts de Validación
```javascript
// Script para validar estructura de datos
function validateDataStructure() {
  const sheets = ['Respuestas', 'Usuarios', 'Auditoria', 'obtenerVendedoresPorUsuario'];
  sheets.forEach(sheetName => {
    // Verificar que la hoja existe
    // Validar estructura de columnas
    // Confirmar datos de ejemplo
  });
}

// Script para pruebas de carga
function loadTest() {
  for(let i = 0; i < 100; i++) {
    // Simular registro de cobranza
    // Medir tiempo de respuesta
    // Verificar integridad de datos
  }
}
```

### 10. Criterios de Aceptación de Pruebas

#### Para Pasar a Producción:
- [ ] 100% de pruebas unitarias pasando
- [ ] 95% de pruebas de integración exitosas
- [ ] Todas las pruebas de seguridad aprobadas
- [ ] Performance dentro de límites aceptables
- [ ] Compatibilidad validada en navegadores principales
- [ ] Pruebas de regresión completadas sin issues críticos

### 11. Reportes de Defectos

#### Clasificación de Severidad:
- **Crítica**: Sistema no funciona, pérdida de datos
- **Alta**: Funcionalidad principal afectada
- **Media**: Funcionalidad secundaria con workaround
- **Baja**: Problemas cosméticos o de usabilidad menor

#### Template de Reporte:
```
ID: DEF-YYYY-XXX
Título: [Descripción breve del defecto]
Severidad: [Crítica/Alta/Media/Baja]
Pasos para Reproducir:
1. 
2. 
3. 

Resultado Esperado:
Resultado Actual:
Evidencia: [Screenshots, logs]
Ambiente: [Navegador, versión, dispositivo]
```

### 12. Ambiente de Pruebas

#### Configuración:
- **Google Apps Script**: Proyecto de pruebas separado
- **Google Sheets**: Hojas con datos sintéticos
- **APIs Externas**: Endpoints de prueba o mocks
- **Configuración**: Variables de prueba en PropertiesService

#### Datos de Prueba:
- Usuarios de prueba con diferentes roles
- Registros de cobranza variados
- Datos de vendedores y clientes sintéticos
- Escenarios de error preparados