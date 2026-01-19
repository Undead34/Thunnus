# Data Overview

Guía detallada de los archivos en `data/`, cómo interpretar los campos y qué métricas/visualizaciones se pueden obtener. Incluye la lógica de “email visto” vs “pixel cargado” para que los reportes sean consistentes.

## Fuentes base
- `users.json` (clave: `phishingUsers[]`):
  - `status`:  
    - `emailSended`: el correo fue enviado.  
    - `emailOpened`: se cargó el pixel; si el cliente bloquea imágenes puede quedar en `false`.  
    - `linkClicked`: se abrió el enlace con `client_id`.  
    - `formSubmitted`: se envió formulario (email/password).  
    - Timestamps: `emailOpenedAt`, `firstClickAt`, `lastClickAt`, `lastActivityAt`.
  - `events[]`: secuencia histórica (CREATE, EMAIL_SENT, EMAIL_OPENED, LINK_CLICKED, UPDATE_DATA/SUBMIT, etc.) con `timestamp` y `data`.
  - `metadata`: ip, userAgent, geolocation (country/city/lat/lon), device (os/browser/screenResolution), referralSource.
  - `clickCount`: contador de clics.
  - `capturedCredentials`: email/password si se capturaron.
  - Interpretación crítica: “lo vio” debe medirse como `emailOpened OR linkClicked`. Si `emailOpened=false` pero hay clic o credenciales, el pixel fue bloqueado o no se descargaron imágenes.
- `events.json`: `events[]` globales (vacío en este dump). Si llegara a poblarse, sirve para timelines globales sin tener que iterar usuarios.
- `batch.json`: `batches[]` con total, processed, successes, failures, errores por `userId`, `createdAt/updatedAt`, `status`. Útil para salud de envíos y throttling.
- `settings.json`: configuración (plantilla activa, SMTP). Contexto para entender campañas y proveedor de envío.

## Salidas derivadas (generadas)
Se construyen con `node scripts/build-structured-metrics.cjs`.

- `structured/users_summary.json`: una fila por usuario con flags consolidados:
  - `emailSent`, `openedPixel` (solo pixel), `linkClicked`, `sawEmail` (pixel OR clic), `submitted`, `capturedEmail`, `capturedPassword`.
  - Contadores: `clickCount`, `eventsCount`.
  - Timestamps normalizados: `emailOpenedAt`, `firstClickAt`, `lastClickAt`, `lastActivityAt`.
- `structured/aggregates.json`: totales y tasas globales:
  - Totales: `totalUsers`, `emailsSent`, `openedPixel`, `linkClicked`, `sawEmail`, `submitted`, `capturedEmail`, `capturedPassword`.
  - Tasas: `pixel_vs_sent`, `clicked_vs_sent`, `saw_vs_sent` (métrica “lo vio” robusta), `submit_vs_sent`, `submit_vs_clicked`, `captured_pass_vs_sent`, `captured_pass_vs_clicked`.

## Métricas avanzadas que se pueden derivar
- Embudo global y por segmento: enviados → pixel abiertos → clics → submitted → credenciales capturadas.
- Calidad del canal: ratio `openedPixel` vs `linkClicked`; casos `linkClicked && !openedPixel` = bloqueo de imágenes o descarga manual.
- Velocidad de reacción (timelines):
  - `time_to_open`: EMAIL_SENT → EMAIL_OPENED.
  - `time_to_click`: EMAIL_SENT → LINK_CLICKED.
  - `time_to_submit`: EMAIL_SENT → SUBMIT/UPDATE_DATA con credenciales.
  - P50/P90 y histogramas para mostrar qué tan rápido responden.
- Series temporales:
  - Conteos diarios/horarios de EMAIL_SENT/OPENED/CLICKED/SUBMIT.
  - Heatmaps de actividad por hora y día.
- Segmentación:
  - Por dominio de email.
  - Por país/ciudad (metadata.geolocation).
  - Por OS/navegador (metadata.device).
  - Por grupo (campo `group`).
- Profundidad de interacción:
  - Clics múltiples (`clickCount > 1`), reintentos.
  - Usuarios con muchos eventos/sesiones (si `sessionsNum` se usa).
- Salud de envíos:
  - Desde `batch.json`: tasas de éxito/fallo por lote, tipos de error, impacto de throttling.

## Ejemplos de gráficas/insights para informes
- Embudo stacked (global y por dominio/grupo) usando `sawEmail` como “lo vio” robusto.
- Línea temporal diaria de opens/clicks/submits; heatmap por hora/día.
- Boxplot de `time_to_click` y `time_to_submit`; tabla de p50/p90.
- Barra de bloqueadores: % de `linkClicked && !openedPixel`.
- Segmentación por OS/navegador y por país/dominio con tasas de clic y captura.
- Reintentos: distribución de `clickCount` y top usuarios con más clics.
- Salud de lotes: barras de successes/failures y top errores.
