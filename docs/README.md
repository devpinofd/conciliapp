# Documentación técnica de ConciliApp

Bienvenido/a a la documentación técnica del proyecto.

## Índice
- [Arquitectura](#arquitectura)
- [Requisitos](#requisitos)
- [Configuración de desarrollo](#configuración-de-desarrollo)
- [Ejecución local](#ejecución-local)
- [Variables de entorno](#variables-de-entorno)
- [Base de datos y migraciones](#base-de-datos-y-migraciones)
- [Estándares de código](#estándares-de-código)
- [CI/CD](#cicd)
- [Contribución](#contribución)
- [Licencia](#licencia)

## Arquitectura
Describe brevemente los componentes, módulos y cómo se comunican.
- Frontend: tecnologías, estructura de carpetas.
- Backend/API: framework, endpoints principales.
- Integraciones: servicios externos, colas, webhooks.

## Requisitos
- Lenguajes y versiones
- Gestor de paquetes
- Dependencias del sistema (por ejemplo, Node, Python, Java, Docker)
- Herramientas (por ejemplo, Make, Git, CLI de proveedores)

## Configuración de desarrollo
Pasos para preparar el entorno local:
1. Clonar el repositorio
2. Instalar dependencias
3. Configurar variables de entorno
4. Inicializar base de datos/servicios

## Ejecución local
Comandos para levantar el proyecto:
- Arranque del backend
- Arranque del frontend
- Docker Compose (si aplica)
- Scripts útiles

## Variables de entorno
Lista de variables y su propósito (no incluir secretos reales):
- APP_ENV
- DATABASE_URL
- API_KEYS_...

## Base de datos y migraciones
- Motor de base de datos
- Convenciones de naming
- Cómo crear y ejecutar migraciones
- Seeding de datos

## Estándares de código
- Formato y linters
- Convenciones de commits (Conventional Commits)
- Nomenclatura de ramas

## CI/CD
- Descripción de pipelines
- Checks obligatorios
- Estrategia de despliegue (entornos, ramas de release)

## Contribución
- Flujo de trabajo con Pull Requests
- Código de conducta (si existe)
- Cómo abrir issues útiles (plantillas)

## Licencia
Tipo de licencia y archivo de referencia (LICENSE).