/**
 * @fileoverview Lógica de autenticación para registro y login sin 2FA.
 * Valida usuarios contra la hoja 'obtenerVendedoresPorUsuario' y usa hashing seguro.
 */

/**
 * Clase para manejar autenticación de usuarios.
 */
class AuthManager {
  /**
   * Valida si un correo electrónico existe en la hoja 'obtenerVendedoresPorUsuario'.
   * @param {string} email El correo electrónico a buscar.
   * @return {boolean} true si el correo existe en la hoja.
   */
  static validateUserInVendedoresSheet(email) {
    try {
      const sheet = SheetManager.getSheet('obtenerVendedoresPorUsuario');
      const data = sheet.getDataRange().getValues();
      const headers = data.shift();
      const emailIndex = headers.indexOf('correo');

      if (emailIndex === -1) {
        throw new Error('La columna "correo" no se encontró en la hoja "obtenerVendedoresPorUsuario".');
      }

      const existingEmails = data.map(row => String(row[emailIndex]).trim().toLowerCase());
      return existingEmails.includes(email.toLowerCase());
    } catch (e) {
      Logger.error(`Error al validar usuario en hoja de vendedores: ${e.message}`);
      return false;
    }
  }

  /**
   * Hashea una contraseña usando HMAC-SHA256 con una clave secreta.
   * @param {string} password La contraseña a hashear.
   * @return {string} La contraseña hasheada en Base64.
   */
  static hashPassword(password) {
    try {
      const props = PropertiesService.getScriptProperties();
      const key = props.getProperty('SECRET_KEY') || 'mi_llave_secreta_super_segura';
      const hash = Utilities.computeHmacSha256Signature(password, key);
      return Utilities.base64Encode(hash);
    } catch (e) {
      Logger.error(`Error al hashear contraseña: ${e.message}`);
      throw new Error('Error al procesar la contraseña.');
    }
  }

  /**
   * Registra un nuevo usuario en la hoja 'Usuarios'.
   * @param {string} email El correo electrónico del usuario.
   * @param {string} password La contraseña.
   * @return {string} Mensaje de confirmación.
   */
  static registerUser(email, password) {
  try {
    Logger.log(`[Registro] Iniciando registro para: ${email}`);
    Logger.log(`[Registro] Validando correo en obtenerVendedoresPorUsuario`);
    if (!this.validateUserInVendedoresSheet(email)) {
      Logger.log(`[Registro] Correo ${email} no encontrado en obtenerVendedoresPorUsuario`);
      throw new Error('Usuario no autorizado. El correo no existe en la base de datos de vendedores.');
    }

    const sheet = SheetManager.getSheet('Usuarios');
    Logger.log(`[Registro] Hoja Usuarios obtenida: ${sheet.getName()}`);
    const lastRow = sheet.getLastRow();
    let data = [];
    if (lastRow > 1) {
      data = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    }
    Logger.log(`[Registro] Correos existentes: ${data}`);
    const normalizedEmail = email.toLowerCase();

    if (data.includes(normalizedEmail)) {
      Logger.log(`[Registro] Correo ${normalizedEmail} ya registrado`);
      throw new Error('El correo ya está registrado.');
    }

    const hashedPassword = this.hashPassword(password);
    Logger.log(`[Registro] Contraseña hasheada: ${hashedPassword}`);
    const date = new Date();
    Logger.log(`[Registro] Añadiendo fila: [${normalizedEmail}, ${hashedPassword}, 'activo', ${date}]`);
    sheet.appendRow([normalizedEmail, hashedPassword, 'activo', date]);
    Logger.log(`[Registro] Fila añadida para ${email} en la hoja Usuarios`);

    Logger.log(`[Registro] Usuario ${email} registrado con éxito`);
    return 'Registro completado. Puedes iniciar sesión.';
  } catch (e) {
    Logger.error(`[Registro] Error al registrar usuario ${email}: ${e.message}`);
    throw new Error(`Error: ${e.message}`);
  }
}
  /**
   * Procesa el intento de inicio de sesión.
   * @param {string} email El correo del usuario.
   * @param {string} password La contraseña.
   * @return {string} 'SUCCESS' si es exitoso.
   */
  static processLogin(email, password) {
    try {
      const sheet = SheetManager.getSheet('Usuarios');
      const data = sheet.getDataRange().getValues();
      const headers = data.shift();
      const emailIndex = headers.indexOf('Correo');
      const passwordIndex = headers.indexOf('Contraseña');
      const statusIndex = headers.indexOf('Estado');

      if (emailIndex === -1 || passwordIndex === -1 || statusIndex === -1) {
        throw new Error('Formato de hoja "Usuarios" incorrecto.');
      }

      const normalizedEmail = email.toLowerCase();
      const userRow = data.find(row => String(row[emailIndex]).toLowerCase() === normalizedEmail);

      if (!userRow) {
        throw new Error('Usuario no encontrado.');
      }

      const storedHashedPassword = userRow[passwordIndex];
      const hashedPassword = this.hashPassword(password);

      if (hashedPassword !== storedHashedPassword) {
        throw new Error('Contraseña incorrecta.');
      }

      if (userRow[statusIndex] !== 'activo') {
        throw new Error('Cuenta no activa. Contacta al administrador.');
      }

      Logger.log(`Login exitoso para: ${email}`);
      PropertiesService.getUserProperties().setProperty('isLoggedIn', 'true');
      return 'SUCCESS';
    } catch (e) {
      Logger.error(`Error en login para ${email}: ${e.message}`);
      throw new Error(`Error: ${e.message}`);
    }
  }
}

// Interfaz para el cliente (funciona con google.script.run)
/**
 * Registra un nuevo usuario.
 * @param {string} email Correo del usuario.
 * @param {string} password Contraseña.
 * @return {string} Mensaje de resultado.
 */
function registerUser(email, password) {
  try {
    return AuthManager.registerUser(email, password);
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

/**
 * Procesa el inicio de sesión.
 * @param {string} email Correo del usuario.
 * @param {string} password Contraseña.
 * @return {string} Resultado del login.
 */
function processLogin(email, password) {
  try {
    return AuthManager.processLogin(email, password);
  } catch (e) {
    return `Error: ${e.message}`;
  }
}