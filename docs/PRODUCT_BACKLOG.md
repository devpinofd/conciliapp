# Product Backlog (priorizado)

Este backlog ha sido generado a partir del análisis del código existente y los requisitos técnicos en promtp.txt y archivos de contexto. Las entradas están ordenadas por prioridad propuesta (alto -> bajo).

1. Autenticación robusta (ALTA)
   - Descripción: Asegurar registro/login con hashing (HMAC-SHA256), salting por usuario y rate limiting.
   - Beneficio: Reduce accesos no autorizados.
   - Estimación: 3-5 puntos

2. Protección Mantenimiento (ALTA)
   - Descripción: Módulo MaintenanceService (ya implementado) + UI banner y bloqueo de operaciones de escritura.
   - Beneficio: Permite operaciones controladas durante mantenimiento.
   - Estimación: 2 puntos

3. Sincronización de vendedores via API (MEDIO)
   - Descripción: Trigger time-driven para sincronizar hoja 'obtenerVendedoresPorUsuario' con eFactory.
   - Beneficio: Mantener lista actualizada de vendedores.
   - Estimación: 2 puntos

4. Gestión de registros: filtrado y eliminación (MEDIO)
   - Descripción: Tabla de registros recientes, eliminación con auditoría en 'Registros Eliminados' (requiere validación temporal y ownership).
   - Beneficio: Mejora operativa y trazabilidad.
   - Estimación: 3 puntos

5. Generación de reportes PDF (MEDIO)
   - Descripción: ReportService para rango de fechas y descarga en base64.
   - Beneficio: Export de datos para auditoría.
   - Estimación: 2 puntos

6. Caché y optimización (BAJA)
   - Descripción: Mejorar CacheManager, invalidaciones selectivas.
   - Estimación: 2 puntos

7. Migración a Firestore (BAJA)
   - Descripción: Preparar plan y scripts para migración de datos de Sheets a Firestore.
   - Estimación: 8 puntos

8. Pruebas y QA automáticas (BAJA)
   - Descripción: Añadir tests unitarios (simulados para GAS) y pruebas de integración.
   - Estimación: 5 puntos

Notas:
- Las estimaciones siguen la escala de Story Points relativa al equipo.
- El Product Owner debe revisar prioridades antes del planning.
