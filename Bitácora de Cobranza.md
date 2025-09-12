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
| Entidad_Tipo | String (enum) | Sí | `sobre` \| `pago` \| `factura` \| `cliente` |
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
| DISPUTA | Apertura / nota de caso de disputa |
| DISPUTA_RESUELTA | Cierre de disputa |
| DUNNING_NIVEL_1..4 | Escalamiento por aging (si se implementa) |
| SOD_EXCEPTION | Excepción a segregación de funciones |

Subtipos recomendados (ejemplos):
- `saldo_favor_generado`
- `saldo_favor_aplicado_parcial`
- `saldo_favor_aplicado_total`
- `incidencia_banco_rechazo`
- `incidencia_banco_retenido`
- `compromiso_pago_confirmado`
- `firma_digital_externa`
- `disputa_precio`
- `disputa_impuesto`
- `dunning_nivel_1` … `dunning_nivel_4`

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
| Aprobar sobre | APROBAR | Aprobado por analista (o nivel X) |
| Rechazar sobre | RECHAZO | Motivo de rechazo |
| Generar saldo a favor | SALDO_FAVOR_GENERADO | Excedente por diferencia / redondeo |
| Aplicar saldo a favor | SALDO_FAVOR_APLICADO | Aplicado a factura X |
| Cerrar sobre | CIERRE_SOBRE | Registro final listo |
| Anular | ANULACION | Anulado por rol admin |
| Ajuste manual | AJUSTE_MANUAL | Justificación obligatoria |
| Incidencia bancaria | INCIDENCIA_BANCARIA | Código de causa / referencia |
| Abrir disputa | DISPUTA | Caso de discrepancia formal |
| Resolver disputa | DISPUTA_RESUELTA | Disputa resuelta / acción aplicada |
| Dunning nivel alcanzado | DUNNING_NIVEL_X | Escalamiento por antigüedad |
| Excepción SoD | SOD_EXCEPTION | Segregación violada |

---

## 9. Gestión de Saldos a Favor (Ledger Ligero)
Hoja opcional: `SaldosFavor`  

| Columna | Descripción |
|---------|-------------|
| ID | Identificador |
| Cliente_Codigo | Cliente |
| Fecha | Timestamp |
| Origen_Log | ID_Log de bitácora |
| Tipo | generado \| aplicado \| reclasificado |
| Monto | +crédito / -aplicación |
| Moneda | Moneda |
| Saldo_Acumulado | Snapshot resultante |
| Estado | abierto \| parcial \| consumido |
| Notas | Texto |

Regla: Saldo disponible cliente = suma(Monto) donde Estado != consumido.

---

## 10. Ejemplos de Uso

### 10.1 Generar saldo a favor
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
  - Badges para eventos críticos (RECHAZO, SALDO_FAVOR_GENERADO, INCIDENCIA_BANCARIA, DISPUTA).

Vista Cliente:
- Tabla bitácora consolidada (todas las entidades).
- Resumen: saldos a favor generados / aplicados / remanentes.
- Filtro por rango de fechas y tipo.

---

## 12. Migración a Firestore (Fase Posterior)

Colección: `bitacoraEntries`

Ejemplo:
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
- entity.type + entity.id + createdAt
- customer.code + createdAt
- event.type + createdAt

Seguridad:
- Escritura solo backend confiable.
- Lectura restringida a actores relevantes (roles).

---

## 13. KPIs Derivables
| KPI | Cálculo |
|-----|---------|
| Tiempo ciclo (creado→cerrado) | Diferencia timestamps bitácora |
| % sobres con incidencias | sobres con ≥1 DIFERENCIA_MONTO / total |
| Total saldo a favor generado | Suma eventos SALDO_FAVOR_GENERADO |
| Eficiencia aplicación saldo | SALDO_FAVOR_APLICADO / SALDO_FAVOR_GENERADO |
| Rechazos por causa | Conteo RECHAZO agrupado por subtipo |
| Incidencias bancarias | Conteo INCIDENCIA_BANCARIA por periodo |
| Aging promedio por estado | Promedio días entre transiciones |
| Disputas abiertas vs resueltas | Ratio por periodo |
| Cumplimiento promesas pago | promesas cumplidas / totales |

---

## 14. Roadmap Implementación

| Fase | Acción | Resultado |
|------|--------|-----------|
| 1 | Crear hoja Bitacora + script inserción | Registro básico |
| 2 | Integrar transiciones sobres | Auditoría consistente |
| 3 | UI timeline | Visibilidad |
| 4 | Activar SALDO_FAVOR_* | Control créditos |
| 5 | Ledger saldos | Reporte créditos |
| 6 | Migrar a Firestore | Escalabilidad |
| 7 | Dashboard KPIs | Gestión data-driven |

---

## 15. Checklist de Control de Calidad

| Ítem | Verificación |
|------|--------------|
| Inmutabilidad | No existe edición/borrado |
| Hash consistente | Recalcular y comparar |
| Campos obligatorios | Validación backend |
| Límite descripción | ≤1000 chars |
| CSV normalizado | Sin duplicados / espacios |
| Tiempos ISO | UTC preferido |
| Eventos automáticos | Todas transiciones cubiertas |
| Saldos a favor | Reconcilian con ledger |

---

## 16. Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| Ediciones manuales | Hash + protección rango |
| Omisión de eventos | Hooks automáticos |
| Crecimiento filas | Migrar a Firestore >25K |
| Inconsistencia saldo | Reconciliación periódica |
| Acceso indebido | Roles + reglas seguridad |

---

## 17. Próximo Paso Recomendado
1. Crear hoja `Bitacora`.
2. Pegar encabezados (sección 18).
3. Implementar `addBitacoraEntry`.
4. Llamar en creación, aprobación, rechazo, cierre.
5. Añadir botón “Agregar Nota Bitácora”.

---

## 18. Ejemplo de Encabezados (Copiar en la Hoja)
```
ID_Log | FechaHora | Actor_Email | Entidad_Tipo | Entidad_ID | Facturas_Afectadas | Cliente_Codigo | Cliente_Nombre | Tipo_Evento | Subtipo | Descripcion | Datos_JSON | Monto_Afectado | Moneda | Saldo_Favor_Generado | Saldo_Favor_Aplicado | Saldo_Favor_Remanente | Origen_Referencia | Vinculos | Hash_Integridad | Observaciones_Privadas
```

---

## 19. Notas Finales
- Cimiento para auditoría y analítica.
- Evita sobrecargar “Respuestas”.
- Compatible con flujo de sobres y futura firma.
- Lista para integraciones externas.

---

## 20. Patrones e Inspiración (Implementaciones Similares en Notion)

### 20.1 Estructura de Bases de Datos en Notion
| Notion DB | Propósito | Equivalente |
|-----------|-----------|------------|
| Envelopes / Cases | Unidad de trabajo | `envelopes` |
| Events / Timeline | Historial granular | `envelopeEvents` / `bitacoraEntries` |
| Documents | Soportes | `documents` (opcional) |
| Clients | Maestro clientes | `clients` |
| Credits / Adjustments | Saldos a favor | `SaldosFavor` |
| Tasks | Subtareas | Derivado bitácora |

### 20.2 Propiedades Comunes y Mapeo
| Patrón | Uso | Traslado |
|--------|-----|----------|
| Relation | Enlace sobre-cliente | FK + snapshot |
| Rollup | Conteo eventos | Agregaciones Firestore / BI |
| Select / Multi-select | Estados / tags | Enums + arrays |
| Fórmulas | Aging / SLA | Cálculo backend |
| Files | Adjuntos soporte | Storage + metadata |

### 20.3 Vistas Notion → Equivalentes
| Vista | Beneficio | Implementación |
|-------|-----------|---------------|
| Board por estado | Flujo visual | Tabs / columnas filtradas |
| Timeline | Planificación | Orden por `fechaPago` |
| Table agrupada | Cliente / estado | Query + group UI |
| Gallery | Resumen KPI | Tarjetas UI front |

### 20.4 Patrones Observados
- Append-only para auditoría.
- Plantillas de caso pre llenadas.
- Distinción monto solicitado vs confirmado.
- Uso de tags de riesgo.

### 20.5 Buenas Prácticas Derivables
| Práctica | Beneficio | Implementación |
|----------|-----------|---------------|
| Snapshot cliente | Reportes históricos | Guardar código + nombre |
| CSV normalizado | Lectura rápida | Normalizador central |
| Enum estricto | Métricas fiables | Validación backend |
| Notas internas separadas | Confidencialidad | Campo Observaciones_Privadas |

### 20.6 Errores Frecuentes
| Error | Riesgo | Mitigación |
|-------|-------|-----------|
| Categorías libres | Reportes inservibles | Enum |
| Mezclar eventos distintos | Métricas confusas | 1 acción = 1 entrada |
| Edición retroactiva | Auditoría débil | Inmutabilidad |

### 20.7 Métricas Inspiradas
- Aging promedio por estado.
- % sobres reabiertos.
- Distribución tipos incidencias.
- Velocidad aplicación saldos.

### 20.8 Herramientas Complementarias
| Herramienta | Uso | Sustituto |
|-------------|-----|----------|
| Notion Forms | Captura inicial | UI propia |
| Webhooks Slack | Alertas | Integración Slack (sección 24) |

### 20.9 Evolución Prototipo → Producción
| Etapa | Notion | Producción |
|-------|--------|-----------|
| MVP | Bases de datos manuales | Firestore colecciones |
| Fórmulas | Reglas visuales | Cloud Functions |
| Rollups | Resumen | Consultas indexadas |

### 20.10 Checklist Incorporación
- Añadir campo `tags`.
- `montoConfirmado` si difiere.
- Subtipo obligatorio saldos.
- Cálculo aging por estado.
- Validación enumeraciones.

---

## 21. Apéndice: Mapeo Conceptual Notion → Firestore / UI
| Concepto Notion | Firestore | Nota |
|-----------------|-----------|------|
| Página Sobre | Documento `envelopes` | Snapshot cliente |
| Timeline | `bitacoraEntries` | Query filtrada |
| Rollup incidencias | Agregación | Precalcular si escala |
| Board estado | status index | UI columns |
| Fórmula aging | Campo derivado | Guardar si frecuente |

---

## 22. Resumen de Acciones (Patrones Notion)
| Acción | Prioridad | Beneficio |
|--------|-----------|-----------|
| Enum estricto eventos | Alta | Limpieza datos |
| Subtipo saldos | Alta | Analítica precisa |
| Aging derivado | Media | Priorización |
| Tags riesgo | Media | Foco operativo |
| `montoConfirmado` | Media | Conciliación clara |

---

## 23. Nota sobre Fuentes
Abstracción de patrones públicos y prácticas comunes de workspaces (no se replica contenido privado).

---

## 24. Integración Operativa con Slack

### 24.1 Objetivos
| Objetivo | Beneficio |
|----------|-----------|
| Notificaciones críticas | Agilidad |
| Acciones rápidas | Menos fricción |
| Contexto inline | Menos cambios de ventana |
| Escalado automático | Reducción aging |

### 24.2 Eventos con Notificación
| Evento | Destino | Modo |
|--------|---------|------|
| Enviar a aprobación | #cobranzas-aprob | Mensaje |
| Aprobación pendiente > Xh | #cobranzas-alertas | Recordatorio |
| Rechazo | Thread original | Motivo |
| Incidencia bancaria | #cobranzas-incidencias | Alta |
| Saldo a favor grande | #cobranzas-riesgos | Alerta |
| Aging crítico | #supervision | Escalado |

### 24.3 Mensaje Block Kit (Estructura)
1. Encabezado.
2. Campos (cliente, facturas, monto, aging).
3. Botones Approve / Reject / Ver detalle.
4. Footer con hash parcial.

### 24.4 Comandos
| Comando | Función |
|---------|---------|
| /sobre ID | Snapshot + últimos eventos |
| /saldo CODCLI | Saldo a favor |
| /aprobar ID | Acción directa (modal confirmación) |

### 24.5 Seguridad
- Verificación firma Slack.
- Mapear Slack user → email corporativo.
- Revalidar estado antes de acción.
- Registrar origen=slack en bitácora.

### 24.6 Anti-Patrones
| Error | Mitigación |
|-------|-----------|
| Spam de cambios menores | Filtro severidad |
| Botones sin expiración | Verificar estado actual |
| Mensajes sin contexto | Incluir resumen mínimo |

### 24.7 Campos Nuevos
- `origen` ('ui','slack','api')
- `slackMessageRef`
- `interaccion` ('boton','comando','modal')

### 24.8 Métricas Slack
| Métrica | Descripción |
|---------|-------------|
| Tiempo aprobación slack | Latencia decisión |
| Ratio aprobaciones slack | % del total |
| Alertas aging resueltas | Efectividad recordatorios |

---

## 25. Lecciones de Plataformas P2P / SAP Ariba

| Principio | Adaptación |
|-----------|------------|
| Approval Matrix | Matriz multi-nivel por monto/riesgo |
| Exception Codes | `exceptionCodes` normalizados |
| Three-Way Match mental | Validar montos vs referencia vs facturas |
| Segregation of Duties | Regla SoD (sección 38) |
| Risk Scoring | `riskScore` y `riskFactors` |
| SLA / Aging | Motor Dunning |

Campos sugeridos: `riskScore`, `riskFactors`, `approvalMatrixVersion`, `exceptionCodes`, `sodValidated`, `documentSnapshotHash`.

---

## 26. Acciones Recomendadas (Slack + Ariba)
| Acción | Prioridad |
|--------|-----------|
| Canal aprobaciones + notificaciones | Alta |
| Botones interactivos | Alta |
| exceptionCodes + validación | Alta |
| riskScore baseline | Media |
| Aging alert programada | Media |
| SoD validación cierre | Alta |
| Snapshot documental pre-aprobación | Media |

---

## 27. Ejemplo Payload Slack → Backend
```json
{
  "type": "block_actions",
  "user": { "id": "U123", "username": "analista", "email": "analista@dom.com" },
  "actions": [{
    "action_id": "approve_envelope",
    "value": "approve|SOB-2025-000123"
  }],
  "container": { "channel_id": "C456", "message_ts": "1731368912.12345" }
}
```
Pasos: validar → aplicar → bitácora → actualizar mensaje.

---

## 28. Consideraciones de Seguridad (Extendido)
| Riesgo | Mitigación |
|--------|-----------|
| Reejecución acción Slack | Idempotencia (hash acción) |
| Aprobación fuera de orden | Validar índice aprobador |
| Manipulación riskScore | Calcular solo backend |
| Exposición hash completo | Mostrar truncado |
| Payload forjado | Verificar firma Slack (timestamp + firma) |

---

## 29. Resumen Ejecutivo Nuevos Beneficios
- Slack reduce ciclo aprobación.
- SAP-like exception & risk → foco y control.
- SoD + snapshot → robustez auditoría.
- Worklist priorizada → eficiencia operativa.
- Métricas estructuradas → mejora continua.

---

## 30. Roadmap Extendido (Semanas)
| Semana | Entrega |
|--------|---------|
| 1 | exceptionCodes + riskScore v1 |
| 2 | Slack notificaciones básicas |
| 3 | Botones Approve/Reject |
| 4 | SoD + matriz aprobación |
| 5 | Aging + Dunning nivel 1–2 |
| 6 | Promesas pago + métricas |
| 7 | DisputeCase entidad |
| 8 | Worklist priorizada avanzada |

---

## 31. Nota sobre Fuentes Adicionales
Patrones genéricos de integraciones Slack y prácticas P2P / SAP; no se replica IP privada.

---

## 32. Inspiración SAP FI-AR y FSCM (Resumen Profundo)
| Componente SAP | Práctica Clave | Traslado | Valor |
|----------------|----------------|---------|-------|
| Open Items | Seguimiento hasta clearing | Flag factura_asignada | Trazabilidad |
| Clearing / Residual | Registro parcial/residual | residualAmount + tipoCompensacion | Precisión |
| Tolerance Groups | Auto-resolver pequeñas diferencias | SALDO_FAVOR_GENERADO autonómico | Agilidad |
| Reason Codes | Motivos normalizados | exceptionCodes | Analítica |
| Worklist Collections | Priorización dinámica | Prioridad calculada | Eficiencia |
| Promise to Pay | Compromiso formal | COMPROMISO_PAGO | Prevención |
| Dispute Case | Ciclo separado | disputeCaseIds | Foco divergencias |
| Credit Check | Bloqueos por exposición | Pre-check creación | Riesgo |
| Dunning | Escalado por aging | DUNNING_NIVEL_X | Proactividad |
| Audit Trail | Historial inviolable | Bitácora + hash | Cumplimiento |

---

## 33. Matriz de Excepciones y Disputas
(Ver ya explicado; catálogo initial y reglas automáticas.)

---

## 34. Worklist Priorizada (Collections Style)
Fórmula y segmentación (CRÍTICO / ALTA_PRIORIDAD / NORMAL / MONITOREO).

---

## 35. Estrategia de Riesgo y Límites de Crédito
RiskScore v2 con factores: exposición, disputas, promesas incumplidas.

---

## 36. Motor de Aging y Dunning
Niveles 1–4 con generación automática de eventos y escalado.

---

## 37. Modelo de Promesas de Pago
Entrada estructurada, métricas (cumplimiento y desviación), factor de riesgo si incumplimiento alto.

---

## 38. Integridad, Snapshot Documental y SoD Ampliado
- Snapshot pre-aprobación.
- Reversión a creado si se altera núcleo.
- Reglas SoD mínimas y bitácora de excepción.

---

## 39. Roadmap SAP-driven Integrado
| Iteración | Feature | Dependencias | Resultado |
|-----------|---------|--------------|-----------|
| 1 | exceptionCodes + riskScore v1 | Bitácora | Priorización inicial |
| 2 | Promesas + aging básico | riskScore | Proactividad |
| 3 | Dunning + Slack alertas | aging | Escalamiento |
| 4 | DisputeCase | exceptionCodes | Gestión divergencias |
| 5 | riskScore v2 | Exposición, promesas | Priorización refinada |
| 6 | SoD estricto | Roles | Cumplimiento |
| 7 | Snapshot documental | Hash base | Integridad |
| 8 | Worklist avanzada | Todos | Optimización |

---

¿Siguiente paso sugerido?
- Implementar `exceptionCodes` y `riskScore` (v1) de inmediato.
- Luego notificaciones Slack de aprobación.

Indica si deseas:
1. Un PR con este archivo.
2. Separar contenidos (p.ej. crear EXPERIENCIAS_SAP.md).
3. Diseño entidad `DisputeCase`.

Fin del documento.
