# Proceso Ágil de Trabajo

Cadencia:
- Sprints de 2 semanas
- Ceremonias:
  - Sprint Planning (2h): Definir objetivo del sprint, seleccionar historias priorizadas
  - Daily (15min): Sincronización y desbloqueos
  - Sprint Review (1h): Demostración funcional a stakeholders
  - Sprint Retrospective (1h): Mejora continua del proceso y del equipo
  - Backlog Refinement (1h/semana): Detalle y estimación de historias

Artefactos:
- Product Backlog: Historias priorizadas con criterios de aceptación (ver backlog.md)
- Sprint Backlog: Selección de historias y tareas técnicas
- Definition of Ready (DoR):
  - Historia claramente descrita con valor de negocio
  - Criterios de aceptación medibles
  - Dependencias identificadas
  - Riesgos conocidos y mitigaciones preliminares
- Definition of Done (DoD):
  - Código con tests y linters pasando
  - Revisión por pares aprobada
  - Documentación actualizada
  - Feature flag/config añadida si aplica
  - Despliegue a ambiente objetivo (staging/producción) según el caso
  - Observabilidad: logs y métricas instrumentados cuando aplique

Estimación:
- Story points (Fibonacci): complejidad + incertidumbre
- Medición de throughput y predictibilidad por sprint

Política de PRs:
- Branch por historia/tarea
- Revisión obligatoria de 1+ revisor
- Chequeos CI obligatorios (lint, build, tests)
- Commits atómicos con mensajes convencionales (Conventional Commits)