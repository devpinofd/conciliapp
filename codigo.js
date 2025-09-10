/**
 * @fileoverview Lógica del servidor para la aplicación de cobranza.
 * Refactorizado con principios SOLID y mejores prácticas.
 */

/**
 * Elimina todas las propiedades del script EXCEPTO las primeras 7.
 * Esta función es llamada desde el cliente para limpiar datos temporales.
 */
function clearScriptProperties() {
  const ultimoIndiceAConservar = 6; // Conserva los índices del 0 al 6 (7 propiedades)

  const propiedades = PropertiesService.getScriptProperties();
  const todasLasClaves = propiedades.getKeys();
  todasLasClaves.sort();

  Logger.log('Iniciando limpieza de propiedades desde el cliente.');

  todasLasClaves.forEach((clave, indice) => {
    if (indice > ultimoIndiceAConservar) {
      propiedades.deleteProperty(clave);
      Logger.log(`Se eliminó la propiedad en el índice ${indice} (clave: "${clave}").`);
    }
  });

  Logger.log(`Proceso de limpieza completado. Se conservaron las primeras ${ultimoIndiceAConservar + 1} propiedades.`);
}

// #region Módulos de Utilidad
class Logger {
  static log(message, ...args) {
    console.log(message, ...args);
    this.appendLog('INFO', message);
  }
  static error(message, ...args) {
    console.error(message, ...args);
    this.appendLog('ERROR', message);
  }
  static appendLog(level, message) {
    // Asumimos que la sesión de script (el desarrollador) es quien ejecuta, 
    // pero para la auditoría, es mejor obtener el email del usuario desde el token si es posible.
    // Por ahora, mantenemos Session.getActiveUser() para la identidad del ejecutor del script.
    const sheet = SheetManager.getSheet('Auditoria');
    sheet.appendRow([new Date(), Session.getActiveUser().getEmail(), level, message]);
  }
}

class CacheManager {
  static get(key, ttlSeconds, fetchFunction, ...args) {
    const cache = PropertiesService.getScriptProperties();
    const cached = cache.getProperty(key);
    if (cached) {
      const { timestamp, data } = JSON.parse(cached);
      if (new Date().getTime() - timestamp < ttlSeconds * 1000) {
        return data;
      }
    }
    const data = fetchFunction(...args);
    cache.setProperty(key, JSON.stringify({ timestamp: new Date().getTime(), data }));
    return data;
  }
}

class ApiHandler {
  constructor() {
    const props = PropertiesService.getScriptProperties();
    this.API_URL = props.getProperty('API_URL') || 'https://login.factorysoftve.com/api/generica/efactoryApiGenerica.asmx/Seleccionar';
    this.headers = {
      apikey: props.getProperty('API_KEY'),
      usuario: props.getProperty('API_USER'),
      empresa: props.getProperty('API_EMPRESA')
    };

    if (!this.headers.apikey || !this.headers.usuario || !this.headers.empresa) {
      Logger.error('Faltan credenciales de la API en las propiedades del script.');
      throw new Error('Faltan credenciales de la API.');
    }
  }

  fetchData(query) {
    const options = {
      method: 'post',
      contentType: 'application/json; charset=utf-8',
      headers: this.headers,
      payload: JSON.stringify({ lcResultado: 'json2', lcConsulta: query }),
      muteHttpExceptions: false,
      validateHttpsCertificates: true
    };
    try {
      const response = UrlFetchApp.fetch(this.API_URL, options);
      if (response.getResponseCode() !== 200) {
        throw new Error(`Error HTTP: ${response.getResponseCode()} - ${response.getContentText()}`);
      }
      const jsonResponse = JSON.parse(response.getContentText());
      if (!jsonResponse.d || !jsonResponse.d.laTablas || jsonResponse.d.laTablas.length === 0) {
        return [];
      }
      return jsonResponse.d.laTablas[0];
    } catch (e) {
      Logger.error(`Error al llamar a la API: ${e.message}`, { query });
      throw e;
    }
  }
}
// #endregion

// #region Gestores de Datos (Dependencias)
class SheetManager {
  static getSheet(sheetName) {
    const ss = SpreadsheetApp.openById(this.SPREADSHEET_ID);
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet && this.SHEET_CONFIG[sheetName]?.headers) {
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, this.SHEET_CONFIG[sheetName].headers.length).setValues([this.SHEET_CONFIG[sheetName].headers]);
    }
    if (!sheet) {
      throw new Error(`Hoja ${sheetName} no encontrada y no se pudo crear.`);
    }
    return sheet;
  }
}
SheetManager.SPREADSHEET_ID = '11J6Yo2LdR5fuNu1WCf2sHXUqLlDfFAx60t3CreIMNuE';
SheetManager.SHEET_CONFIG = {
  'CorreosPermitidos': { headers: null },
  'obtenerVendedoresPorUsuario': { headers: ['correo', 'vendedorcompleto', 'codvendedor'] },
  'Administradores': { headers: ['correo_admin'] },
  'Bancos': { headers: ['Nombre del Banco'] },
  'Respuestas': {
    headers: ['Timestamp', 'Vendedor', 'Codigo Cliente', 'Nombre Cliente', 'Factura',
      'Monto Pagado', 'Forma de Pago', 'Banco Emisor', 'Banco Receptor',
      'Nro. de Referencia', 'Tipo de Cobro', 'Fecha de la Transferencia o Pago',
      'Observaciones', 'Usuario Creador']
  },
  'Auditoria': { headers: ['Timestamp', 'Usuario', 'Nivel', 'Detalle'] },
  'Registros Eliminados': {
    headers: ['Fecha Eliminación', 'Usuario que Eliminó', 'Timestamp', 'Vendedor',
      'Codigo Cliente', 'Nombre Cliente', 'Factura', 'Monto Pagado',
      'Forma de Pago', 'Banco Emisor', 'Banco Receptor', 'Nro. de Referencia',
      'Tipo de Cobro', 'Fecha de la Transferencia o Pago', 'Observaciones', 'Usuario Creador']
  },
  'Usuarios': {
    headers: ['Correo', 'Contraseña', 'Estado', 'Nombre', 'Fecha Registro'] // Añadido Nombre
  }
};

class DataFetcher {
  constructor() {
    this.api = new ApiHandler();
  }

  fetchVendedoresFromSheetByUser(userEmail) {
    if (!userEmail) {
      Logger.error('Se intentó llamar a fetchVendedoresFromSheetByUser sin un email.');
      return [];
    }
    const normalizedUserEmail = userEmail.trim().toLowerCase();
    const sheet = SheetManager.getSheet('obtenerVendedoresPorUsuario');
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];

    const data = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
    const vendedoresFiltrados = data
      .map(row => ({
        email: String(row[0]).trim().toLowerCase(),
        nombre: String(row[1]).trim(),
        codigo: String(row[2]).trim()
      }))
      .filter(v => v.email === normalizedUserEmail && v.nombre && v.codigo);

    if (vendedoresFiltrados.length === 0) {
      Logger.log(`No se encontraron vendedores para el usuario: ${userEmail}`);
    }
    return vendedoresFiltrados;
  }

  fetchAllVendedoresFromSheet() {
    const sheet = SheetManager.getSheet('obtenerVendedoresPorUsuario');
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    const data = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
    return data
      .map(row => ({
        nombre: String(row[1]).trim(),
        codigo: String(row[2]).trim()
      }))
      .filter(v => v.nombre && v.codigo);
  }

  isUserAdmin(userEmail) {
    if (!userEmail) return false;
    const normalizedUserEmail = userEmail.trim().toLowerCase();
    const sheet = SheetManager.getSheet('Administradores');
    if (sheet.getLastRow() < 2) return false;
    const adminEmails = sheet.getRange("A2:A" + sheet.getLastRow()).getValues().flat().map(email => email.trim().toLowerCase());
    return adminEmails.includes(normalizedUserEmail);
  }

  fetchClientesFromApi(codVendedor) {
    if (!codVendedor || typeof codVendedor !== 'string') {
      Logger.error(`Código de vendedor inválido: ${codVendedor}`);
      return [];
    }
    const safeCodVendedor = codVendedor.replace(/['"]/g, '');
    const props = PropertiesService.getScriptProperties();
    const queryTemplate = props.getProperty('CLIENTES_QUERY');
    if (!queryTemplate) {
      Logger.error('La propiedad CLIENTES_QUERY no está definida.');
      throw new Error('No se encontró la consulta para cargar clientes.');
    }
    const query = queryTemplate.replace(/{codVendedor}/g, safeCodVendedor);
    try {
      const data = this.api.fetchData(query);
      return data.map(row => ({
        nombre: String(row.Nombre).trim(),
        codigo: String(row.Codigo_Cliente).trim()
      }));
    } catch (e) {
      Logger.error(`Error en fetchClientesFromApi: ${e.message}`, { query });
      return [];
    }
  }

  fetchFacturasFromApi(codVendedor, codCliente) {
    if (!codVendedor || !codCliente || typeof codVendedor !== 'string' || typeof codCliente !== 'string') {
      Logger.error(`Parámetros inválidos: codVendedor=${codVendedor}, codCliente=${codCliente}`);
      return [];
    }
    const safeCodVendedor = codVendedor.replace(/['"]/g, '');
    const safeCodCliente = codCliente.replace(/['"]/g, '');
    const props = PropertiesService.getScriptProperties();
    const queryTemplate = props.getProperty('FACTURAS_QUERY');
    if (!queryTemplate) {
      Logger.error('La propiedad FACTURAS_QUERY no está definida.');
      throw new Error('No se encontró la consulta para cargar facturas.');
    }
    const query = queryTemplate.replace(/{safeCodCliente}/g, safeCodCliente).replace(/{safeCodVendedor}/g, safeCodVendedor);
    try {
      const data = this.api.fetchData(query);
      return data.map(row => ({
        documento: String(row.documento).trim(),
        mon_sal: parseFloat(row.mon_sal) || 0,
        fec_ini: row.fec_ini ? new Date(row.fec_ini).toISOString().split('T')[0] : '',
        cod_mon: String(row.cod_mon).trim() || 'USD'
      }));
    } catch (e) {
      Logger.error(`Error en fetchFacturasFromApi: ${e.message}`, { query });
      return [];
    }
  }

  fetchBcvRate() {
    const apiUrl = 'https://ve.dolarapi.com/v1/dolares/oficial';
    try {
      const response = UrlFetchApp.fetch(apiUrl, { muteHttpExceptions: true });
      if (response.getResponseCode() !== 200) {
        Logger.error(`Error en fetchBcvRate: Código ${response.getResponseCode()}`);
        return 1;
      }
      const jsonResponse = JSON.parse(response.getContentText());
      const rate = parseFloat(jsonResponse.promedio);
      if (isNaN(rate) || rate <= 0) {
        Logger.error('Tasa BCV inválida');
        return 1;
      }
      return rate;
    } catch (e) {
      Logger.error(`Error en fetchBcvRate: ${e.message}`);
      return 1;
    }
  }

  fetchBancosFromSheet() {
    const sheet = SheetManager.getSheet('Bancos');
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      Logger.log('No se encontraron bancos en la hoja.');
      return [];
    }
    const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    return data
      .map(row => ({
        nombre: String(row[0]).trim(),
        codigo: String(row[0]).trim()
      }))
      .filter(b => b.nombre && b.codigo);
  }
}

class CobranzaService {
  constructor(dataFetcher) {
    this.dataFetcher = dataFetcher;
  }

  // Obtenemos el email del usuario que ejecuta el script, no de la sesión web.
  static get scriptUserEmail() {
    return Session.getActiveUser().getEmail();
  }

  // El email del usuario logueado en la app. Se debe pasar como parámetro.
  getVendedores(userEmail, forceRefresh = false) {
    if (!userEmail) {
      throw new Error("No se pudo obtener el email del usuario para cargar los vendedores.");
    }
    
    const isAdmin = this.dataFetcher.isUserAdmin(userEmail);
    const cacheKey = `vendedores_html_${isAdmin ? 'admin' : userEmail}`;
    
    const fetchFunction = () => {
        let vendedores;
        if (isAdmin) {
            Logger.log(`Usuario ${userEmail} es administrador. Obteniendo todos los vendedores.`);
            vendedores = this.dataFetcher.fetchAllVendedoresFromSheet();
        } else {
            Logger.log(`Usuario ${userEmail} es un vendedor. Obteniendo sus vendedores asignados.`);
            vendedores = this.dataFetcher.fetchVendedoresFromSheetByUser(userEmail);
        }

        if (vendedores.length === 0) {
            throw new Error(`No tiene vendedores asignados. Por favor, contacte al administrador.`);
        }
        
        let optionsHtml = isAdmin ? '<option value="Mostrar todos">Mostrar todos</option>' : '';
        optionsHtml += vendedores.map(v => `<option value="${v.codigo}">${v.nombre}</option>`).join('');
        return optionsHtml;
    };

    if (forceRefresh) {
      const data = fetchFunction();
      PropertiesService.getScriptProperties().setProperty(cacheKey, JSON.stringify({ timestamp: new Date().getTime(), data }));
      return data;
    }

    return CacheManager.get(cacheKey, 3600, fetchFunction);
  }

  getClientesHtml(codVendedor) {
    const clientes = CacheManager.get(
      `clientes_${codVendedor}`, 3600, () => this.dataFetcher.fetchClientesFromApi(codVendedor)
    );
    return clientes.map(c => `<option value="${c.codigo}">${c.nombre}</option>`).join('');
  }

  getFacturas(codVendedor, codCliente) {
    const facturas = CacheManager.get(
      `facturas_${codVendedor}_${codCliente}`, 3600, () => this.dataFetcher.fetchFacturasFromApi(codVendedor, codCliente)
    );
    return facturas;
  }

  getBcvRate() {
    return CacheManager.get('bcv_rate', 3600, () => this.dataFetcher.fetchBcvRate());
  }

  getBancos() {
    return CacheManager.get('bancos', 86400, () => this.dataFetcher.fetchBancosFromSheet());
  }

  submitData(data, userEmail) {
    const sheet = SheetManager.getSheet('Respuestas');
    let existingReferences = [];
    if (sheet.getLastRow() > 1) {
      existingReferences = sheet.getRange(2, 10, sheet.getLastRow() - 1, 1).getValues().flat();
    }
    
    if (existingReferences.includes(data.nroReferencia)) {
      throw new Error('El número de referencia ya existe.');
    }
    const row = [
      new Date(), data.vendedor, data.cliente, data.nombreCliente, data.factura,
      parseFloat(data.montoPagado), data.formaPago, data.bancoEmisor, data.bancoReceptor,
      data.nroReferencia, data.tipoCobro, data.fechaTransferenciaPago, data.observaciones, userEmail
    ];
    sheet.appendRow(row);
    Logger.log(`Formulario enviado por ${userEmail}. Factura: ${data.factura}`);
    return '¡Datos recibidos con éxito!';
  }

  getRecentRecords(vendedor, userEmail) {
    const sheet = SheetManager.getSheet('Respuestas');
    if (sheet.getLastRow() <= 1) return [];
    
    const isAdmin = this.dataFetcher.isUserAdmin(userEmail);
    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    let filteredValues;

    if (isAdmin) {
        filteredValues = vendedor && vendedor !== 'Mostrar todos' ? values.filter(row => row[1] === vendedor) : values;
    } else {
        const misVendedores = this.dataFetcher.fetchVendedoresFromSheetByUser(userEmail).map(v => v.codigo);
        filteredValues = values.filter(row => misVendedores.includes(row[1]));
    }
    
    return filteredValues.reverse().map((row) => {
      const originalIndex = values.findIndex(originalRow => originalRow.every((val, i) => val === row[i])) + 2;
      return {
        rowIndex: originalIndex, fechaEnvio: Utilities.formatDate(row[0], Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'),
        vendedor: row[1], clienteNombre: row[3], factura: row[4],
        monto: (typeof row[5] === 'number') ? row[5].toFixed(2) : row[5],
        bancoEmisor: row[7], bancoReceptor: row[8], referencia: row[9], creadoPor: row[13],
        puedeEliminar: (row[13] === userEmail)
      };
    });
  }

  deleteRecord(rowIndex, userEmail) {
    const sheet = SheetManager.getSheet('Respuestas');
    const rowToDelete = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (rowToDelete[13] !== userEmail) {
      throw new Error('No tienes permiso para eliminar este registro.');
    }
    const auditSheet = SheetManager.getSheet('Registros Eliminados');
    auditSheet.appendRow([new Date(), userEmail, ...rowToDelete]);
    sheet.deleteRow(rowIndex);
    Logger.log(`Registro eliminado por ${userEmail}. Fila: ${rowIndex}`);
    return 'Registro eliminado y archivado con éxito.';
  }

  getFilteredRecords(dateFilter, userEmail) {
    const sheet = SheetManager.getSheet('Respuestas');
    if (sheet.getLastRow() <= 1) return [];
    
    const isAdmin = this.dataFetcher.isUserAdmin(userEmail);
    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    
    // Filter by user permissions first
    let filteredValues;
    if (isAdmin) {
      filteredValues = values;
    } else {
      const misVendedores = this.dataFetcher.fetchVendedoresFromSheetByUser(userEmail).map(v => v.codigo);
      filteredValues = values.filter(row => misVendedores.includes(row[1]));
    }
    
    // Filter by date
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    return filteredValues.filter(row => {
      const rowDate = new Date(row[0]);
      const rowDay = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate());
      
      if (dateFilter === 'hoy') {
        return rowDay.getTime() === today.getTime();
      } else if (dateFilter === 'ayer') {
        return rowDay.getTime() === yesterday.getTime();
      }
      return false;
    });
  }

  createXlsFile(records, dateFilter) {
    const spreadsheet = SpreadsheetApp.create(`Cobranzas_${dateFilter}_${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm')}`);
    const sheet = spreadsheet.getActiveSheet();
    
    // Set headers
    const headers = ['Fecha', 'Vendedor', 'Código Cliente', 'Nombre Cliente', 'Factura',
                     'Monto Pagado', 'Forma de Pago', 'Banco Emisor', 'Banco Receptor',
                     'Nro. de Referencia', 'Tipo de Cobro', 'Fecha de Transferencia',
                     'Observaciones', 'Usuario Creador'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Add data
    if (records.length > 0) {
      const formattedRecords = records.map(row => [
        Utilities.formatDate(row[0], Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'),
        row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], 
        row[9], row[10], row[11], row[12], row[13]
      ]);
      sheet.getRange(2, 1, formattedRecords.length, headers.length).setValues(formattedRecords);
    }
    
    // Style the header
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, headers.length);
    
    return DriveApp.getFileById(spreadsheet.getId());
  }

  createPdfFile(records, dateFilter) {
    const spreadsheet = SpreadsheetApp.create(`Cobranzas_PDF_${dateFilter}_${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm')}`);
    const sheet = spreadsheet.getActiveSheet();
    
    // Set title
    sheet.getRange(1, 1).setValue(`Registros de Cobranzas - ${dateFilter === 'hoy' ? 'Hoy' : 'Ayer'}`);
    sheet.getRange(1, 1).setFontSize(16).setFontWeight('bold');
    
    // Set headers
    const headers = ['Fecha', 'Vendedor', 'Cliente', 'Factura', 'Monto', 'Banco Emisor', 'Banco Receptor', 'Referencia'];
    sheet.getRange(3, 1, 1, headers.length).setValues([headers]);
    
    // Add data (simplified for PDF readability)
    if (records.length > 0) {
      const formattedRecords = records.map(row => [
        Utilities.formatDate(row[0], Session.getScriptTimeZone(), 'dd/MM/yyyy'),
        row[1], row[3], row[4], 
        `$${parseFloat(row[5]).toFixed(2)}`, 
        row[7], row[8], row[9]
      ]);
      sheet.getRange(4, 1, formattedRecords.length, headers.length).setValues(formattedRecords);
    }
    
    // Style the header
    const headerRange = sheet.getRange(3, 1, 1, headers.length);
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, headers.length);
    
    // Add summary
    const summaryRow = 4 + records.length + 1;
    sheet.getRange(summaryRow, 1).setValue(`Total de registros: ${records.length}`);
    sheet.getRange(summaryRow, 1).setFontWeight('bold');
    
    // Convert to PDF
    const blob = DriveApp.getFileById(spreadsheet.getId()).getBlob().getAs('application/pdf');
    const pdfFile = DriveApp.createFile(blob.setName(`Cobranzas_${dateFilter}_${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm')}.pdf`));
    
    // Clean up the temporary spreadsheet
    DriveApp.getFileById(spreadsheet.getId()).setTrashed(true);
    
    return pdfFile;
  }
}
// #endregion

// #region Funciones públicas (Interfaz de la API de Apps Script)
const cobranzaService = new CobranzaService(new DataFetcher());

function getWebAppUrl() {
  return ScriptApp.getService().getUrl();
}

/**
 * Función principal que se ejecuta al cargar la aplicación web.
 * Ahora valida un token de sesión para decidir qué página mostrar.
 * @param {object} e El objeto de evento de la solicitud GET.
 */
function doGet(e) {
  const token = e.parameter.token;
  const url = getWebAppUrl();
  let user = null;

  if (token) {
    user = checkAuth(token); // Llama a la función de validación de token en auth.js
  }

  if (user) {
    // Si el token es válido y tenemos un usuario, muestra la página principal.
    const template = HtmlService.createTemplateFromFile('Index');
    template.user = user;
    template.url = url;
    template.token = token; // Pasamos el token a la página principal
    return template.evaluate()
      .setTitle('Registro de Cobranzas')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
  } else {
    // Si no hay token o no es válido, muestra la página de login.
    const template = HtmlService.createTemplateFromFile('Auth');
    template.url = url;
    return template.evaluate()
      .setTitle('Iniciar Sesión - Registro de Cobranzas')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Las funciones públicas ahora deben validar el token
function withAuth(token, action) {
  const user = checkAuth(token);
  if (!user) {
    throw new Error("Sesión inválida o expirada. Por favor, inicie sesión de nuevo.");
  }
  return action(user);
}

function loadVendedores(token, forceRefresh) {
  return withAuth(token, (user) => {
    return cobranzaService.getVendedores(user.email, forceRefresh);
  });
}

function cargarClientesEnPregunta1(token, codVendedor) {
  return withAuth(token, () => {
    if (!codVendedor) {
      Logger.log('Advertencia: codVendedor no proporcionado a cargarClientesEnPregunta1.');
      return '<option value="" disabled selected>Seleccione un cliente</option>';
    }
    return cobranzaService.getClientesHtml(codVendedor);
  });
}

function obtenerFacturas(token, codVendedor, codCliente) {
  return withAuth(token, () => {
    return cobranzaService.getFacturas(codVendedor, codCliente);
  });
}

function obtenerTasaBCV(token) {
  return withAuth(token, () => {
    return cobranzaService.getBcvRate();
  });
}

function obtenerBancos(token) {
  return withAuth(token, () => {
    return cobranzaService.getBancos();
  });
}

function enviarDatos(token, datos) {
  return withAuth(token, (user) => {
    return cobranzaService.submitData(datos, user.email);
  });
}

function obtenerRegistrosEnviados(token, vendedorFiltro) {
  return withAuth(token, (user) => {
    return cobranzaService.getRecentRecords(vendedorFiltro, user.email);
  });
}

function eliminarRegistro(token, rowIndex) {
  return withAuth(token, (user) => {
    return cobranzaService.deleteRecord(rowIndex, user.email);
  });
}

function downloadRecords(token, dateFilter, format) {
  return withAuth(token, (user) => {
    // Validate inputs
    if (!dateFilter || !['hoy', 'ayer'].includes(dateFilter)) {
      throw new Error('Filtro de fecha inválido. Use "hoy" o "ayer".');
    }
    
    if (!format || !['xls', 'pdf'].includes(format)) {
      throw new Error('Formato inválido. Use "xls" o "pdf".');
    }
    
    const records = cobranzaService.getFilteredRecords(dateFilter, user.email);
    
    if (records.length === 0) {
      const dateText = dateFilter === 'hoy' ? 'hoy' : 'ayer';
      throw new Error(`No se encontraron registros de cobranzas para ${dateText}.`);
    }
    
    let file;
    try {
      if (format === 'xls') {
        file = cobranzaService.createXlsFile(records, dateFilter);
      } else if (format === 'pdf') {
        file = cobranzaService.createPdfFile(records, dateFilter);
      }
      
      Logger.log(`Usuario ${user.email} descargó ${records.length} registros en formato ${format.toUpperCase()} para ${dateFilter}`);
      
      // Return the download URL
      return {
        type: 'url',
        url: file.getDownloadUrl(),
        filename: file.getName(),
        recordCount: records.length
      };
    } catch (error) {
      Logger.error(`Error generando archivo ${format} para ${user.email}: ${error.message}`);
      throw new Error(`Error al generar el archivo ${format.toUpperCase()}. Intente nuevamente.`);
    }
  });
}

// Las funciones sin autenticación no necesitan cambios
function sincronizarVendedoresDesdeApi() {
  const dataFetcher = new DataFetcher();
  const api = dataFetcher.api;
  const sheet = SheetManager.getSheet('obtenerVendedoresPorUsuario');
  
  const query = `SELECT TRIM(correo) AS correo, TRIM(cod_ven) AS codvendedor, CONCAT(TRIM(cod_ven), '-', TRIM(nom_ven)) AS vendedor_completo FROM vendedores;`;
  const vendedores = api.fetchData(query);
  
  if (vendedores && vendedores.length > 0) {
    sheet.getRange(2, 1, sheet.getLastRow(), sheet.getLastColumn()).clearContent();
    const values = vendedores.map(v => [v.correo, v.vendedor_completo, v.codvendedor]);
    sheet.getRange(2, 1, values.length, values[0].length).setValues(values);
    Logger.log(`Sincronización de vendedores completada. ${vendedores.length} registros actualizados.`);
    return `Sincronización completada. ${vendedores.length} vendedores actualizados.`;
  } else {
    Logger.log('Sincronización de vendedores: No se encontraron registros.');
    return 'No se encontraron vendedores para sincronizar.';
  }
}

function setApiQueries() {
  const props = PropertiesService.getScriptProperties();

  const facturasQuery = `SELECT 
      TRIM(cc.documento) AS documento,
      CAST((cc.mon_net * cc.tasa) AS DECIMAL(18,2)) AS mon_sal,
      CAST(cc.fec_ini AS DATE) AS fec_ini,
      'USD' AS cod_mon
    FROM cuentas_cobrar cc
    JOIN clientes c ON c.cod_cli = cc.cod_cli
    WHERE cc.cod_tip = 'FACT' 
      AND cc.cod_cli = '{safeCodCliente}' 
      AND cc.cod_ven = '{safeCodVendedor}' 
      ORDER BY cc.fec_ini DESC`;
  props.setProperty('FACTURAS_QUERY', facturasQuery);
  
  const vendedoresQuery = `SELECT TRIM(correo) AS correo, TRIM(cod_ven) AS cod_ven, TRIM(nom_ven) AS nom_ven, TRIM(cod_ven) AS codvendedor, CONCAT(TRIM(cod_ven), '-', TRIM(nom_ven)) AS vendedor_completo FROM vendedores;`;
  props.setProperty('VENDEDORES_QUERY', vendedoresQuery);
  
  const clientesQuery = `SELECT DISTINCT TRIM(COD_CLI) AS Codigo_Cliente, TRIM(NOM_CLI) AS Nombre 
FROM (
    SELECT COD_CLI, NOM_CLI 
    FROM CLIENTES 
    WHERE COD_VEN = '{codVendedor}' 
    UNION 
    SELECT precios_clientes.COD_REG AS Codigo_Cliente, clientes.NOM_CLI AS Nombre
    FROM precios_clientes 
    JOIN CLIENTES ON clientes.COD_CLI = precios_clientes.COD_REG 
    WHERE precios_clientes.COD_ART = '{codVendedor}' 
 ) AS Combinada 
 ORDER BY TRIM(NOM_CLI) ASC`;
  props.setProperty('CLIENTES_QUERY', clientesQuery);
}

function conservarPrimerasPropiedades() {
  var ultimoIndiceAConservar = 6;

  var propiedades = PropertiesService.getScriptProperties();
  var todasLasClaves = propiedades.getKeys();
  todasLasClaves.sort();

  Logger.log('Lista de propiedades antes de eliminar (ordenadas):');
  todasLasClaves.forEach(function(clave, indice) {
    var estado = (indice <= ultimoIndiceAConservar) ? 'Se conservará' : 'Se eliminará';
    Logger.log('%s: %s (%s)', indice, clave, estado);
  });

  todasLasClaves.forEach(function(clave, indice) {
    if (indice > ultimoIndiceAConservar) {
      propiedades.deleteProperty(clave);
      Logger.log('ÉXITO: Se eliminó la propiedad en el índice %s (clave: "%s").', indice, clave);
    }
  });

  Logger.log('¡Proceso completado! Solo se conservaron las primeras %s propiedades.', ultimoIndiceAConservar + 1);
}

function crearTriggerConservarPropiedades() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'conservarPrimerasPropiedades') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger('conservarPrimerasPropiedades')
    .timeBased()
    .atHour(1)
    .everyDays(1)
    .create();
}
// #endregion