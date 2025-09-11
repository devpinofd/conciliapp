# Bitácora de Cobranza (Logging Operativo & Auditoría)

(Secciones 1–19 sin cambios; se añaden secciones 20 y 21 al final.)

...

## 19. Notas Finales
- Esta bitácora es el cimiento para auditoría y analítica avanzada.
- Evita sobrecargar “Respuestas” con semántica de proceso.
- Compatible con el flujo de “Sobres” ya planificado.
- Preparada para integración futura con firma electrónica y saldos consolidados.

---

## 20. Patrones e Inspiración (Implementaciones Similares en Notion)

Esta sección sintetiza patrones observados en configuraciones típicas de Notion para gestionar flujos de cobranza / QA documental / auditoría de procesos y cómo trasladar sus lecciones al diseño propuesto (Sheets/Firestore). No es una copia literal de ningún workspace privado; es una abstracción de enfoques comunes.

### 20.1 Estructura de Bases de Datos en Notion (Equivalente a Colecciones)

| Notion DB | Propósito | Equivalente Propuesto |
|-----------|-----------|-----------------------|
| Envelopes / Cases | Unidad de trabajo (lote de facturas, expediente) | `envelopes` |
| Events / Timeline | Historial cronológico granular | `envelopeEvents` + `bitacoraEntries` |
| Documents | Archivos / facturas individuales (metadata) | (Opcional) `documents` |
| Clients | Maestro de clientes | Fuente actual (Sheets) → futura `clients` |
| Credits / Adjustments | Control de saldos a favor / ajustes | `SaldosFavor` / ledger en Firestore |
| Tasks (opcional) | Subtareas (recabar soporte, confirmar banco) | Derivable de eventos / subtareas internas |

### 20.2 Propiedades Comunes en Notion y su Mapeo

| Patrón Notion | Uso | Traslado Técnico |
|---------------|-----|------------------|
| Relation (Envelopes → Clients) | Vincular sobre a cliente | Campo `clienteCodigo` + `clienteNombre` snapshot (+ FK lógica) |
| Relation (Events → Envelope) | Timeline filtrable | `envelopeId` indexado |
| Rollup (Count of Events by Type) | Métricas en vista principal | Queries agregadas en Firestore / BigQuery |
| Select / Multi-select (Status, Tags) | Filtrado visual rápido | Campo `status` + enumeraciones controladas |
| Formula (Aging, SLA Breach) | Alertar retrasos | Campo derivado en query / Cloud Function programada |
| Checkbox (Firma requerida) | Feature flag por sobre | `configFlags.firmaObligatoria` |
| Created time / Last edited | Auditoría básica | `createdAt` / `updatedAt` (backend authoritative) |
| Files & media | Adjuntar soporte | Drive / Cloud Storage + `documents` |

### 20.3 Vistas Más Usadas (Notion) y Equivalentes

| Vista Notion | Beneficio | Implementación Recomendada |
|--------------|-----------|----------------------------|
| Board por Estado | Visual Kanban (creado → aprobado) | UI front con tabs / columnas (JS + filtro) |
| Timeline / Calendar por Fecha Pago | Planificación de carga y seguimiento de compromisos | Filtro + orden por `fechaPago` |
| Gallery con tarjetas condensadas | Resumen visual (KPIs por sobre) | Tarjetas en frontend con contadores (eventos críticos) |
| Table con agrupar por Cliente | Agrupación macro para cuentas grandes | Query agrupada + pivot en reporte BI |
| Linked DB (bitácora filtrada por sobre) | Contexto inmediato | Panel “Bitácora” ya previsto |

### 20.4 Patrones de Flujo Observados

1. Minimizar edición directa de campos núcleo tras entrar a estados intermedios (aprobación).
2. Favorecer “append-only” en Event / Log DB para auditoría robusta.
3. Uso de plantillas de sobre (template pre-“aprobación”) con propiedades default (firma requerida, tags de riesgo).
4. Distinción clara entre:
   - Campo “Monto Solicitado”
   - Campo “Monto Confirmado”
   - Campo “Monto Registrado” (final)
5. Alerts (en Notion vía fórmulas) replicables con Cloud Functions: detectar sobres > X días en ‘pendiente_aprobacion’.

### 20.5 Buenas Prácticas Derivables

| Práctica | Beneficio | Implementación Técnica |
|----------|-----------|------------------------|
| Snapshot de cliente en cada sobre | Reportes históricos sin romper por cambios futuros | Guardar `clienteCodigo` + `clienteNombre` |
| Desnormalización controlada (CSV de facturas) | Velocidad de lectura | `facturasCsv` + potencial subcolección si se requiere análisis granular |
| Bitácora enlazada siempre visible | Reduce consultas externas | Carga async diferida (lazy load) |
| Diferenciar “Notas internas” vs “Publicables” | Control de confidencialidad | Campo `Observaciones_Privadas` + roles |
| Campos normalizados (enum estricto) | Métricas fiables | Validación backend + test de regresión |
| Etiquetas de riesgo (ej: “Alto Monto”, “Recurrente”) | Priorización operativa | Campo `tags` en envelope (no obligatorio ahora) |

### 20.6 Errores Frecuentes en Configuraciones Notion (Evitar)

| Error | Riesgo | Mitigación |
|-------|--------|------------|
| Uso excesivo de texto libre para categorías | Dificulta reporting | Enum estricto + validación |
| Edición manual retroactiva de histórico | Auditoría comprometida | Hash + inmutabilidad |
| Mezclar eventos semánticos distintos en misma nota | Ambigüedad de métricas | Una acción = una entrada bitácora |
| Falta de snapshot de valores monetarios | Recalculo inconsistente | Guardar montos en cada transición clave |
| No registrar saldo a favor inmediatamente | Pérdida trazabilidad | Evento SALDO_FAVOR_GENERADO obligatorio |
| No separar incidencia bancaria vs diferencia comercial | KPIs distorsionados | Tipos explícitos INCIDENCIA_BANCARIA / DIFERENCIA_MONTO |

### 20.7 Métricas Inspiradas en Dashboards Notion

| Métrica | Descripción | Fuente |
|---------|-------------|-------|
| Aging medio por estado | Días promedio en cada estado | `envelopeEvents` (estado→estado) |
| % sobres con segunda revisión | Sobres reabiertos tras rechazo | Eventos RECHAZO + REABRIR |
| Ratios por tipo de incidencia | Distribución de causas operativas | Bitácora (Tipo_Evento) |
| Velocidad de aplicación de saldo | Tiempo desde generación del crédito hasta aplicación | SALDO_FAVOR_GENERADO → SALDO_FAVOR_APLICADO |
| Diferencia acumulada no resuelta | Montos pendientes por causas | SUM(DIFERENCIA_MONTO sin compensación) |

### 20.8 Herramientas Complementarias (Opcionales)

| Herramienta | Uso en prototipos | Migración Propuesta |
|-------------|------------------|---------------------|
| Notion Form Integrations | Capturar entradas externas | Sustituido por tu UI (Forms/HTML) |
| Slack Webhooks conectados a Notion | Avisos de estado | Cloud Function → Slack (Webhook) |
| Fórmulas densas para SLA | Alertas básicas | Cloud Scheduler + Firestore queries |

### 20.9 Evolución: Prototipo Notion → Producción Firestore

| Etapa | Notion | Producción |
|-------|--------|------------|
| MVP | Bases de datos: Envelopes, Events, Bitácora | `envelopes`, `envelopeEvents`, `bitacoraEntries` |
| Ensayo | Vistas manuales (board, timeline) | UI front + filtros + caching |
| Análisis | Rollups / fórmulas densas | BigQuery export / agregaciones programadas |
| Alertas | Fórmulas coloreadas | Cloud Functions + email/Slack |
| Firma | Checkbox manual | Proceso firmado (API / DocuSign) |

### 20.10 Checklist de Incorporación de Patrones

- [ ] Añadir campo opcional `tags` a `envelopes` (array).
- [ ] Agregar `montoConfirmado` (si difiere de `montoTotal` inicial).
- [ ] Registrar evento separado para cada particularidad (no mezclar saldo y rechazo en misma entrada).
- [ ] Implementar cálculo de “aging por estado” (duración = diff entre timestamps de eventos).
- [ ] Definir convención: subtipo obligatorio para SALDO_FAVOR_*.
- [ ] Añadir validación de enumeraciones en backend (evita categorías ad hoc).
- [ ] Preparar índice Firestore (status + updatedAt) para simular board rápido.

---

## 21. Apéndice: Mapeo Conceptual Notion → Firestore / UI

| Concepto Notion | Objeto Físico | Nota |
|-----------------|---------------|------|
| Página de Sobre | Documento en `envelopes` | Con snapshot de cliente |
| Tabla de Eventos | Colección `envelopeEvents` | Uno por transición |
| Base Bitácora Global | Colección `bitacoraEntries` | Incluye eventos no “estado” |
| Relation (Sobre ↔ Bitácora) | Campo `envelopeId` indexado | Query simple |
| Rollup (# incidencias) | Agregación en tiempo de consulta | Cloud Function / BI |
| Fórmula (dias_en_estado) | Derivado de eventos | Precomputar y guardar en envelope opcional |
| Board por estado | Query + agrupación UI | `status` enumerado |
| Timeline por fecha pago | Ordenar/filtrar por `fechaPago` | Campo indexado |
| Filtros combinados | Query compuesta | Índices compuestos |

---

## 22. Resumen de Acciones Recomendadas (Derivadas de Patrones)

| Acción | Prioridad | Justificación |
|--------|-----------|---------------|
| Añadir campo `tags` | Media | Etiquetar riesgos / priorización |
| Crear evento explícito para “monto ajustado” | Media | Diferenciar de aprobación |
| Registrar “montoConfirmado” | Alta (si hay divergencias) | Base de conciliación |
| Implementar aging por estado | Media | KPI operativo clave |
| Subtipos obligatorios en SALDO_FAVOR | Alta | Analítica crédito precisa |
| Cloud alert para sobres > X días en pendiente | Media | Gestión proactiva |
| Dashboard BigQuery (fase 2) | Baja (post-migración) | Escalabilidad analítica |

---

## 23. Nota sobre Fuentes
La información anterior es una abstracción de patrones públicos y frecuentes en configuraciones de Notion para gestión de procesos, CRM operativo y auditoría (por ejemplo: uso de relaciones + rollups + vistas Kanban + bitácoras append-only). No se ha reproducido ninguna instancia privada específica.

---

( Fin de ampliaciones )
