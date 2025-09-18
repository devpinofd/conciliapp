# Plan de Sprint (2 semanas)

Sprint objetivo: Implementar y asegurar la autenticación robusta y estabilizar el flujo de registro/login con tests y documentación.

Duración: 2 semanas
Equipo: 3 desarrolladores + 1 QA
Sprint Backlog (de Product Backlog):
- Historia A: Autenticación robusta (3-5 pts)
- Historia B: Rate limiting y logs de intentos fallidos (2 pts)
- Historia C: UI de Auth (mejoras en Auth.html) y mensajes de error/éxito (1 pt)
- Historia D: Documentación y pruebas para login/registro (2 pts)

Criterios de aceptación del sprint:
- Usuarios pueden registrarse si su email está en 'obtenerVendedoresPorUsuario'.
- Login devuelve token caducable (6h) y es almacenado en CacheService.
- Intentos fallidos registrados en 'Auditoria' y bloqueo temporal después de 5 intentos fallidos.
- Documentación actualizada en /docs con pasos para despliegue y pruebas manuales.

Riesgos y mitigaciones:
- Riesgo: Límites de quota de UrlFetchApp/PropertiesService.
  - Mitigación: Simular llamadas en pruebas, usar caché para reducir fetches.
- Riesgo: Cambios en API externa (eFactory).
  - Mitigación: Encapsular queries en PropertiesService y añadir validaciones.

Definition of Done (DoD) para el sprint:
- Código revisado y mergeado en rama principal (o PR aprobado).
- Documentación en /docs actualizada.
- Verificación manual end-to-end en entorno de prueba.
