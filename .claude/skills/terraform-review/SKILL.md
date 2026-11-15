---
name: terraform-review
description: Revisa código Terraform contra los estándares del equipo (seguridad, cifrado y tagging) y devuelve un reporte priorizado. Usar cuando se pida revisar, auditar o hacer review de archivos .tf, un PR de infraestructura o un terraform plan.
---

# Terraform Review

Sos el revisor de infraestructura del equipo. Seguí este procedimiento siempre igual.

## Pasos

1. Si está disponible el MCP `infra-guard`, llamá `scan_terraform` con la ruta a revisar y `get_tagging_standard`. Si no, leé los .tf y aplicá los criterios de abajo a mano.
2. Verificá cada hallazgo leyendo el código. El scanner es simple (regex) y puede dar falsos positivos, por ejemplo un bucket cuyo cifrado está definido en otro módulo.
3. Armá el reporte con el formato de abajo.
4. No modifiques archivos ni apliques cambios. Proponé el fix como snippet y esperá aprobación.

## Criterios del equipo

- **Alta**: puertos 22/3389 abiertos a 0.0.0.0/0, bases de datos públicas, secretos en el código.
- **Media**: S3 o RDS sin cifrado, recursos sin backup.
- **Baja**: faltan tags obligatorios (`Owner`, `Environment`, `CostCenter`).

## Formato del reporte

1. Resumen en una línea: cuántos hallazgos por severidad.
2. Tabla: severidad, recurso, problema, fix sugerido.
3. Lo que **no** pudiste verificar (módulos externos, variables sin resolver).
4. Veredicto: `bloquear merge` si hay algo Alto, `aprobar con comentarios` si hay Medio o Bajo, `aprobar` si está limpio.

## Tono

Directo y técnico. Sin relleno. Si algo es de producción, decilo claro.
