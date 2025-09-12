// maintenance.js - Módulo de Mantenimiento para la aplicación
// Implementa el sistema de mantenimiento con bypass para administradores

/**
 * Servicio para manejar el estado de mantenimiento de la aplicación.
 * Utiliza PropertiesService para persistencia y CacheService para optimización.
 * 
 * Para activar mantenimiento:
 * enableMaintenance({ message: "Mensaje personalizado", mode: 'full'|'read-only', allowAdmins: true|false, until: 'YYYY-MM-DDTHH:mm:ssZ' })
 * 
 * Para desactivar mantenimiento:
 * disableMaintenance()
 * 
 * Configuración requerida:
 * - ADMIN_EMAILS en Script Properties: CSV de correos de administradores (ej: "admin1@empresa.com,admin2@empresa.com")
 */
class MaintenanceService {
  static PROPERTY_KEY = 'MAINTENANCE_STATUS';
  static CACHE_KEY = 'maintenance_status_cache';
  static CACHE_TTL = 300; // 5 minutos
  static DEFAULT_MESSAGE = 'La aplicación está en mantenimiento.';
  static ADMIN_EMAILS_KEY = 'ADMIN_EMAILS';

  /**
   * Obtiene el estado actual de mantenimiento
   * @returns {Object} DTO del estado de mantenimiento
   */
  static getStatus() {
    try {
      // Intentar obtener de caché primero
      const cache = CacheService.getScriptCache();
      const cachedStatus = cache.get(this.CACHE_KEY);
      
      if (cachedStatus) {
        return JSON.parse(cachedStatus);
      }

      // Si no está en caché, obtener de Properties y cachear
      const properties = PropertiesService.getScriptProperties();
      const storedStatus = properties.getProperty(this.PROPERTY_KEY);
      
      let status;
      if (storedStatus) {
        status = JSON.parse(storedStatus);
      } else {
        // Estado por defecto si no existe
        status = {
          enabled: false,
          mode: 'full',
          message: this.DEFAULT_MESSAGE,
          allowAdmins: true,
          until: null,
          updatedAt: new Date().toISOString(),
          updatedBy: null
        };
      }

      // Cachear el estado
      cache.put(this.CACHE_KEY, JSON.stringify(status), this.CACHE_TTL);
      return status;
    } catch (error) {
      Logger.error(`Error al obtener estado de mantenimiento: ${error.message}`);
      throw new Error('Error al verificar estado de mantenimiento');
    }
  }

  /**
   * Actualiza el estado de mantenimiento
   * @param {Object} statusPartial Datos parciales para actualizar
   * @param {string} userEmail Email del usuario que realiza la actualización
   */
  static updateStatus(statusPartial, userEmail) {
    try {
      const currentStatus = this.getStatus();
      const newStatus = {
        ...currentStatus,
        ...statusPartial,
        updatedAt: new Date().toISOString(),
        updatedBy: userEmail
      };

      // Validar estructura
      this._validateStatus(newStatus);

      // Guardar en Properties
      const properties = PropertiesService.getScriptProperties();
      properties.setProperty(this.PROPERTY_KEY, JSON.stringify(newStatus));

      // Actualizar caché
      const cache = CacheService.getScriptCache();
      cache.put(this.CACHE_KEY, JSON.stringify(newStatus), this.CACHE_TTL);

      Logger.log(`Estado de mantenimiento actualizado por ${userEmail}: ${JSON.stringify(statusPartial)}`);
      return newStatus;
    } catch (error) {
      Logger.error(`Error al actualizar estado de mantenimiento: ${error.message}`);
      throw error;
    }
  }

  /**
   * Activa el modo mantenimiento
   * @param {Object} config Configuración del mantenimiento
   * @param {string} userEmail Email del usuario que activa el mantenimiento
   */
  static enable(config = {}, userEmail) {
    const defaultConfig = {
      enabled: true,
      mode: 'full',
      message: this.DEFAULT_MESSAGE,
      allowAdmins: true,
      until: null
    };

    const finalConfig = { ...defaultConfig, ...config };
    return this.updateStatus(finalConfig, userEmail);
  }

  /**
   * Desactiva el modo mantenimiento
   * @param {string} userEmail Email del usuario que desactiva el mantenimiento
   */
  static disable(userEmail) {
    return this.updateStatus({ enabled: false }, userEmail);
  }

  /**
   * Verifica si un usuario es administrador
   * @param {string} email Email del usuario
   * @returns {boolean} True si es administrador
   */
  static isAdmin(email) {
    try {
      const properties = PropertiesService.getScriptProperties();
      const adminEmails = properties.getProperty(this.ADMIN_EMAILS_KEY);
      
      if (!adminEmails) {
        Logger.log('ADMIN_EMAILS no configurado en Script Properties');
        return false;
      }

      const adminList = adminEmails.split(',').map(email => email.trim().toLowerCase());
      const normalizedEmail = email.trim().toLowerCase();
      
      return adminList.includes(normalizedEmail);
    } catch (error) {
      Logger.error(`Error al verificar admin: ${error.message}`);
      return false;
    }
  }

  /**
   * Verifica si un usuario puede saltarse el mantenimiento
   * @param {string} email Email del usuario
   * @returns {boolean} True si puede saltarse
   */
  static canUserBypass(email) {
    const status = this.getStatus();
    
    // Si el mantenimiento no está activo, todos pueden acceder
    if (!status.enabled) {
      return true;
    }

    // Si no se permite a los admins saltarse, nadie puede
    if (!status.allowAdmins) {
      return false;
    }

    // Solo los admins pueden saltarse si allowAdmins es true
    return this.isAdmin(email);
  }

  /**
   * Verifica y arroja error si una operación no está permitida
   * @param {string} email Email del usuario
   * @param {Object} operation Tipo de operación (ej: { forLogin: true })
   */
  static assertOperationAllowed(email, operation = {}) {
    const status = this.getStatus();
    
    // Si el mantenimiento no está activo, permitir todas las operaciones
    if (!status.enabled) {
      return;
    }

    // Verificar si el usuario puede saltarse el mantenimiento
    if (this.canUserBypass(email)) {
      Logger.log(`Usuario admin ${email} accede durante mantenimiento`);
      return;
    }

    // Construir mensaje de error
    let errorMessage = status.message;
    if (status.until) {
      try {
        const untilDate = new Date(status.until);
        errorMessage += ` (hasta ${untilDate.toLocaleString('es-ES', { timeZone: 'America/Caracas' })})`;
      } catch (e) {
        // Si no se puede parsear la fecha, usar el mensaje sin fecha
      }
    }

    // Si es para login, mostrar mensaje específico
    if (operation.forLogin) {
      Logger.log(`Login bloqueado por mantenimiento para usuario no admin: ${email}`);
      throw new Error(errorMessage);
    }

    // Para otras operaciones
    throw new Error(errorMessage);
  }

  /**
   * Valida la estructura del estado de mantenimiento
   * @private
   */
  static _validateStatus(status) {
    if (typeof status.enabled !== 'boolean') {
      throw new Error('enabled debe ser boolean');
    }
    
    if (!['full', 'read-only'].includes(status.mode)) {
      throw new Error('mode debe ser "full" o "read-only"');
    }
    
    if (typeof status.message !== 'string' || status.message.trim() === '') {
      throw new Error('message debe ser una cadena no vacía');
    }
    
    if (typeof status.allowAdmins !== 'boolean') {
      throw new Error('allowAdmins debe ser boolean');
    }
    
    if (status.until !== null && typeof status.until !== 'string') {
      throw new Error('until debe ser string ISO8601 o null');
    }
  }
}

// #region Endpoints públicos para el frontend

/**
 * Endpoint público: Obtiene el estado de mantenimiento
 * @returns {Object} Estado actual de mantenimiento
 */
function getMaintenanceStatus() {
  try {
    return MaintenanceService.getStatus();
  } catch (error) {
    Logger.error(`Error en getMaintenanceStatus: ${error.message}`);
    // Retornar estado seguro en caso de error
    return {
      enabled: false,
      mode: 'full',
      message: MaintenanceService.DEFAULT_MESSAGE,
      allowAdmins: true,
      until: null,
      updatedAt: new Date().toISOString(),
      updatedBy: null
    };
  }
}

/**
 * Endpoint público: Activa el modo mantenimiento
 * Solo disponible para administradores autenticados
 * @param {Object} statusPartial Configuración parcial del mantenimiento
 * @returns {Object} Nuevo estado de mantenimiento
 */
function enableMaintenance(statusPartial = {}) {
  try {
    // Obtener usuario actual del contexto de ejecución
    const userEmail = Session.getActiveUser().getEmail();
    
    if (!userEmail) {
      throw new Error('Usuario no autenticado');
    }

    // Verificar permisos de administrador
    if (!MaintenanceService.isAdmin(userEmail)) {
      Logger.error(`Intento no autorizado de activar mantenimiento por: ${userEmail}`);
      throw new Error('No tiene permisos para activar el modo mantenimiento');
    }

    return MaintenanceService.enable(statusPartial, userEmail);
  } catch (error) {
    Logger.error(`Error en enableMaintenance: ${error.message}`);
    throw error;
  }
}

/**
 * Endpoint público: Desactiva el modo mantenimiento
 * Solo disponible para administradores autenticados
 * @returns {Object} Nuevo estado de mantenimiento
 */
function disableMaintenance() {
  try {
    // Obtener usuario actual del contexto de ejecución
    const userEmail = Session.getActiveUser().getEmail();
    
    if (!userEmail) {
      throw new Error('Usuario no autenticado');
    }

    // Verificar permisos de administrador
    if (!MaintenanceService.isAdmin(userEmail)) {
      Logger.error(`Intento no autorizado de desactivar mantenimiento por: ${userEmail}`);
      throw new Error('No tiene permisos para desactivar el modo mantenimiento');
    }

    return MaintenanceService.disable(userEmail);
  } catch (error) {
    Logger.error(`Error en disableMaintenance: ${error.message}`);
    throw error;
  }
}

// #endregion