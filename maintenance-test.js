/**
 * @fileoverview Script de pruebas manuales para el modo mantenimiento
 * Este archivo contiene ejemplos de uso y pruebas que se pueden ejecutar
 * en la consola de Google Apps Script para validar la funcionalidad.
 */

/**
 * CONFIGURACIÓN INICIAL REQUERIDA:
 * 
 * 1. En Script Properties, configurar:
 *    ADMIN_EMAILS = "admin1@empresa.com,admin2@empresa.com"
 * 
 * 2. Asegurarse de que el usuario actual esté en la lista de administradores
 *    para poder ejecutar las pruebas de activación/desactivación.
 */

/**
 * Test 1: Configurar administradores
 * Ejecutar este código en la consola de GAS para configurar administradores.
 */
function setupAdmins() {
  const props = PropertiesService.getScriptProperties();
  
  // Configurar emails de administradores - CAMBIAR POR LOS EMAILS REALES
  const adminEmails = "admin@empresa.com,devpino@empresa.com"; // Reemplazar con emails reales
  
  props.setProperty('ADMIN_EMAILS', adminEmails);
  console.log('Administradores configurados:', adminEmails);
  
  // Verificar configuración
  const savedEmails = props.getProperty('ADMIN_EMAILS');
  console.log('Administradores guardados:', savedEmails);
}

/**
 * Test 2: Activar modo mantenimiento completo
 */
function testEnableFullMaintenance() {
  try {
    const result = enableMaintenance({
      mode: 'full',
      message: 'Sistema en mantenimiento programado. Reiniciamos a las 14:00.',
      allowAdmins: true,
      until: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 horas desde ahora
    });
    
    console.log('Mantenimiento completo activado:', result);
    return result;
  } catch (error) {
    console.error('Error al activar mantenimiento:', error);
    throw error;
  }
}

/**
 * Test 3: Activar modo solo lectura
 */
function testEnableReadOnlyMaintenance() {
  try {
    const result = enableMaintenance({
      mode: 'read-only',
      message: 'Actualizando base de datos. Solo consulta disponible temporalmente.',
      allowAdmins: false,
      until: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos desde ahora
    });
    
    console.log('Modo solo lectura activado:', result);
    return result;
  } catch (error) {
    console.error('Error al activar modo solo lectura:', error);
    throw error;
  }
}

/**
 * Test 4: Consultar estado actual
 */
function testGetMaintenanceStatus() {
  try {
    const status = getMaintenanceStatus();
    console.log('Estado actual de mantenimiento:', status);
    return status;
  } catch (error) {
    console.error('Error al consultar estado:', error);
    throw error;
  }
}

/**
 * Test 5: Desactivar mantenimiento
 */
function testDisableMaintenance() {
  try {
    const result = disableMaintenance();
    console.log('Mantenimiento desactivado:', result);
    return result;
  } catch (error) {
    console.error('Error al desactivar mantenimiento:', error);
    throw error;
  }
}

/**
 * Test 6: Verificar permisos de administrador
 */
function testAdminPermissions() {
  const currentUser = Session.getActiveUser().getEmail();
  const isAdmin = MaintenanceService.isAdmin(currentUser);
  
  console.log(`Usuario actual: ${currentUser}`);
  console.log(`Es administrador: ${isAdmin}`);
  
  if (!isAdmin) {
    console.warn('ADVERTENCIA: El usuario actual no es administrador. Configure ADMIN_EMAILS correctamente.');
  }
  
  return { user: currentUser, isAdmin: isAdmin };
}

/**
 * Test 7: Probar bypass de administrador
 */
function testAdminBypass() {
  const currentUser = Session.getActiveUser().getEmail();
  
  // Activar mantenimiento con bypass para admins
  const maintenanceStatus = {
    mode: 'full',
    message: 'Prueba de bypass de administrador',
    allowAdmins: true
  };
  
  try {
    enableMaintenance(maintenanceStatus);
    
    const canBypass = MaintenanceService.canUserBypass(currentUser);
    console.log(`Usuario ${currentUser} puede hacer bypass: ${canBypass}`);
    
    // Probar la verificación de operación
    try {
      MaintenanceService.assertOperationAllowed(currentUser, { forLogin: true });
      console.log('Operación de login permitida para administrador');
    } catch (error) {
      console.log('Operación de login bloqueada:', error.message);
    }
    
    // Desactivar mantenimiento después de la prueba
    disableMaintenance();
    
    return { canBypass: canBypass };
  } catch (error) {
    console.error('Error en prueba de bypass:', error);
    throw error;
  }
}

/**
 * Test 8: Probar bloqueo para usuario no administrador
 */
function testNonAdminBlocking() {
  const testUser = "usuario.prueba@empresa.com"; // Email que NO esté en ADMIN_EMAILS
  
  try {
    // Activar mantenimiento sin bypass para admins
    enableMaintenance({
      mode: 'full',
      message: 'Prueba de bloqueo para no administradores',
      allowAdmins: false
    });
    
    try {
      MaintenanceService.assertOperationAllowed(testUser, { forLogin: true });
      console.log('ERROR: Usuario no admin pudo realizar operación');
    } catch (error) {
      console.log('CORRECTO: Usuario no admin bloqueado:', error.message);
    }
    
    // Desactivar mantenimiento después de la prueba
    disableMaintenance();
    
  } catch (error) {
    console.error('Error en prueba de bloqueo:', error);
    throw error;
  }
}

/**
 * Ejecutar todas las pruebas en secuencia
 */
function runAllTests() {
  console.log('=== INICIANDO PRUEBAS DEL MODO MANTENIMIENTO ===');
  
  try {
    console.log('\n1. Configurando administradores...');
    setupAdmins();
    
    console.log('\n2. Verificando permisos de administrador...');
    testAdminPermissions();
    
    console.log('\n3. Consultando estado inicial...');
    testGetMaintenanceStatus();
    
    console.log('\n4. Activando modo mantenimiento completo...');
    testEnableFullMaintenance();
    
    console.log('\n5. Probando bypass de administrador...');
    testAdminBypass();
    
    console.log('\n6. Activando modo solo lectura...');
    testEnableReadOnlyMaintenance();
    
    console.log('\n7. Desactivando mantenimiento...');
    testDisableMaintenance();
    
    console.log('\n8. Probando bloqueo para no administradores...');
    testNonAdminBlocking();
    
    console.log('\n=== TODAS LAS PRUEBAS COMPLETADAS ===');
    
  } catch (error) {
    console.error('Error durante las pruebas:', error);
  }
}

/**
 * INSTRUCCIONES DE USO:
 * 
 * 1. Abrir el editor de Google Apps Script
 * 2. Ir a la pestaña "maintenance-test.js" (este archivo)
 * 3. Modificar el email en setupAdmins() por el email del administrador real
 * 4. Ejecutar setupAdmins() primero para configurar los administradores
 * 5. Ejecutar runAllTests() para ejecutar todas las pruebas
 * 6. O ejecutar pruebas individuales según sea necesario
 * 
 * VERIFICACIONES MANUALES EN EL FRONTEND:
 * 
 * 1. Con mantenimiento activado (modo 'full'):
 *    - Cargar index.html
 *    - Verificar que aparece el banner naranja
 *    - Verificar que aparece el overlay modal
 *    - Verificar que el botón "Enviar Cobranza" está deshabilitado
 * 
 * 2. Con mantenimiento en modo 'read-only':
 *    - Cargar index.html
 *    - Verificar que aparece el banner naranja
 *    - Verificar que NO aparece el overlay modal
 *    - Verificar que se puede navegar pero no enviar datos
 * 
 * 3. Con mantenimiento desactivado:
 *    - Cargar index.html
 *    - Verificar que NO aparece banner ni overlay
 *    - Verificar que todas las funciones funcionan normalmente
 */