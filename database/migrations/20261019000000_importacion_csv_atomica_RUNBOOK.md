# Aplicación segura: importación CSV atómica

**Estado actual: PENDIENTE DE VALIDACIÓN Y APLICACIÓN.**

Esta migración **no** se ha aplicado en Supabase remoto. **No** se ha ensayado de forma dinámica en PostgreSQL 17 aislado. El endpoint `POST /admin/importar/{slug}` existe en el backend, pero la persistencia atómica **no está operativa en producción** hasta completar PRECHECK, ensayo aislado, VERIFY y una autorización expresa. No ejecutar este runbook por el solo hecho de fusionar la rama.

Este procedimiento no autoriza por sí mismo ningún cambio remoto. Requiere aprobación expresa.

## Bloqueos previos

No aplicar mientras falte cualquiera de estos puntos:

1. Respaldo recuperable reciente o PITR confirmado desde el panel de Supabase, con responsable y hora anotados.
2. Ensayo satisfactorio en PostgreSQL 17 aislado o en una rama/proyecto Supabase no productivo.
3. Resultado esperado de `20261019000000_importacion_csv_atomica_PRECHECK.sql` en preflight.
4. Ventana de aplicación sin importaciones concurrentes y con el backend antiguo todavía operativo.

## Ensayo aislado

1. Restaurar una copia anonimizada o estructural del esquema remoto en PostgreSQL 17.
2. Ejecutar `20261019000000_importacion_csv_atomica_PRECHECK.sql` y conservar su salida.
3. Aplicar `20261019000000_importacion_csv_atomica.sql` mediante el mecanismo de migraciones aprobado.
4. Ejecutar el archivo `VERIFY.sql`; `anon_can_execute` y `authenticated_can_execute` deben ser `false`,
   `service_role_can_execute` debe ser `true`, RLS debe estar activo y ambos conteos de huérfanos deben ser cero.
5. Ejecutar los casos: archivo válido, repetición, dos llamadas concurrentes, error en respuesta,
   opción y contacto, y error inesperado. Comparar nuevamente los cuatro conteos base.

## Aplicación autorizada

1. Confirmar y registrar el respaldo recuperable.
2. Guardar los conteos base de las cuatro tablas de respuestas y el listado de migraciones aplicado.
3. Aplicar exactamente el archivo versionado, en una sola transacción, con la herramienta de migraciones
   configurada para el proyecto. No copiar fragmentos ni ejecutar la RPC manualmente.
4. Ejecutar inmediatamente `VERIFY.sql`.
5. Desplegar el backend que llama a `tss_import_csv` y luego el frontend.
6. Hacer una prueba controlada con un CSV autorizado y no ficticio; repetir la misma solicitud y comprobar
   que los conteos no aumentan en el segundo intento.
7. Verificar dashboard, origen `csv_import`, contactos separados y registros de `tss_import_rows`.

## Fallo y recuperación

- Si la migración falla dentro de su transacción, no reintentar a ciegas: conservar el error completo,
  comprobar que las tablas y la función no quedaron creadas y corregir hacia delante.
- Si ya se aplicó pero todavía no hubo importaciones, deshabilitar primero el endpoint/backend. Solo entonces
  se puede preparar una migración inversa revisada que revoque la RPC y retire los objetos nuevos.
- Si ya hubo importaciones, no eliminar `tss_imports`, `tss_import_rows` ni envíos. Revocar temporalmente
  `EXECUTE` a `service_role`, deshabilitar el endpoint y crear una migración correctiva. Restaurar un respaldo
  completo solo mediante el procedimiento operativo de Supabase y con evaluación explícita de la pérdida de
  datos posterior al punto restaurado.

No existe una reversión automática segura una vez que haya importaciones reales: eliminar los objetos de
auditoría o restaurar la base puede destruir información válida.
