# Bitácora de Cobranza (Logging Operativo & Auditoría)

## 1. Propósito
Implementar una bitácora estructurada para registrar, auditar y consultar todas las acciones, incidencias y decisiones asociadas a:
- Sobres (envelopes) de cobranza.
- Pagos / transferencias.
- Facturas.
- Clientes.
- Gestión de saldos a favor (créditos).

La bitácora debe:
- Ser inmutable (solo se agregan entradas nuevas).
- Permitir trazabilidad y auditoría.
- Servir como base para reportes (KPIs, cumplimiento, riesgos).
- Preparar migración futura a Firestore sin pérdida de historial.

---

## 2. Alcance Inicial
Fase 1 (Sheets):
- Hoja `Bitacora` con estructura definida (ver sección 4).
- Función Apps Script para insertar entradas (`addBitacoraEntry`).
- Función para listar por entidad (`listarBitacoraPorEntidad`).
- Integraciones automáticas en eventos clave (aprobación, rechazo, cierre de sobre, generación de saldo a favor).

Fase 2+ (Evolución):
- Firestore (`bitacoraEntries`).
- Índices y reglas de seguridad.
- Dashboard (Looker Studio / BigQuery).
- Enlace con módulo de saldos a favor (ledger).

---

## 3. Principios
| Principio | Descripción |
|-----------|-------------|
| Inmutabilidad | Nunca se edita ni borra una entrada existente. Correcciones = nueva entrada. |
| Atomicidad | Cada evento lógico = una fila / documento. |
| Consistencia | Campos obligatorios validados antes de insertarse. |
| Verificabilidad | Hash HMAC de campos clave para detectar manipulación. |
| Evolutividad | Campo JSON flexible para detalles sin romper el esquema. |
| Usabilidad | Categorías controladas (enum) + descripción libre. |

---

## 4. Esquema (Versión Google Sheets)

Hoja: `Bitacora`

| Columna | Tipo | Obligatorio | Descripción |
|---------|------|-------------|-------------|
| ID_Log | String | Sí | Identificador único (`LOG-YYYYMMDD-HHMMSS-<RAND>`) |
| FechaHora | Date/ISO | Sí | Timestamp creación |
| Actor_Email | String | Sí | Usuario que genera la entrada |
| Entidad_Tipo | String (enum) | Sí | `sobre` | `pago` | `factura` | `cliente` |
| Entidad_ID | String | Sí | ID asociado (ej: SOB-2025-000123, código factura) |
| Facturas_Afectadas | String (CSV) | No | Lista de facturas relacionadas |
| Cliente_Codigo | String | No | Código de cliente (snapshot) |
| Cliente_Nombre | String | No | Nombre cliente (snapshot) |
| Tipo_Evento | String (enum) | Sí | Ver catálogo (sección 6) |
| Subtipo | String | No | Refinamiento (ej: `saldo_favor_generado`) |
| Descripcion | String (≤1000) | Sí | Texto libre explicativo |
| Datos_JSON | String (JSON) | No | Estructura adicional (flexible) |
| Monto_Afectado | Number | No | Cambios puntuales (+/-) |
| Moneda | String | No | USD / Bs (por defecto USD) |
| Saldo_Favor_Generado | Number | No | Monto de crédito generado |
| Saldo_Favor_Aplicado | Number | No | Crédito consumido |
| Saldo_Favor_Remanente | Number | No | Snapshot tras la acción |
| Origen_Referencia | String | No | Nº de referencia, doc externo |
| Vinculos | String (CSV) | No | IDs relacionados (otro sobre, nota) |
| Hash_Integridad | String | Sí | HMAC de campos clave |
| Observaciones_Privadas | String | No | Campo restringido (roles altos) |

---

## 5. Campos Núcleo para Hash
Concatenación:
```
ID_Log | Entidad_Tipo | Entidad_ID | FechaHora_ISO | Tipo_Evento | Monto_Afectado | Saldo_Favor_Generado | Saldo_Favor_Aplicado
```
HMAC-SHA256 con clave secreta (`BITACORA_HASH_KEY`).  
Resultado en Base64 → `Hash_Integridad`.

---

## 6. Catálogo de Tipos de Evento (Tipo_Evento)

| Tipo | Uso |
|------|-----|
| REGISTRO_INICIAL | Primera anotación asociada al sobre/pago |
| OBSERVACION | Nota informativa general |
| DIFERENCIA_MONTO | Monto recibido distinto al esperado |
| SALDO_FAVOR_GENERADO | Excedente que se convierte en crédito futuro |
| SALDO_FAVOR_APLICADO | Aplicación de crédito previo |
| SALDO_FAVOR_RECLASIFICADO | Reclasificación / ajuste manual |
| AJUSTE_MANUAL | Corrección administrativa validada |
| PENDIENTE_SOPORTE | Falta comprobante / archivo |
| SOPORTE_RECIBIDO | Se adjunta soporte pendiente |
| INCIDENCIA_BANCARIA | Rechazo, retención, duplicado |
| COMPROMISO_PAGO | Acuerdo de completar saldo luego |
| ESCALADO | Escalado a supervisor / crédito / legal |
| VALIDACION_CRUCE | Confirmación contra estado de cuenta |
| REVISION_FISCAL | Observación con impacto contable/fiscal |
| APROBAR | Aprobación de sobre / flujo |
| RECHAZO | Rechazo de aprobación / validación |
| FIRMA | Registro de firma (interna/externa) |
| CIERRE_SOBRE | Cierre de ciclo (emisión a registro final) |
| ANULACION | Anulación formal |
| NOTA_INTERNA | Uso libre interno (diferenciar de OBSERVACION) |

Subtipos recomendados para granular (ejemplos):
- `saldo_favor_generado`
- `saldo_favor_aplicado_parcial`
- `saldo_favor_aplicado_total`
- `incidencia_banco_rechazo`
- `incidencia_banco_retenido`
- `compromiso_pago_confirmado`
- `firma_digital_externa`

---

## 7. Funciones Apps Script (Referencia)

```javascript
function addBitacoraEntry(entry, userEmail) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Bitacora');
  const now = new Date();
  const idLog = `LOG-${Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss')}-${Math.floor(Math.random()*36).toString(36).toUpperCase()}`;

  const normCsv = (entry.facturasCsv || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .join(',');

  const montoAfectado = Number(entry.montoAfectado || 0) || 0;
  const saldoGen = Number(entry.saldoFavorGenerado || 0) || 0;
  const saldoApl = Number(entry.saldoFavorAplicado || 0) || 0;
  const saldoRem = Number(
    entry.saldoFavorRemanente != null
      ? entry.saldoFavorRemanente
      : (saldoGen - saldoApl)
  ) || 0;

  const hash = computeBitacoraHash({
    idLog,
    entidadTipo: entry.entidadTipo,
    entidadId: entry.entidadId,
    fechaISO: now.toISOString(),
    tipoEvento: entry.tipoEvento,
    montoAfectado,
    saldoGen,
    saldoApl
  });

  const row = [
    idLog,
    now,
    userEmail,
    entry.entidadTipo,
    entry.entidadId,
    normCsv,
    entry.clienteCodigo || '',
    entry.clienteNombre || '',
    entry.tipoEvento,
    entry.subtipo || '',
    (entry.descripcion || '').substring(0, 1000),
    JSON.stringify(entry.datos || {}),
    montoAfectado,
    (entry.moneda || 'USD').toUpperCase(),
    saldoGen,
    saldoApl,
    saldoRem,
    entry.referencia || '',
    (entry.vinculos || []).join(','),
    hash,
    entry.observacionesPrivadas || ''
  ];
  sheet.appendRow(row);
  return idLog;
}

function computeBitacoraHash(o) {
  const secret = PropertiesService.getScriptProperties().getProperty('BITACORA_HASH_KEY');
  const base = [
    o.idLog,
    o.entidadTipo || '',
    o.entidadId || '',
    o.fechaISO || '',
    o.tipoEvento || '',
    o.montoAfectado || 0,
    o.saldoGen || 0,
    o.saldoApl || 0
  ].join('|');
  const raw = Utilities.computeHmacSha256Signature(base, secret);
  return Utilities.base64Encode(raw);
}

function listarBitacoraPorEntidad(entidadTipo, entidadId) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Bitacora');
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const idxTipo = headers.indexOf('Entidad_Tipo');
  const idxId = headers.indexOf('Entidad_ID');
  return data
    .filter(r => r[idxTipo] === entidadTipo && r[idxId] === entidadId)
    .map(r => headers.reduce((acc, h, i) => { acc[h] = r[i]; return acc; }, {}));
}
```

---

## 8. Integración con Sobres (Eventos Automáticos)
Acciones que deben generar bitácora automáticamente:

| Acción | Tipo_Evento | Descripción sugerida |
|--------|-------------|----------------------|
| Creación de sobre | REGISTRO_INICIAL | Sobre creado con X facturas |
| Enviar a aprobación | OBSERVACION | Enviado a aprobación por usuario |
| Aprobar sobre | APROBAR | Aprobado por analista |
| Rechazar sobre | RECHAZO | Motivo de rechazo |
| Generar saldo a favor | SALDO_FAVOR_GENERADO | Excedente por diferencia / redondeo |
| Aplicar saldo a favor | SALDO_FAVOR_APLICADO | Aplicado a factura X |
| Cerrar sobre | CIERRE_SOBRE | Registro final listo |
| Anular | ANULACION | Anulado por rol admin |
| Ajuste manual | AJUSTE_MANUAL | Justificación obligatoria |
| Incidencia bancaria | INCIDENCIA_BANCARIA | Código de causa / referencia |

---

## 9. Gestión de Saldos a Favor (Ledger Ligero)

Hoja opcional: `SaldosFavor`  
(Se puede implementar después de activar eventos SALDO_FAVOR_*)

| Columna | Descripción |
|---------|-------------|
| ID | Identificador |
| Cliente_Codigo | Cliente |
| Fecha | Timestamp |
| Origen_Log | ID_Log de bitácora |
| Tipo | generado|aplicado|reclasificado |
| Monto | +crédito / -aplicación |
| Moneda | Moneda |
| Saldo_Acumulado | Snapshot resultante |
| Estado | abierto|parcial|consumido |
| Notas | Texto |

Regla:  
Saldo disponible cliente = suma(Monto) donde Estado != consumido.

---

## 10. Ejemplos de Uso

### 10.1 Generar saldo a favor
Evento: monto recibido > suma facturas.

Bitácora:
```
Tipo_Evento: SALDO_FAVOR_GENERADO
Descripcion: Excedente por transferencia (cliente envió 50.00 USD adicionales)
Saldo_Favor_Generado: 50.00
Saldo_Favor_Remanente: 50.00
```

### 10.2 Aplicar saldo a favor
```
Tipo_Evento: SALDO_FAVOR_APLICADO
Descripcion: Aplicados 30.00 USD a factura ET0099123
Saldo_Favor_Aplicado: 30.00
Saldo_Favor_Remanente: 20.00
```

### 10.3 Diferencia de monto
```
Tipo_Evento: DIFERENCIA_MONTO
Descripcion: Transferencia menor en 12.75 USD frente al total facturado
Monto_Afectado: -12.75
```

---

## 11. UI Recomendada

Vista Detalle Sobre:
- Pestaña “Bitácora”
  - Timeline invertido (último primero).
  - Filtros: Tipo_Evento, texto libre.
  - Botón “Agregar Nota / Incidencia”.
  - Badges para eventos críticos (RECHAZO, SALDO_FAVOR_GENERADO, INCIDENCIA_BANCARIA).
- Indicador saldo a favor cliente (si > 0).

Vista Cliente:
- Tabla bitácora consolidada (todas las entidades).
- Resumen: saldos a favor generados / aplicados / remanentes.
- Filtro por rango de fechas y tipo.

---

## 12. Migración a Firestore (Fase Posterior)

Colección: `bitacoraEntries`

Documento ejemplo:
```json
{
  "idLog": "LOG-20250911-154522-X8",
  "createdAt": "2025-09-11T15:45:22.123Z",
  "actor": "cobranzas@empresa.com",
  "entity": { "type": "envelope", "id": "SOB-2025-000123" },
  "customer": { "code": "VP00001335", "name": "INVERSIONES SAN VICENTE 2021, C.A" },
  "invoices": ["ET00152326","ET00152327"],
  "event": { "type": "SALDO_FAVOR_GENERADO", "subtype": "saldo_favor_generado" },
  "description": "Excedente por diferencia de tasa",
  "amount": { "affected": 0, "currency": "USD" },
  "saldoFavor": { "generado": 12.50, "aplicado": 0, "remanente": 12.50 },
  "meta": { "reference": "672848100152", "links": [], "hash": "..." }
}
```

Índices sugeridos:
- entity.type + entity.id + createdAt (orden DESC para timeline)
- customer.code + createdAt
- event.type + createdAt

Reglas de seguridad:
- Lectura: actor relacionado (creador sobre, aprobador, admin).
- Escritura: solo Cloud Functions / backend confiable.

---

## 13. KPIs Derivables
| KPI | Cálculo |
|-----|---------|
| Tiempo ciclo (creado→cerrado) | Diferencia timestamps bitácora |
| % sobres con incidencias | sobres con ≥1 DIFERENCIA_MONTO / total |
| Total saldo a favor generado | Suma SALDO_FAVOR_GENERADO |
| Eficiencia aplicación saldo | SALDO_FAVOR_APLICADO / SALDO_FAVOR_GENERADO |
| Rechazos por causa | Conteo RECHAZO + análisis texto / subtipo |
| Incidencias bancarias | Conteo INCIDENCIA_BANCARIA por periodo |

---

## 14. Roadmap Implementación

| Fase | Acción | Resultado |
|------|--------|-----------|
| 1 | Crear hoja Bitacora + script inserción | Registro manual y automático básico |
| 2 | Integrar creación en transiciones de sobres | Auditoría consistente |
| 3 | Añadir UI timeline | Visibilidad operativa |
| 4 | Activar eventos SALDO_FAVOR_* | Control de créditos |
| 5 | Ledger saldos (hoja / tabla) | Reporte de créditos |
| 6 | Migrar a Firestore | Escalabilidad y seguridad |
| 7 | KPI dashboard | Mejora continua |

---

## 15. Checklist de Control de Calidad

| Ítem | Verificación |
|------|--------------|
| Inmutabilidad | No existe función de edición/borrado |
| Hash consistente | Recalcular manual y comparar |
| Campos obligatorios | Validación previa en backend |
| Límite descripción | Truncada a 1000 chars |
| CSV normalizado | Sin espacios repetidos |
| Tiempos consistentes | ISO estándar (UTC recomendado) |
| Eventos automáticos | Se registran sin intervención manual |
| Saldos a favor | Sumas cuadran con ledger |

---

## 16. Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| Ediciones manuales en Sheet | Hash + comparación + protección de rango |
| Omisión de registro | Automatizar llamadas en backend |
| Crecimiento filas (rendimiento) | Migrar a Firestore tras volumen > 25K |
| Inconsistencia saldos | Ledger separado + reconciliación periódica |
| Acceso no autorizado | Control de menús y filtros (y Firestore reglas en fase 2) |

---

## 17. Próximo Paso Recomendado
1. Crear hoja `Bitacora`.
2. Insertar los encabezados exactamente como definidos.
3. Implementar funciones `addBitacoraEntry` y `listarBitacoraPorEntidad`.
4. Llamar `addBitacoraEntry` en: creación sobre, aprobación, rechazo, cierre.
5. Agregar botón en UI: “Agregar Nota Bitácora” (manual).

---

## 18. Ejemplo de Encabezados (Copiar en la Hoja)
```
ID_Log | FechaHora | Actor_Email | Entidad_Tipo | Entidad_ID | Facturas_Afectadas | Cliente_Codigo | Cliente_Nombre | Tipo_Evento | Subtipo | Descripcion | Datos_JSON | Monto_Afectado | Moneda | Saldo_Favor_Generado | Saldo_Favor_Aplicado | Saldo_Favor_Remanente | Origen_Referencia | Vinculos | Hash_Integridad | Observaciones_Privadas
```

---

## 19. Notas Finales
- Esta bitácora es el cimiento para auditoría y analítica avanzada.
- Evita sobrecargar “Respuestas” con semántica de proceso.
- Compatible con el flujo de “Sobres” ya planificado.
- Preparada para integración futura con firma electrónica y saldos consolidados.

---

¿Necesitas un PR inicial con esta hoja y funciones base? Indícalo y lo generamos.
