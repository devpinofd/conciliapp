# Propuesta de implementación con CacheService en Google Apps Script

Esta propuesta describe cómo migrar el caché actual basado en PropertiesService hacia CacheService, adoptando patrones “stale‑while‑revalidate” (SWR), locks para evitar “cache stampede”, y una estrategia de invalidación y precalentamiento. Incluye snippets listos para integrar con mínima fricción.

---

## Objetivos

- Reducir latencia y número de lecturas a Sheets/llamadas a APIs.
- Evitar picos de carga (balanceo lógico) mediante caché y locks.
- Mantener resiliencia: servir datos “stale” si no es posible refrescar.
- Tener control de TTL por tipo de dato.

---

## Alcance

- Capa de caché compartida para:
  - Vendedores (admin y por usuario)
  - Clientes (por vendedor)
  - Facturas (por vendedor y cliente)
  - Tasa BCV
  - Bancos
  - Registros recientes (paginados)
- Patrones de clave estandarizados.
- Locks con `LockService` para refrescos.
- Precalentamiento con triggers de tiempo.
- Invalidación por prefijo.

---

## Patrones de clave y TTL recomendados

- script:vendedores:admin — TTL 6h
- script:vendedores:{email} — TTL 6h
- script:clientes:{codVendedor} — TTL 6h
- script:facturas:{codVendedor}:{codCliente} — TTL 30–60 min
- script:bcv — TTL 60 min
- script:bancos — TTL 72 h
- script:registros:{scope}:{vendedor|all}:page={n} — TTL 2–5 min

Nota: Ajustar TTL según sensibilidad y tamaño de datos. Recordar límite de 100 KB por entrada en CacheService.

---

## Capa de utilidades de caché (CacheService + SWR + Lock)

La siguiente utilidad encapsula:
- Lectura/escritura en `ScriptCache`.
- Opción de “shadow” en `PropertiesService` para fallback “stale” si CacheService fue purgado.
- SWR con `LockService` para evitar stampede.
- Invalidación por prefijo.

```javascript
// utils/cacheUtil.gs (Apps Script)
/**
 * Utilidad de caché con CacheService (+ fallback opcional en PropertiesService),
 * Stale-While-Revalidate y LockService para evitar "cache stampede".
 */
var CacheUtil = (function() {
  var CACHE_TTL_MAX = 21600; // 6h, máximo permitido por CacheService.
  var SHADOW_PREFIX = 'shadow:'; // Sombra en PropertiesService (opcional).

  function getScriptCache() {
    return CacheService.getScriptCache();
  }

  function now() {
    return Date.now();
  }

  function clampTtl(ttl) {
    return Math.max(1, Math.min(CACHE_TTL_MAX, Math.floor(ttl || 60)));
  }

  function toJSON(val) {
    try { return JSON.stringify(val); } catch(e) { return ''; }
  }

  function fromJSON(str, fallback) {
    try { return JSON.parse(str); } catch(e) { return fallback; }
  }

  function getShadow(key) {
    var props = PropertiesService.getScriptProperties();
    var raw = props.getProperty(SHADOW_PREFIX + key);
    return raw ? fromJSON(raw, null) : null;
  }

  function setShadow(key, obj, expiresAtMs) {
    var props = PropertiesService.getScriptProperties();
    props.setProperty(SHADOW_PREFIX + key, toJSON({ payload: obj, expiresAt: expiresAtMs || 0, savedAt: now() }));
  }

  function delShadowByPrefix(prefix) {
    var props = PropertiesService.getScriptProperties();
    var keys = props.getKeys() || [];
    var toDelete = keys.filter(function(k){ return k.indexOf(SHADOW_PREFIX + prefix) === 0; });
    if (toDelete.length) props.deleteAllProperties(toDelete.reduce(function(acc,k){acc[k]=null;return acc;}, {}));
  }

  function get(key) {
    var raw = getScriptCache().get(key);
    return raw ? fromJSON(raw, null) : null;
  }

  function set(key, obj, ttlSeconds) {
    var ttl = clampTtl(ttlSeconds);
    var payload = { payload: obj, savedAt: now(), ttl: ttl };
    getScriptCache().put(key, toJSON(payload), ttl);
    // Opcional: mantener sombra persistente para fallback stale (sin TTL estricto).
    setShadow(key, obj, now() + ttl * 1000);
  }

  /**
   * SWR: devuelve payload si:
   * - CacheService tiene dato válido (no mira expiración interna, la decide el caller con ttl lógico).
   * - No hay en CacheService, intenta sombra en PropertiesService (si no está vencida), y dispara revalidación.
   */
  function getWithSWR(options) {
    var key = options.key;
    var ttlSeconds = clampTtl(options.ttlSeconds || 300);
    var staleTtlSeconds = clampTtl(options.staleTtlSeconds || (ttlSeconds * 2));
    var rebuildFn = options.rebuildFn; // function() -> any
    var lockKey = 'lock:' + key;
    var allowStaleOnError = options.allowStaleOnError !== false;
    var waitForRefreshMs = Math.max(0, options.waitForRefreshMs || 150); // pequeño wait si otro proceso refresca

    // 1) Intentar CacheService
    var cached = get(key);
    if (cached) {
      // cached = { payload, savedAt, ttl } (en set guardamos este envoltorio)
      return cached.payload !== undefined ? cached.payload : cached;
    }

    // 2) Intentar sombra (stale) y revalidar en background
    var shadow = getShadow(key); // { payload, expiresAt, savedAt }
    var shadowFresh = shadow && shadow.payload;
    var shadowNotExpired = shadow && (now() <= shadow.expiresAt + (staleTtlSeconds * 1000));

    var lock = LockService.getScriptLock();
    var gotLock = false;
    try {
      gotLock = lock.tryLock(200); // pequeño timeout
    } catch(e) { /* ignorar */ }

    if (gotLock) {
      try {
        // Reconstruir y setear
        var fresh = rebuildFn();
        set(key, fresh, ttlSeconds);
        return fresh;
      } catch(e) {
        // Si falla rebuild y hay sombra válida, devolverla
        if (allowStaleOnError && shadowFresh) return shadow.payload;
        throw e;
      } finally {
        try { lock.releaseLock(); } catch(e) {}
      }
    } else {
      // Otro proceso refresca; si hay sombra fresca o dentro del staleTtl, devuélvela
      if (shadowFresh && shadowNotExpired) return shadow.payload;

      // Pequeña espera y reintento de leer CacheService (evita doble rebuild)
      if (waitForRefreshMs > 0) Utilities.sleep(waitForRefreshMs);
      var second = get(key);
      if (second) return second.payload !== undefined ? second.payload : second;

      // Último recurso: si hay sombra aunque esté vencida y se permite stale, retornar
      if (allowStaleOnError && shadowFresh) return shadow.payload;

      // Sin datos: reconstruir sin lock (riesgo de stampede en raro caso) o lanzar error
      if (typeof rebuildFn === 'function') {
        var fresh2 = rebuildFn();
        set(key, fresh2, ttlSeconds);
        return fresh2;
      }
      throw new Error('Cache miss sin forma de reconstrucción para key: ' + key);
    }
  }

  function invalidateByPrefix(prefix) {
    // CacheService no permite listar, así que invalidación por prefijo requiere convención:
    // guardar un "version" por prefijo y agregarla a la clave. Alternativa simple: mantener solo sombra.
    // Aquí: limpiar sombras por prefijo (útil) y cambiar versión lógica en callers.
    delShadowByPrefix(prefix);
  }

  return {
    get: get,
    set: set,
    getWithSWR: getWithSWR,
    invalidateByPrefix: invalidateByPrefix,
    clampTtl: clampTtl
  };
})();
```

---

## Integración por recurso (snippets)

A continuación se muestran ejemplos de uso de `CacheUtil.getWithSWR` para cada recurso clave. Se integran dentro de los métodos existentes (solo cambios de la capa de cache).

> Nota: Los nombres de clave coinciden con los actuales para facilitar migración, pero añaden prefijos para claridad.

### 1) Vendedores (HTML de <option>)

- Clave:
  - Admin: `script:vendedores:admin:html`
  - Por usuario: `script:vendedores:{email}:html`
- TTL: 6 h, stale: 12 h

```javascript
function cargarVendedoresHtml(isAdmin, userEmail, fetchAllFn, fetchByUserFn) {
  var cacheKey = isAdmin ? 'script:vendedores:admin:html' : ('script:vendedores:' + userEmail.toLowerCase() + ':html');
  return CacheUtil.getWithSWR({
    key: cacheKey,
    ttlSeconds: 21600,       // 6h
    staleTtlSeconds: 43200,  // 12h
    rebuildFn: function() {
      var vendedores = isAdmin ? fetchAllFn() : fetchByUserFn(userEmail);
      if (!vendedores || vendedores.length === 0) {
        throw new Error('No tiene vendedores asignados. Contacte al administrador.');
      }
      var html = isAdmin ? '<option value="Mostrar todos">Mostrar todos</option>' : '';
      html += vendedores.map(function(v){ return '<option value="'+v.codigo+'">'+v.nombre+'</option>'; }).join('');
      return html;
    }
  });
}
```

### 2) Clientes por vendedor

- Clave: `script:clientes:{codVendedor}`
- TTL: 6 h, stale: 12 h

```javascript
function cargarClientesOptions(codVendedor, fetchClientesFn) {
  var key = 'script:clientes:' + String(codVendedor || '').trim();
  return CacheUtil.getWithSWR({
    key: key,
    ttlSeconds: 21600,
    staleTtlSeconds: 43200,
    rebuildFn: function() {
      var clientes = fetchClientesFn(codVendedor) || [];
      return clientes.map(function(c){ return '<option value="'+c.codigo+'">'+c.nombre+'</option>'; }).join('');
    }
  });
}
```

### 3) Facturas por vendedor/cliente

- Clave: `script:facturas:{codVendedor}:{codCliente}`
- TTL: 30–60 min, stale: 2 h

```javascript
function obtenerFacturasData(codVendedor, codCliente, fetchFacturasFn) {
  var key = 'script:facturas:' + codVendedor + ':' + codCliente;
  return CacheUtil.getWithSWR({
    key: key,
    ttlSeconds: 3600,       // 60 min
    staleTtlSeconds: 7200,  // 2 h
    rebuildFn: function() {
      return fetchFacturasFn(codVendedor, codCliente) || [];
    }
  });
}
```

### 4) Tasa BCV

- Clave: `script:bcv`
- TTL: 60 min, stale: 3 h

```javascript
function obtenerTasaBCVConCache(fetchBcvFn) {
  return CacheUtil.getWithSWR({
    key: 'script:bcv',
    ttlSeconds: 3600,
    staleTtlSeconds: 10800,
    rebuildFn: function() {
      var rate = fetchBcvFn();
      // Resiliencia: si proveedor falla, lanzar para que se sirva “stale” si existe
      if (!rate || isNaN(rate) || rate <= 0) throw new Error('Proveedor BCV devolvió tasa inválida');
      return rate;
    }
  });
}
```

### 5) Bancos

- Clave: `script:bancos`
- TTL: 72 h, stale: 7 días

```javascript
function obtenerBancosConCache(fetchBancosFn) {
  return CacheUtil.getWithSWR({
    key: 'script:bancos',
    ttlSeconds: 259200,     // 72 h
    staleTtlSeconds: 604800,// 7 d
    rebuildFn: function() {
      return fetchBancosFn() || [];
    }
  });
}
```

### 6) Registros recientes (paginados)

- Clave: `script:registros:{scope}:{vendedor|all}:page={n}`
  - scope = admin|user:{email}
- TTL: 2–5 min, stale: 10–15 min

```javascript
function obtenerRegistrosRecientesConCache(scopeKey, vendedorKey, page, fetchRecientesFn) {
  var key = 'script:registros:' + scopeKey + ':' + (vendedorKey || 'all') + ':page=' + (page || 1);
  return CacheUtil.getWithSWR({
    key: key,
    ttlSeconds: 180,        // 3 min
    staleTtlSeconds: 900,   // 15 min
    rebuildFn: function() {
      return fetchRecientesFn(vendedorKey, page) || [];
    }
  });
}
```

---

## Invalidación

- Al sincronizar vendedores (ej. `sincronizarVendedoresDesdeApi`):
  - Invalidar prefijo `script:vendedores:` y, si procede, `script:clientes:` y `script:facturas:` relacionadas.
- Función utilitaria de invalidación por prefijo (limpia “sombras” y, a nivel lógico, se recomienda versionar la clave para CacheService):

```javascript
function invalidateCacheByPrefix(prefix) {
  // Limpia sombras en PropertiesService
  CacheUtil.invalidateByPrefix(prefix);
  // Para CacheService, adoptar versión lógica en la clave:
  // p.ej., mantener una propiedad script:version:vendedores y concatenarla a la clave.
}
```

Sugerencia de versionado lógico:
- Guardar en `PropertiesService` una versión por prefijo (p. ej., `ver:vendedores`) y concatenarla a la clave: `script:vendedores:v{N}:{...}`.
- Incrementar N al invalidar para “expulsar” todas las entradas sin necesidad de listar en CacheService.

---

## Precalentamiento (prewarm)

- Triggers de tiempo (6:00 am):
  - Reconstruir:
    - `script:vendedores:admin:html`
    - `script:bancos`
    - `script:bcv`
  - Opcional: prewarm de `script:clientes:{codVendedor}` para vendedores con mayor tráfico (top N).
  
Ejemplo de trigger:

```javascript
function prewarmCaches() {
  try {
    // Vendedores admin
    cargarVendedoresHtml(true, null, fetchAllVendedoresFromSheet, null);

    // Bancos
    obtenerBancosConCache(fetchBancosFromSheet);

    // Tasa BCV
    obtenerTasaBCVConCache(fetchBcvRate);

  } catch (e) {
    Logger.log('Prewarm error: ' + e.message);
  }
}
```

Crear el trigger:

```javascript
function crearTriggerPrewarm() {
  // Eliminar previos si existen (opcional)
  ScriptApp.getProjectTriggers().forEach(function(t){
    if (t.getHandlerFunction() === 'prewarmCaches') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('prewarmCaches').timeBased().atHour(6).everyDays(1).create();
}
```

---

## Consideraciones de tamaño y segmentación

- `CacheService` limita a ~100 KB por clave. Si una lista/HTML excede este tamaño:
  - Segmentar por “shards”: `script:clientes:{codVendedor}:part=1..N` y recomponer.
  - O almacenar datos y construir el HTML en cliente para reducir tamaño en servidor.
- Evitar objetos con estructura innecesaria. JSON compacto.

---

## Migración por fases (sugerida)

1. Añadir `CacheUtil` (utilidad independiente).
2. Migrar primero recursos de menor riesgo:
   - `bcv`, `bancos`.
3. Migrar `vendedores` (admin y por usuario).
4. Migrar `clientes` y `facturas`.
5. Migrar `registros recientes` (paginado).
6. Incorporar precalentamiento.
7. Implementar invalidación por prefijo/versión.
8. Retirar gradualmente la lógica de caché en `PropertiesService` (mantener sombra 1–2 semanas).

---

## Observabilidad básica

- Registrar métricas simples (en hoja Auditoría o Logs):
  - `cache_hit`, `cache_miss`, `rebuild_ok`, `rebuild_error`, por clave/prefijo.
- Ajustar TTL según patrón de uso (más hits → TTL mayor; más stale → precalentar).

---

## Resumen

Esta propuesta introduce una capa de caché con:
- CacheService como caché primario, PropertiesService como sombra para “stale”.
- SWR + LockService para evitar stampede y bajar latencia.
- TTLs diferenciados, precalentamiento y mecanismos de invalidación por prefijo/versión.
- Integración progresiva con snippets listos para usar y mínima alteración del código actual.

Con esto, se reduce carga sobre Sheets y APIs externas, se suavizan los picos (“balanceo” lógico) y se mejora la experiencia del usuario final.
