# Visión general Agile para Conciliapp

Este documento resume la documentación generada siguiendo prácticas Agile para el proyecto Conciliapp (registro de cobranzas). Está basado en el código actual del repositorio y en los artefactos ya presentes (auth.js, codigo.js, maintenance.js, index.html, auth.html, etc.).

Objetivos del documento
- Proveer artefactos típicos de un ciclo Agile: product backlog, user stories con criterios de aceptación, planning de sprint, plan de pruebas, documentación de despliegue y runbook de mantenimiento.
- Facilitar la continuidad del proyecto y la incorporación de nuevos colaboradores.

Alcance
- Cobertura: autenticación, registro de cobranzas (envío y auditoría), sincronización de vendedores, mantenimiento programado, generación de reportes PDF.
- No cubre: integración con Firestore (solo notas para migración), notificaciones externas (Slack) y automatizaciones avanzadas fuera del código actual.

Roles sugeridos
- Product Owner: define prioridades de negocio y backlog.
- Scrum Master: facilita ceremonias y elimina impedimentos.
- Equipo de Desarrollo: implementa historias, tests y despliegues.

Ceremonias mínimas
- Planning (1.5h por sprint de 2 semanas)
- Daily standup (15 min)
- Demo/Review (1h)
- Retrospectiva (45 min)

Definition of Done (DoD) - mínima
- Código con pruebas básicas o pasos de verificación manuales documentados.
- Linter y formato coherente.
- Documentación de la funcionalidad añadida (README o actualización en /docs).
- Deploy verificado en entorno de producción o staging según política del equipo.
