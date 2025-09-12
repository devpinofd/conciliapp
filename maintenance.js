/**
 * @fileoverview Módulo de Modo Mantenimiento para la aplicación.
 * Implementa un servicio centralizado para gestionar el estado de mantenimiento
 * siguiendo principios SOLID y buenas prácticas.
 */

/**
 * Servicio centralizado para gestionar el modo mantenimiento.
 * Utiliza PropertiesService para persistir el estado.
 */
class MaintenanceService {
  
  static MAINTENANCE_PROPERTY_KEY = 'MAINTENANCE_STATUS';
  
  /**
   * Obtiene el estado actual del mantenimiento.
   * @returns {object} Estado completo del mantenimiento
   */
  static getStatus() {
    try {
      const props = PropertiesService.getScriptProperties();
      const statusJson = props.getProperty(this.MAINTENANCE_PROPERTY_KEY);
      
      if (!statusJson) {
        // Estado por defecto si no existe configuración
        return this.getDefaultStatus();
      }
      
      const status = JSON.parse(statusJson);
      // Asegurar que el objeto tenga todas las propiedades requeridas
      return {
        enabled: Boolean(status.enabled),
        mode: status.mode || 'full',
        message: status.message || 'Sistema en mantenimiento. Intente más tarde.',
        allowAdmins: Boolean(status.allowAdmins),
        until: status.until || null,
        updatedAt: status.updatedAt || new Date().toISOString(),
        updatedBy: status.updatedBy || 'sistema'
      };
    } catch (error) {
      Logger.error(`Error al obtener estado de mantenimiento: ${error.message}`);
      return this.getDefaultStatus();
    }
  }
  
  /**
   * Activa el modo mantenimiento con la configuración especificada.
   * @param {object} statusPartial Configuración parcial del mantenimiento
   * @returns {object} Estado actualizado
   */
  static enable(statusPartial = {}) {
    try {
      const currentUser = Session.getActiveUser().getEmail();
      
      // Solo admins pueden activar mantenimiento
      if (!this.isAdmin(currentUser)) {
        throw new Error('No tiene permisos para activar el modo mantenimiento.');
      }
      
      const newStatus = {
        enabled: true,
        mode: statusPartial.mode || 'full',
        message: statusPartial.message || 'Sistema en mantenimiento. Intente más tarde.',
        allowAdmins: Boolean(statusPartial.allowAdmins),
        until: statusPartial.until || null,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser
      };
      
      this.saveStatus(newStatus);
      Logger.log(`Modo mantenimiento activado por: ${currentUser}`, newStatus);
      
      return newStatus;
    } catch (error) {
      Logger.error(`Error al activar mantenimiento: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Desactiva el modo mantenimiento.
   * @returns {object} Estado actualizado
   */
  static disable() {
    try {
      const currentUser = Session.getActiveUser().getEmail();
      
      // Solo admins pueden desactivar mantenimiento
      if (!this.isAdmin(currentUser)) {
        throw new Error('No tiene permisos para desactivar el modo mantenimiento.');
      }
      
      const newStatus = {
        enabled: false,
        mode: 'full',
        message: '',
        allowAdmins: false,
        until: null,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser
      };
      
      this.saveStatus(newStatus);
      Logger.log(`Modo mantenimiento desactivado por: ${currentUser}`);
      
      return newStatus;
    } catch (error) {
      Logger.error(`Error al desactivar mantenimiento: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Actualiza el estado de mantenimiento.
   * @param {object} statusPartial Configuración parcial a actualizar
   * @returns {object} Estado actualizado
   */
  static updateStatus(statusPartial) {
    try {
      const currentUser = Session.getActiveUser().getEmail();
      
      if (!this.isAdmin(currentUser)) {
        throw new Error('No tiene permisos para actualizar el estado de mantenimiento.');
      }
      
      const currentStatus = this.getStatus();
      const newStatus = {
        ...currentStatus,
        ...statusPartial,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser
      };
      
      this.saveStatus(newStatus);
      Logger.log(`Estado de mantenimiento actualizado por: ${currentUser}`, newStatus);
      
      return newStatus;
    } catch (error) {
      Logger.error(`Error al actualizar estado de mantenimiento: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Verifica si un usuario es administrador.
   * @param {string} email Email del usuario
   * @returns {boolean} True si es admin, false si no
   */
  static isAdmin(email) {
    try {
      const props = PropertiesService.getScriptProperties();
      const adminEmails = props.getProperty('ADMIN_EMAILS');
      
      if (!adminEmails) {
        Logger.error('ADMIN_EMAILS no configurado en las propiedades del script');
        return false;
      }
      
      const adminList = adminEmails.split(',').map(e => e.trim().toLowerCase());
      return adminList.includes(email.trim().toLowerCase());
    } catch (error) {
      Logger.error(`Error al verificar permisos de admin: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Verifica si un usuario puede hacer bypass del mantenimiento.
   * @param {string} email Email del usuario
   * @returns {boolean} True si puede hacer bypass, false si no
   */
  static canUserBypass(email) {
    const status = this.getStatus();
    return status.allowAdmins && this.isAdmin(email);
  }
  
  /**
   * Verifica si una operación está permitida para un usuario.
   * Lanza excepción si no está permitida.
   * @param {string} email Email del usuario
   * @param {object} options Opciones de verificación
   */
  static assertOperationAllowed(email, options = {}) {
    const status = this.getStatus();
    
    // Si el mantenimiento no está activo, permitir todo
    if (!status.enabled) {
      return;
    }
    
    // Si el usuario puede hacer bypass, permitir todo
    if (this.canUserBypass(email)) {
      return;
    }
    
    // Verificar tipo de operación
    if (options.forLogin) {
      throw new Error(status.message || 'Sistema en mantenimiento. Intente más tarde.');
    }
    
    // Para otras operaciones, verificar modo
    if (status.mode === 'full') {
      throw new Error(status.message || 'Sistema en mantenimiento. Intente más tarde.');
    }
    
    // En modo read-only, bloquear operaciones de escritura
    if (status.mode === 'read-only' && options.forWrite) {
      throw new Error('Sistema en modo de solo lectura. Las operaciones de escritura están deshabilitadas temporalmente.');
    }
  }
  
  /**
   * Guarda el estado en PropertiesService.
   * @param {object} status Estado a guardar
   * @private
   */
  static saveStatus(status) {
    const props = PropertiesService.getScriptProperties();
    props.setProperty(this.MAINTENANCE_PROPERTY_KEY, JSON.stringify(status));
  }
  
  /**
   * Obtiene el estado por defecto.
   * @returns {object} Estado por defecto
   * @private
   */
  static getDefaultStatus() {
    return {
      enabled: false,
      mode: 'full',
      message: 'Sistema en mantenimiento. Intente más tarde.',
      allowAdmins: false,
      until: null,
      updatedAt: new Date().toISOString(),
      updatedBy: 'sistema'
    };
  }
}

// #region Endpoints públicos para el frontend

/**
 * Endpoint para obtener el estado de mantenimiento.
 * Accesible desde el frontend via google.script.run.
 * @returns {object} Estado actual del mantenimiento
 */
function getMaintenanceStatus() {
  try {
    return MaintenanceService.getStatus();
  } catch (error) {
    Logger.error(`Error en getMaintenanceStatus: ${error.message}`);
    throw new Error('Error al obtener el estado de mantenimiento.');
  }
}

/**
 * Endpoint para activar el modo mantenimiento.
 * Solo accesible por administradores.
 * @param {object} statusPartial Configuración del mantenimiento
 * @returns {object} Estado actualizado
 * 
 * Ejemplo de uso:
 * google.script.run.enableMaintenance({
 *   mode: 'full',
 *   message: 'Mantenimiento programado hasta las 14:00',
 *   allowAdmins: true,
 *   until: '2024-01-15T14:00:00.000Z'
 * });
 */
function enableMaintenance(statusPartial) {
  try {
    return MaintenanceService.enable(statusPartial);
  } catch (error) {
    Logger.error(`Error en enableMaintenance: ${error.message}`);
    throw error;
  }
}

/**
 * Endpoint para desactivar el modo mantenimiento.
 * Solo accesible por administradores.
 * @returns {object} Estado actualizado
 * 
 * Ejemplo de uso:
 * google.script.run.disableMaintenance();
 */
function disableMaintenance() {
  try {
    return MaintenanceService.disable();
  } catch (error) {
    Logger.error(`Error en disableMaintenance: ${error.message}`);
    throw error;
  }
}

// #endregion

/* 
EJEMPLOS DE USO:

1. Configurar administradores (en Script Properties):
   ADMIN_EMAILS = "admin1@empresa.com,admin2@empresa.com"

2. Activar mantenimiento completo:
   enableMaintenance({
     mode: 'full',
     message: 'Sistema en mantenimiento programado. Reiniciamos a las 14:00.',
     allowAdmins: true,
     until: '2024-01-15T14:00:00.000Z'
   });

3. Activar modo solo lectura:
   enableMaintenance({
     mode: 'read-only',
     message: 'Actualizando base de datos. Solo consulta disponible.',
     allowAdmins: false
   });

4. Desactivar mantenimiento:
   disableMaintenance();

5. Consultar estado actual:
   getMaintenanceStatus();
*/