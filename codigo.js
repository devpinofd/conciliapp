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
  'obtenerVendedoresPorUsuario': { headers: ['correo', 'cod_ven', 'nom_ven', 'codvendedor', 'vendedor_completo'] },
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
    headers: ['Correo', 'Contraseña', 'Estado', 'Fecha Registro']
  }
};

class DataFetcher {
  constructor() {
    this.api = new ApiHandler();
  }

  fetchVendedoresFromSheet() {
    const sheet = SheetManager.getSheet('obtenerVendedoresPorUsuario');
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    const data = sheet.getRange(2, 2, lastRow - 1, 2).getValues();
    return data.map(row => ({ nombre: String(row[0]).trim(), codigo: String(row[1]).trim() })).filter(v => v.nombre && v.codigo);
  }

 fetchClientesFromApi(codVendedor) {
    if (!codVendedor || typeof codVendedor !== 'string') {
      Logger.error(`Código de vendedor inválido: ${codVendedor}`);
      return [];
    }

    const safeCodVendedor = codVendedor.replace(/['"]/g, '');
    
    // Obtenemos la consulta de las propiedades del script
    const props = PropertiesService.getScriptProperties();
    const queryTemplate = props.getProperty('CLIENTES_QUERY');
    
    if (!queryTemplate) {
      Logger.error('La propiedad CLIENTES_QUERY no está definida.');
      throw new Error('No se encontró la consulta para cargar clientes.');
    }
    
    // Reemplazamos el marcador de posición con el código de vendedor
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

    // Obtenemos la consulta de las propiedades del script
    const props = PropertiesService.getScriptProperties();
    const queryTemplate = props.getProperty('FACTURAS_QUERY');
    
    if (!queryTemplate) {
      Logger.error('La propiedad FACTURAS_QUERY no está definida.');
      throw new Error('No se encontró la consulta para cargar facturas.');
    }
    
    // Reemplazamos los marcadores de posición con los códigos del vendedor y cliente
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

  static get userEmail() {
    return Session.getActiveUser().getEmail();
  }

  checkAccess() {
    const sheet = SheetManager.getSheet('CorreosPermitidos');
    const allowedEmails = sheet.getDataRange().getValues().flat();
    if (!allowedEmails.includes(CobranzaService.userEmail)) {
      Logger.error(`Acceso denegado para ${CobranzaService.userEmail}`);
      throw new Error('Acceso denegado: Correo no autorizado.');
    }
  }

  getVendedores(forceRefresh = false) {
    const vendedores = CacheManager.get(
      'vendedores_html',
      3600,
      () => this.dataFetcher.fetchVendedoresFromSheet()
    );
    return vendedores.map(v => `<option value="${v.codigo}">${v.nombre}</option>`).join('');
  }

  getClientesHtml(codVendedor) {
    const clientes = CacheManager.get(
      `clientes_${codVendedor}`,
      3600,
      () => this.dataFetcher.fetchClientesFromApi(codVendedor)
    );
    return clientes.map(c => `<option value="${c.codigo}">${c.nombre}</option>`).join('');
  }

  getFacturas(codVendedor, codCliente) {
    const facturas = CacheManager.get(
      `facturas_${codVendedor}_${codCliente}`,
      3600,
      () => this.dataFetcher.fetchFacturasFromApi(codVendedor, codCliente)
    );
    return facturas;
  }

  getBcvRate() {
    return CacheManager.get('bcv_rate', 3600, () => this.dataFetcher.fetchBcvRate());
  }

  getBancos() {
    return CacheManager.get('bancos', 86400, () => this.dataFetcher.fetchBancosFromSheet());
  }

  submitData(data) {
    this.checkAccess();
    const sheet = SheetManager.getSheet('Respuestas');
    let existingReferences = [];
    // Verificamos si la hoja tiene al menos 2 filas (encabezados + 1 fila de datos) antes de intentar leer.
    if (sheet.getLastRow() > 1) {
      existingReferences = sheet.getRange(2, 10, sheet.getLastRow() - 1, 1).getValues().flat();
    }
    
    if (existingReferences.includes(data.nroReferencia)) {
      throw new Error('El número de referencia ya existe.');
    }
    const row = [
      new Date(),
      data.vendedor,
      data.codigoCliente,
      data.nombreCliente,
      data.factura,
      parseFloat(data.montoPagado),
      data.formaPago,
      data.bancoEmisor,
      data.bancoReceptor,
      data.nroReferencia,
      data.tipoCobro,
      data.fechaTransferenciaPago,
      data.observaciones,
      CobranzaService.userEmail
    ];
    sheet.appendRow(row);
    Logger.log(`Formulario enviado. Factura: ${data.factura}`);
    return '¡Datos recibidos con éxito!';
  }

  getRecentRecords(vendedor = null) {
    const sheet = SheetManager.getSheet('Respuestas');
    if (sheet.getLastRow() <= 1) return [];
    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    let filteredValues = vendedor && vendedor !== 'Mostrar todos' ? values.filter(row => row[1] === vendedor) : values;
    
    return filteredValues.reverse().map((row, index) => {
      const originalIndex = values.findIndex(originalRow => originalRow === row) + 2;
      return {
        rowIndex: originalIndex,
        fechaEnvio: Utilities.formatDate(row[0], Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'),
        vendedor: row[1],
        clienteNombre: row[3],
        factura: row[4],
        monto: (typeof row[5] === 'number') ? row[5].toFixed(2) : row[5],
        bancoEmisor: row[7],
        bancoReceptor: row[8],
        referencia: row[9],
        creadoPor: row[13],
        puedeEliminar: (row[13] === CobranzaService.userEmail)
      };
    });
  }

  deleteRecord(rowIndex) {
    this.checkAccess();
    const sheet = SheetManager.getSheet('Respuestas');
    const rowToDelete = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (rowToDelete[13] !== CobranzaService.userEmail) {
      throw new Error('No tienes permiso para eliminar este registro.');
    }
    const auditSheet = SheetManager.getSheet('Registros Eliminados');
    auditSheet.appendRow([new Date(), CobranzaService.userEmail, ...rowToDelete]);
    sheet.deleteRow(rowIndex);
    Logger.log(`Registro eliminado. Fila: ${rowIndex}`);
    return 'Registro eliminado y archivado con éxito.';
  }
  
}
// #endregion

// #region Funciones públicas (Interfaz de la API de Apps Script)
const cobranzaService = new CobranzaService(new DataFetcher());

/**
 * Serves the correct HTML file based on user authentication status.
 *
 * This function is the entry point for the web app. It checks for a session property
 * to determine if the user is logged in.
 *
 * @return {HtmlOutput} The HtmlOutput object for the appropriate page.
 */
function doGet(e) {
  try {
    Logger.log(`[doGet] Iniciando doGet, parámetros: ${JSON.stringify(e)}`);
    const props = PropertiesService.getUserProperties();
    const isLoggedIn = props.getProperty('isLoggedIn');
    Logger.log(`[doGet] isLoggedIn: ${isLoggedIn}`);

    if (isLoggedIn === 'true') {
      Logger.log(`[doGet] Intentando cargar Index.html`);
      const mainTemplate = HtmlService.createHtmlOutputFromFile('Index');
      Logger.log(`[doGet] Index.html cargado correctamente`);
      return mainTemplate.setTitle('Formulario');
    } else {
      Logger.log(`[doGet] Intentando cargar Auth.html`);
      const authTemplate = HtmlService.createHtmlOutputFromFile('Auth');
      Logger.log(`[doGet] Auth.html cargado correctamente`);
      return authTemplate.setTitle('Autenticación');
    }
  } catch (e) {
    Logger.error(`[doGet] Error en doGet: ${e.message}`);
    return HtmlService.createHtmlOutput(`Error: ${e.message}`).setTitle('Error');
  }
}

/**
 * Llama al método getVendedores de la clase CobranzaService.
 * Esta función actúa como un puente para que el cliente (index.html) pueda llamarla.
 * @param {boolean} forceRefresh Fuerza la recarga de datos.
 * @return {Array<any[]>} Opciones HTML para el <select>.
 */
function loadVendedores(forceRefresh) {
  try {
    return cobranzaService.getVendedores(forceRefresh);
  } catch (e) {
    Logger.error(`Error en loadVendedores (global): ${e.message}`);
    throw new Error(`Error al cargar los vendedores: ${e.message}`);
  }
}

function cargarClientesEnPregunta1(codVendedor) {
  try {
    if (!codVendedor) {
      Logger.log('Advertencia: codVendedor no proporcionado a cargarClientesEnPregunta1.');
      return '<option value="" disabled selected>Seleccione un cliente</option>';
    }
    return cobranzaService.getClientesHtml(codVendedor);
  } catch (e) {
    Logger.error(`Error en cargarClientesEnPregunta1: ${e.message}`);
    throw new Error('Error al cargar clientes.');
  }
}

function obtenerFacturas(codVendedor, codCliente) {
  try {
    return cobranzaService.getFacturas(codVendedor, codCliente);
  } catch (e) {
    Logger.error(`Error en obtenerFacturas: ${e.message}`);
    throw new Error('Error al cargar facturas.');
  }
}

function obtenerTasaBCV() {
  try {
    return cobranzaService.getBcvRate();
  } catch (e) {
    Logger.error(`Error en obtenerTasaBCV: ${e.message}`);
    return null;
  }
}

function obtenerBancos() {
  try {
    return cobranzaService.getBancos();
  } catch (e) {
    Logger.error(`Error en obtenerBancos: ${e.message}`);
    return [];
  }
}

function enviarDatos(datos) {
  try {
    return cobranzaService.submitData(datos);
  } catch (e) {
    Logger.error(`Error en enviarDatos: ${e.message}`);
    throw new Error(`Error al enviar datos: ${e.message}`);
  }
}

function obtenerRegistrosEnviados(vendedorFiltro) {
  try {
    return cobranzaService.getRecentRecords(vendedorFiltro);
  } catch (e) {
    Logger.error(`Error en obtenerRegistrosEnviados: ${e.message}`);
    throw new Error(`Error al cargar registros: ${e.message}`);
  }
}

function eliminarRegistro(rowIndex) {
  try {
    return cobranzaService.deleteRecord(rowIndex);
  } catch (e) {
    Logger.error(`Error en eliminarRegistro: ${e.message}`);
    throw new Error(`Error al eliminar el registro: ${e.message}`);
  }
}

function sincronizarVendedoresDesdeApi() {
  const dataFetcher = new DataFetcher();
  const api = dataFetcher.api;
  const sheet = SheetManager.getSheet('obtenerVendedoresPorUsuario');
  
  const query = `SELECT TRIM(correo) AS correo, TRIM(cod_ven) AS codvendedor, CONCAT(TRIM(cod_ven), '-', TRIM(nom_ven)) AS vendedor_completo FROM vendedores;`;
  const vendedores = api.fetchData(query);
  
  if (vendedores && vendedores.length > 0) {
    sheet.getRange(2, 1, sheet.getLastRow(), sheet.getLastColumn()).clearContent();
    const values = vendedores.map(v => [v.correo, v.cod_ven, v.nom_ven, v.codvendedor, v.vendedor_completo]);
    sheet.getRange(2, 1, values.length, values[0].length).setValues(values);
    Logger.log(`Sincronización de vendedores completada. ${vendedores.length} registros actualizados.`);
    return `Sincronización completada. ${vendedores.length} vendedores actualizados.`;
  } else {
    Logger.log('Sincronización de vendedores: No se encontraron registros.');
    return 'No se encontraron vendedores para sincronizar.';
  }
}



/**
 * Almacena las consultas SQL en las propiedades del script.
 * Se debe ejecutar una única vez para configurar los valores iniciales.
 */
function setApiQueries() {
  const props = PropertiesService.getScriptProperties();

  // Consulta para obtener facturas
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
  
  // Consulta para obtener vendedores
  const vendedoresQuery = `SELECT TRIM(correo) AS correo, TRIM(cod_ven) AS cod_ven, TRIM(nom_ven) AS nom_ven, TRIM(cod_ven) AS codvendedor, CONCAT(TRIM(cod_ven), '-', TRIM(nom_ven)) AS vendedor_completo FROM vendedores;`;
  props.setProperty('VENDEDORES_QUERY', vendedoresQuery);
  
  // Consulta original para obtener clientes por vendedor
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

/**
 * Elimina todas las propiedades del script EXCEPTO las que se encuentran en un rango de índices.
 * Esta función está diseñada para ejecutarse automáticamente a la 1 AM todos los días.
 */
function conservarPrimerasPropiedades() {
  var ultimoIndiceAConservar = 6; // <- CAMBIA ESTE NÚMERO SI ES NECESARIO

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


/**
 * Configura el trigger para ejecutar conservarPrimerasPropiedades todos los días a la 1 AM.
 * Ejecuta esta función manualmente una vez para crear el trigger.
 */
function crearTriggerConservarPropiedades() {
  // Elimina triggers previos de este tipo para evitar duplicados
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'conservarPrimerasPropiedades') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  // Crea el trigger diario a la 1 AM
  ScriptApp.newTrigger('conservarPrimerasPropiedades')
    .timeBased()
    .atHour(1)
    .everyDays(1)
    .create();
}




// #endregion