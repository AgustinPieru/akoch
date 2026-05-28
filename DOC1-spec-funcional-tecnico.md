# DOCUMENTO 1 — ESPECIFICACIÓN FUNCIONAL Y TÉCNICA
## Sistema de Administración Inmobiliaria
### Versión 1.0 — Argentina — Uso Interno
### Fecha: Mayo 2026 | Confidencial

---

## TABLA DE CONTENIDOS

1. [Objetivo del Sistema](#1-objetivo-del-sistema)
2. [Modelo Funcional](#2-modelo-funcional)
3. [Módulos del Sistema](#3-módulos-del-sistema)
4. [Reglas de Negocio](#4-reglas-de-negocio)
5. [OCR y Automatización Documental](#5-ocr-y-automatización-documental)
6. [Dashboard y KPIs](#6-dashboard-y-kpis)
7. [Casos Especiales y Edge Cases](#7-casos-especiales-y-edge-cases)
8. [Modelo de Datos Preliminar](#8-modelo-de-datos-preliminar)
9. [MVP y Roadmap](#9-mvp-y-roadmap)
10. [Riesgos Funcionales](#10-riesgos-funcionales)

---

## 1. OBJETIVO DEL SISTEMA

### 1.1 Diagnóstico del contexto actual

La administración inmobiliaria en Argentina —especialmente en agencias de tamaño pequeño y mediano— opera en gran medida con herramientas no integradas: planillas de cálculo, archivos físicos, comunicaciones por WhatsApp y cálculos manuales. Este modelo presenta limitaciones estructurales que se agravan a medida que crece la cartera:

| Problema actual | Impacto real |
|---|---|
| Cálculo manual de aumentos ICL/IPC | Errores frecuentes, inconsistencias entre contratos, tiempo operativo elevado |
| Sin historial centralizado | Pérdida de documentación ante cambio de empleado o falla de equipo |
| Liquidaciones en planillas | Proceso de 2–4 horas por propietario, alta probabilidad de error |
| Sin alertas automáticas | Contratos vencen sin acción, cobros se retrasan sin recordatorio |
| Gastos dispersos | ABL, expensas, servicios y reparaciones gestionados en sistemas separados |
| Sin recibos digitales | El inquilino no tiene comprobante inmediato; reclamos frecuentes |
| Sin rentabilidad por propiedad | El propietario no sabe si su inversión es rentable en términos reales |
| Contratos en papel | Riesgo de extravío, sin búsqueda, sin acceso remoto |

### 1.2 Problemas que resuelve

El sistema centraliza y automatiza los procesos críticos de la administración inmobiliaria en una única plataforma web accesible desde cualquier dispositivo:

**Operativos:**
- Elimina el cálculo manual de aumentos: el sistema aplica ICL o IPC automáticamente en la fecha correspondiente, con registro del índice utilizado y el valor exacto aplicado.
- Automatiza las liquidaciones mensuales por propietario: el sistema consolida cobros, gastos y comisiones del período en un estado de cuenta generado con un clic.
- Genera recibos digitales en PDF para cada cobro, entregables por WhatsApp o email en segundos.
- Registra cobros parciales, tardíos y con intereses, manteniendo el historial completo de cada contrato.

**Documentales:**
- Almacena contratos, fotos, facturas de gastos y documentación legal en formato digital, vinculada a la entidad correspondiente.
- Permite carga de contratos en papel mediante OCR para extracción automática de datos.
- Mantiene historial fotográfico del estado de cada propiedad en cada momento (ingreso, egreso, reparaciones).

**Analíticos:**
- Calcula la rentabilidad bruta y neta por propiedad y por propietario en tiempo real.
- Presenta un dashboard con alertas, vencimientos, deuda total activa y flujo mensual proyectado.
- Genera reportes exportables en PDF y Excel por período, propietario o propiedad.

### 1.3 Procesos que centraliza

El sistema integra el ciclo completo de la administración inmobiliaria en un flujo continuo:

```
CAPTACIÓN/ALTA
      │
      ▼
PROPIEDAD REGISTRADA
      │
      ├──► ALQUILER ─► CONTRATO ─► COBROS ─► RECIBOS
      │                    │
      │                    ▼
      │              AUMENTOS ICL/IPC
      │                    │
      │                    ▼
      │              GASTOS DEL PERÍODO
      │                    │
      │                    ▼
      │              LIQUIDACIÓN MENSUAL ─► PDF ─► TRANSFERENCIA
      │
      └──► VENTA ─► PIPELINE ─► SEÑA ─► ESCRITURA ─► CIERRE

                              │
                              ▼
                         HISTORIAL COMPLETO
                    (documentos / fotos / auditoría)
```

### 1.4 Beneficios cuantificables esperados

- Reducción del tiempo de liquidación mensual: de 3–4 horas a 15 minutos por propietario.
- Eliminación de errores en cálculo de aumentos: proceso automatizado con trazabilidad completa.
- Disponibilidad de recibos: generación y envío en menos de 60 segundos desde el registro del cobro.
- Cero contratos vencidos sin notificación: alertas automáticas configurables con 60/30/15 días de anticipación.
- Acceso remoto 24/7: gestión desde cualquier dispositivo con conexión a internet.
- Historial completo: toda la vida útil de una propiedad, contrato o inquilino disponible en una pantalla.

---

## 2. MODELO FUNCIONAL

### 2.1 Entidades principales

El modelo de dominio se estructura alrededor de once entidades nucleares con relaciones bien definidas. A continuación se describen sus atributos, reglas y restricciones.

---

#### 2.1.1 PROPIETARIO (Owner)

**Descripción:** Persona física o jurídica titular de una o más propiedades administradas por la inmobiliaria.

**Atributos clave:**
- Tipo: persona_fisica | persona_juridica
- Nombre / Razón social
- CUIT / CUIL (validado por algoritmo)
- Condición impositiva: monotributista | responsable_inscripto | exento | consumidor_final
- Domicilio fiscal
- Teléfono principal / alternativo
- Email principal / alternativo
- CBU o Alias bancario (para liquidaciones)
- Nombre del banco
- Notas internas
- Estado: activo | inactivo | bloqueado
- Documentación adjunta (DNI, poder notarial, estatuto social, etc.)

**Reglas:**
- Un propietario puede tener **múltiples propiedades** en administración.
- Un propietario puede ser **co-titular** de una propiedad junto a otros propietarios, con porcentaje de participación definido (la suma de participaciones de todos los titulares debe ser exactamente 100%).
- Cuando hay múltiples titulares, la liquidación debe generarse **proporcional** al porcentaje de cada uno, o de forma consolidada según preferencia configurada.
- No se puede eliminar un propietario con propiedades activas o liquidaciones históricas (soft delete).

---

#### 2.1.2 INQUILINO (Tenant)

**Descripción:** Persona física o jurídica que ocupa una propiedad bajo contrato de locación o sin contrato formal.

**Atributos clave:**
- Tipo: persona_fisica | persona_juridica
- Nombre completo / Razón social
- DNI / CUIT / CUIL
- Fecha de nacimiento (persona física)
- Domicilio actual
- Domicilio laboral / empleador
- Teléfono principal / alternativo
- Email
- Situación laboral: empleado_relacion_de_dependencia | autonomo | jubilado | otro
- Estado: activo | inactivo
- Documentación adjunta (DNI, recibo de sueldo, certificado laboral, etc.)
- Historial de contratos
- Historial de pagos
- Deuda total acumulada (calculada)

**Reglas:**
- Un inquilino puede estar vinculado a **múltiples contratos** en distintas propiedades simultáneamente.
- Un contrato puede tener **múltiples inquilinos** (co-inquilinos), siendo uno el titular principal.
- Un inquilino puede figurar como **garante** en contratos de terceros.
- No se puede eliminar un inquilino con contratos activos o historial de pagos.

---

#### 2.1.3 PROPIEDAD (Property)

**Descripción:** Inmueble administrado por la inmobiliaria, ya sea en locación, en venta, disponible, o en situación especial.

**Atributos clave:**
- Tipo: casa | departamento | local_comercial | oficina | terreno | cochera | deposito | galpon | otro
- Dirección completa (calle, número, piso, depto, código postal, localidad, provincia)
- Partida inmobiliaria / Nomenclatura catastral
- Número de escritura / datos de escrituración
- Superficie cubierta (m²)
- Superficie total (m²)
- Antigüedad
- Ambientes / descripción
- Valor de tasación (ARS / USD)
- Estado actual: disponible | alquilada | en_venta | vendida | ocupada_sin_contrato | en_refaccion | bloqueada
- Configuración de gastos: quién paga ABL, expensas, servicios (por defecto editable por contrato)
  - ABL: pagado_por (inmobiliaria | propietario | inquilino)
  - Expensas ordinarias: pagado_por
  - Expensas extraordinarias: pagado_por
  - Gas / Luz / Agua: pagado_por
- Cuentas de servicios (número de cuenta AYSA, EDESUR/EDENOR, METROGAS, etc.)
- Importe mensual de expensas estimado
- Importe anual de ABL
- Encumbrances: hipoteca (sí/no), inhibición (sí/no)
- Notas internas
- Propietarios vinculados con porcentaje de titularidad
- Estado de publicación (disponible para alquiler, disponible para venta, no publicar)
- Documentación adjunta (escritura, plano, certificados, etc.)
- Galería fotográfica (historial por fecha y tipo)

**Reglas:**
- Una propiedad puede tener **múltiples contratos históricos** (solo uno activo a la vez).
- Una propiedad puede tener **múltiples gastos** asociados en distintos períodos.
- Una propiedad puede tener **múltiples reparaciones** en distintos momentos.
- El estado de la propiedad se actualiza automáticamente al activar/vencer/rescindirse un contrato.
- Una propiedad con estado "bloqueada" no puede generar nuevos contratos ni cobros.
- La propiedad puede existir sin contrato activo (estado: disponible, ocupada_sin_contrato).

---

#### 2.1.4 CONTRATO (Contract)

**Descripción:** Vínculo jurídico formal entre propietario(s) e inquilino(s) sobre una propiedad determinada.

**Atributos clave:**
- Propiedad vinculada
- Inquilino(s) titular(es) y co-inquilinos
- Propietario(s) (heredado de la propiedad)
- Fecha de inicio
- Fecha de vencimiento
- Duración pactada (en meses)
- Monto inicial mensual
- Moneda: ARS | USD
- Índice de actualización: ICL_BCRA | IPC_INDEC | CVS | libre | ninguno
- Periodicidad de actualización: mensual | trimestral | cuatrimestral | semestral | anual
- Porcentaje de administración (% del alquiler mensual)
- Comisión al inicio (% o monto fijo)
- Garantía: personal | inmueble | seguro_de_caucion | aval_bancario | sin_garantia
- Garante(s) vinculados con tipo de garantía
- Estado: borrador | vigente | vencido | rescindido | renovado | suspendido
- Fecha de rescisión (si aplica) + motivo + penalidad aplicada
- Cláusulas especiales (texto libre)
- Documento adjunto (contrato escaneado o digital)
- Historial de versiones (si fue modificado)
- Fecha de último aumento
- Próxima fecha de aumento (calculada)

**Reglas:**
- Solo puede existir **un contrato vigente** por propiedad en simultáneo.
- Al crear un contrato, el estado de la propiedad pasa automáticamente a "alquilada".
- Al vencer o rescindirse, el estado pasa a "disponible" (o "ocupada_sin_contrato" si se registra ocupación).
- La fecha del próximo aumento se calcula automáticamente en base a fecha de inicio + periodicidad pactada.
- El monto actualizado se calcula aplicando el índice correspondiente al período de actualización.
- Los contratos en USD pueden pactarse con pago en ARS al tipo de cambio del día (registrable).
- Un contrato vencido no puede generar cobros nuevos sin ser renovado, pero mantiene historial.

---

#### 2.1.5 OCUPACIÓN SIN CONTRATO (Informal Occupation)

**Descripción:** Situación en la que una propiedad está siendo usada por una persona sin mediar contrato formal vigente.

**Atributos clave:**
- Propiedad vinculada
- Persona(s) que ocupan (puede o no ser inquilino registrado)
- Fecha de inicio de ocupación
- Motivo: inquilino_con_contrato_vencido | familiar_propietario | contrato_en_tramite | otro
- Monto acordado informalmente (opcional)
- Notas internas
- Alerta activa (sí/no)
- Conversión a contrato (acción disponible)

**Reglas:**
- Este estado activa automáticamente una **alerta de riesgo** en el dashboard.
- No genera liquidaciones automáticas ni cobros, pero pueden registrarse cobros manuales.
- La inmobiliaria puede convertir la ocupación a contrato formal desde el mismo registro.
- El historial de la ocupación queda vinculado a la propiedad incluso al regularizarse.

---

#### 2.1.6 COBRO (Payment)

**Descripción:** Registro de un pago realizado por un inquilino correspondiente a un período de alquiler.

**Atributos clave:**
- Contrato vinculado
- Período (mes/año)
- Monto esperado (calculado: base + ajuste vigente)
- Monto cobrado
- Fecha de vencimiento pactada
- Fecha de cobro efectivo
- Días de mora (calculados)
- Interés por mora (calculado o manual)
- Forma de pago: efectivo | transferencia_bancaria | cheque | debito_automatico | mercado_pago | otro
- CBU/ALIAS origen (si transferencia)
- Estado: pendiente | pago_parcial | pagado | atrasado | incobrable
- Notas
- Recibo generado (sí/no, con link al PDF)
- Ajuste de período aplicado (índice, valor, porcentaje)

**Reglas:**
- Si el monto cobrado es **menor** al esperado, el cobro queda en estado "pago_parcial" y el saldo queda como deuda pendiente para el siguiente período.
- Si el cobro se realiza **después** de la fecha de vencimiento, se calculan intereses automáticamente según tasa configurada (por defecto tasa BNA activa).
- La imputación de un pago parcial sigue el orden: **intereses primero, luego capital**.
- Un cobro puede dividirse en múltiples cuotas acordadas (tabla `payment_installments`).
- El cobro en USD con pago en ARS requiere registrar el tipo de cambio utilizado.
- Al registrar un cobro como "pagado", se genera automáticamente la oferta de recibo digital.

---

#### 2.1.7 GASTO (Expense)

**Descripción:** Erogación vinculada a una propiedad, que puede ser pagada por la inmobiliaria, el propietario o el inquilino.

**Atributos clave:**
- Propiedad vinculada
- Tipo: ABL | expensas_ordinarias | expensas_extraordinarias | gas | luz | agua | internet | telefono | seguro | honorarios_profesionales | reparacion | impuesto_provincial | impuesto_municipal | administrativo | otro
- Descripción
- Período correspondiente (mes/año)
- Monto
- Moneda: ARS | USD
- Quién paga: inmobiliaria | propietario | inquilino | compartido
- Si compartido: porcentaje inmobiliaria / propietario / inquilino
- Estado: pendiente | pagado | vencido
- Fecha de vencimiento
- Fecha de pago efectivo
- Comprobante adjunto (factura, boleta, ticket)
- Impacto en liquidación: sí/no (si debe deducirse de la liquidación del propietario o cargarse al inquilino)
- Contrato vinculado (opcional, para gastos que impactan en el cobro al inquilino)

**Reglas:**
- Los gastos pagados por la **inmobiliaria** se descuentan automáticamente de la liquidación mensual del propietario.
- Los gastos pagados por el **propietario** se registran informativamente pero no impactan en liquidación.
- Los gastos pagados por el **inquilino** pueden generarse como cargo adicional en el próximo cobro.
- Un gasto de tipo "reparación" puede vincularse a un ticket de reparación activo.
- Los gastos compartidos requieren definir proporciones antes de guardar.

---

#### 2.1.8 LIQUIDACIÓN (Settlement)

**Descripción:** Estado de cuenta mensual generado para un propietario, consolidando ingresos y egresos del período.

**Atributos clave:**
- Propietario vinculado
- Período (mes/año)
- Propiedades incluidas (puede excluir propiedades específicas)
- Cobros del período (detalle por propiedad y contrato)
- Gastos pagados por inmobiliaria en el período (deducibles)
- Comisión de administración (calculada por propiedad)
- Subtotales por propiedad
- Total bruto cobrado
- Total gastos deducidos
- Total comisiones
- **Neto a transferir al propietario**
- Moneda de liquidación (ARS | USD | mixta con conversiones)
- Estado: borrador | generada | enviada | cerrada | anulada
- PDF generado (sí/no)
- Fecha de envío
- Fecha de transferencia
- Comprobante de transferencia adjunto
- Notas

**Reglas:**
- Una liquidación en estado "borrador" puede modificarse libremente.
- Una liquidación "cerrada" no puede modificarse; solo puede anularse con registro de motivo.
- Si el neto es **negativo** (gastos superan cobros), el propietario adeuda a la inmobiliaria; esto debe marcarse explícitamente.
- La liquidación consolida todas las propiedades del propietario por defecto; puede excluirse alguna manualmente.
- Para propietarios con múltiples co-titulares, se generan liquidaciones proporcionales por titular.
- Las liquidaciones en USD o mixtas requieren registrar el tipo de cambio utilizado para la conversión.

---

#### 2.1.9 VENTA (Sale)

**Descripción:** Proceso de compraventa de un inmueble gestionado por la inmobiliaria, ya sea de una propiedad administrada o de una captación nueva.

**Atributos clave:**
- Tipo: propiedad_administrada | captacion_nueva
- Propiedad (existente en sistema o nueva)
- Vendedor(es) con porcentaje de titularidad
- Comprador(es) (puede no ser un inquilino registrado)
- Precio de publicación (USD preferentemente, o ARS)
- Precio de oferta aceptada
- Forma de pago: contado | financiado | mixto | permuta
- Monto y fecha de seña / reserva
- Monto y fecha de boleto de compraventa
- Escribano asignado
- Fecha estimada de escritura
- Fecha real de escritura
- Comisión vendedor (% o monto)
- Comisión comprador (% o monto)
- Comisión total generada
- Estado del pipeline:
  - captacion → publicada → con_interesados → visita_coordinada → oferta_presentada → oferta_aceptada → seña_firmada → boleto_firmado → escritura_pendiente → escritura_firmada → vendida
- Documentación (poder, escritura, plancheta, planos, certificados de deuda, etc.)
- Notas del proceso
- Historial de ofertas (múltiples ofertas rechazadas antes de la aceptada)

**Reglas:**
- Una propiedad puede tener **solo una venta activa** a la vez.
- Al escriturar, el estado de la propiedad pasa a "vendida" y se archiva el contrato de locación si existía.
- Una venta de propiedad con inquilino activo debe registrar la situación de subrogación.
- Si la venta fracasa (oferta rechazada, comprador desiste), el pipeline puede revertirse al estado anterior.
- Las comisiones de venta no impactan en las liquidaciones de alquiler; se gestionan por separado.

---

#### 2.1.10 REPARACIÓN (Repair)

**Descripción:** Trabajo de mantenimiento o reparación necesario en una propiedad, desde el reporte hasta la resolución.

**Atributos clave:**
- Propiedad vinculada
- Contrato vinculado (si la propiedad está alquilada)
- Reportado por: inquilino | propietario | administracion
- Fecha de reporte
- Descripción del problema
- Tipo: electricidad | plomería | gas | estructura | pintura | carpintería | equipamiento | otro
- Urgencia: urgente | normal | baja
- Proveedor / contratista asignado
- Presupuesto presentado
- Monto final
- Quién paga: inmobiliaria | propietario | inquilino | compartido
- Estado: reportada | evaluando | presupuestada | aprobada | en_ejecucion | resuelta | cancelada
- Fecha de resolución
- Fotos adjuntas (antes y después)
- Vinculación con gasto (si se pagó, genera un gasto automáticamente)
- Notas

---

#### 2.1.11 RECIBO DIGITAL (Receipt)

**Descripción:** Comprobante digital generado para un cobro o una liquidación, entregable al destinatario por múltiples canales.

**Atributos clave:**
- Tipo: recibo_cobro | recibo_liquidacion
- Referencia (ID del cobro o liquidación)
- Número de recibo (secuencial, configurable)
- Fecha de generación
- Destinatario (inquilino o propietario)
- Contenido del PDF (generado dinámicamente)
- Canal de envío: email | whatsapp | ambos | descarga_manual
- Estado de envío: generado | enviado | entregado | error
- Fecha de envío
- Historial de reenvíos

---

### 2.2 Diagrama de relaciones

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MODELO DE DOMINIO                            │
└─────────────────────────────────────────────────────────────────────┘

PROPIETARIO ─────────────────────────────────────────── INQUILINO
     │ 1..N                                                  │ 1..N
     │                                                       │
     ▼ N..M (property_owners)                               ▼ N..M (contract_tenants)
PROPIEDAD ──────────────────────────────────────── CONTRATO
     │                                                  │
     ├──1..N──► GASTO                                  ├──1..N──► COBRO
     │                                                  │              │
     ├──1..N──► REPARACIÓN                             ├──1..N──► AUMENTO      │
     │                                                  │              │
     ├──1..1──► OCUPACIÓN SIN CONTRATO                └──► GARANTE   ▼
     │                                                           RECIBO COBRO
     ├──1..N──► FOTO HISTORIAL
     │
     ├──0..1──► VENTA
     │
     └──(via propietario)──► LIQUIDACIÓN
                                    │
                                    └──► RECIBO LIQUIDACIÓN

AUDITORÍA y NOTIFICACIONES aplican transversalmente a todas las entidades.
```

---

## 3. MÓDULOS DEL SISTEMA

### 3.1 Módulo: Propietarios

**Descripción funcional:**
Gestión integral del ciclo de vida de los propietarios: alta, modificación, consulta, historial y comunicaciones.

**Pantallas principales:**
- Lista de propietarios (tabla con búsqueda, filtros por estado y tipo)
- Ficha de propietario (datos personales/fiscales, propiedades vinculadas, liquidaciones históricas)
- Formulario de alta/edición
- Historial de liquidaciones con totales y PDF descargable
- Documentación adjunta (visor de archivos)

**Acciones disponibles:**
- Alta de propietario (persona física o jurídica)
- Edición de datos
- Baja lógica (soft delete, no elimina historial)
- Visualizar propiedades vinculadas
- Ver historial de liquidaciones
- Descargar resumen anual
- Subir documentación (DNI, poder, etc.)
- Exportar ficha en PDF

**Validaciones clave:**
- CUIT/CUIL con verificación de algoritmo estándar
- CBU con validación de dígito verificador
- Email con formato válido
- La suma de participaciones de propiedades compartidas debe ser exactamente 100%

**Flujo típico:**
```
1. Ingresar datos personales/fiscales del propietario
2. Asociar la propiedad (o crearla desde el módulo)
3. Definir porcentaje de titularidad (si hay co-titulares)
4. Cargar documentación
5. Activar como propietario operativo
```

---

### 3.2 Módulo: Inquilinos

**Descripción funcional:**
Registro y seguimiento de inquilinos, garantes y su historial contractual y de pagos.

**Pantallas principales:**
- Lista de inquilinos (tabla con búsqueda y filtros por estado, deuda, contrato activo)
- Ficha de inquilino (datos, contratos activos e históricos, estado de deuda, documentación)
- Formulario de alta/edición
- Historial de pagos (por contrato y global)
- Resumen de deuda actual

**Acciones disponibles:**
- Alta de inquilino
- Alta de garante (persona separada o vinculada a inquilino)
- Ver todos los contratos del inquilino
- Ver historial de pagos con detalle de mora e intereses
- Ver deuda total acumulada
- Generar resumen de cuenta corriente en PDF
- Subir documentación (DNI, recibo de sueldo, certificado laboral)
- Enviar notificación de deuda por WhatsApp/email

**Validaciones clave:**
- DNI/CUIT único (no puede registrarse dos veces el mismo documento)
- Validación de CUIT/CUIL con algoritmo
- No se puede eliminar un inquilino con contrato activo

---

### 3.3 Módulo: Propiedades

**Descripción funcional:**
Administración completa del activo inmobiliario: datos, estado, documentación, historial y vinculaciones.

**Pantallas principales:**
- Lista de propiedades (tabla/tarjetas con filtros por tipo, estado, propietario, zona)
- Ficha de propiedad (datos completos, estado actual, historial de contratos, gastos activos, reparaciones, fotos)
- Formulario de alta/edición
- Mapa de ubicación (integración Google Maps embed o coordenadas)
- Historial fotográfico (galería con timeline)
- Documentación adjunta

**Acciones disponibles:**
- Alta/edición/baja lógica de propiedad
- Cambio manual de estado (disponible, en refacción, bloqueada)
- Vincular propietarios con porcentajes
- Ver contrato activo
- Ver historial de contratos
- Ver gastos del período actual y histórico
- Ver reparaciones abiertas y resueltas
- Subir fotos con etiqueta de tipo y fecha
- Subir documentación (escritura, plano, habilitaciones)
- Ver rentabilidad calculada
- Activar/desactivar publicación en cartera disponible

**Configuración de gastos por propiedad:**
```
ABL:                    [Propietario ▾]
Expensas ordinarias:    [Inquilino   ▾]
Expensas extraordinarias: [Propietario ▾]
Gas / Luz / Agua:       [Inquilino   ▾]
(Overrideable por contrato)
```

---

### 3.4 Módulo: Contratos

**Descripción funcional:**
Creación y gestión del ciclo de vida completo de contratos de locación, desde el borrador hasta el vencimiento o rescisión.

**Pantallas principales:**
- Lista de contratos (activos, por vencer, vencidos, rescindidos) con filtros avanzados
- Detalle de contrato (datos completos, estado, cobros asociados, aumentos, documentación)
- Formulario de creación asistida (wizard en 4 pasos)
- Historial de aumentos con valores de índice aplicados
- Calculadora de proyección de alquiler (simulación de próximos 12 meses)
- Pantalla de renovación

**Wizard de creación en 4 pasos:**
```
Paso 1: Propiedad y Propietario(s)
  → Selección de propiedad (buscador)
  → Confirmación de propietarios vinculados

Paso 2: Inquilino(s) y Garantía
  → Selección o alta de inquilino principal
  → Agregar co-inquilinos (opcional)
  → Selección o alta de garante(s)
  → Tipo de garantía

Paso 3: Condiciones económicas
  → Monto inicial + moneda (ARS/USD)
  → Fecha de inicio y vencimiento
  → Índice de actualización (ICL/IPC/libre/ninguno)
  → Periodicidad de actualización
  → % administración + comisión inicial
  → Fecha de vencimiento de pago mensual (ej: día 10)

Paso 4: Cláusulas y documentación
  → Texto de cláusulas adicionales
  → Subida de contrato escaneado (o activar OCR)
  → Revisión y confirmación
```

**Acciones disponibles:**
- Crear contrato (wizard)
- Editar borrador
- Activar contrato (cambia estado propiedad a "alquilada")
- Registrar aumento manual (con índice y porcentaje)
- Aplicar aumento automático programado
- Renovar contrato (crea nueva versión vinculada al original)
- Rescindir contrato (con fecha, motivo y penalidad)
- Adjuntar/reemplazar documento
- Ver proyección de alquileres futuros
- Exportar contrato en PDF (plantilla)
- Enviar recordatorio de vencimiento

---

### 3.5 Módulo: Ocupaciones sin Contrato

**Descripción funcional:**
Registro y seguimiento de situaciones donde una propiedad es ocupada sin mediar contrato formal vigente.

**Pantallas principales:**
- Lista de ocupaciones activas (con alerta de duración y riesgo)
- Formulario de registro
- Detalle con historial y opciones de regularización

**Acciones disponibles:**
- Registrar ocupación sin contrato
- Agregar notas y seguimiento
- Convertir a contrato formal (redirige al wizard de contratos pre-completado)
- Solicitar desocupación (registro interno)
- Cerrar ocupación (con fecha de egreso)

**Alerta automática:**
- Al crearse, aparece en el dashboard como alerta de riesgo legal
- Si dura más de 30 días, escala la alerta a nivel crítico
- Notificación configurable al administrador

---

### 3.6 Módulo: Cobros

**Descripción funcional:**
Registro y seguimiento de todos los pagos de alquiler, incluyendo pagos parciales, tardíos, intereses y generación de recibos.

**Pantallas principales:**
- Panel de cobros del mes (todos los contratos, estado de pago del período actual)
- Historial de cobros por contrato / por período
- Formulario de registro de cobro
- Pantalla de cobros atrasados (con calculadora de intereses)
- Cuenta corriente del inquilino

**Lógica de cobro mensual:**
```
1. Al inicio de cada mes, el sistema genera automáticamente un
   cobro "pendiente" para cada contrato activo, con el monto
   actualizado según índice vigente.

2. El administrador registra el cobro cuando lo recibe:
   - Confirma monto, fecha y medio de pago
   - El sistema calcula si hay mora (fecha cobro > fecha vencimiento)
   - Si hay mora: calcula interés automáticamente
   - Si el monto es menor al esperado: registra pago parcial

3. Al confirmar el cobro:
   - El estado del cobro cambia a "pagado" o "pago_parcial"
   - Se genera oferta automática de recibo digital
   - El cobro queda disponible para la liquidación del propietario
```

**Cálculo de interés por mora:**
```
Interés = Monto_adeudado × (Tasa_diaria × Días_de_mora)

Tasa_diaria = Tasa_BNA_vigente / 365
Días_de_mora = Fecha_cobro - Fecha_vencimiento

(La tasa y la fórmula son configurables por el administrador)
```

**Acciones disponibles:**
- Registrar cobro completo
- Registrar cobro parcial (con nota y saldo pendiente)
- Calcular intereses por mora (automático o manual)
- Generar y enviar recibo digital
- Marcar como incobrable (con motivo)
- Ver historial completo del contrato
- Exportar cuenta corriente del inquilino en PDF

---

### 3.7 Módulo: Gastos

**Descripción funcional:**
Registro, categorización y seguimiento de todos los gastos asociados a las propiedades administradas.

**Pantallas principales:**
- Lista de gastos (filtrable por propiedad, tipo, período, estado, responsable de pago)
- Formulario de carga de gasto
- Vista consolidada por propiedad y período
- Panel de gastos pagados por inmobiliaria (pendientes de liquidación)

**Categorías de gastos:**

| Categoría | Descripción | Responsable típico |
|---|---|---|
| ABL | Alumbrado, Barrido y Limpieza (CABA/GBA) | Propietario |
| Expensas ordinarias | Cuota mensual del consorcio | Inquilino |
| Expensas extraordinarias | Obras, reparaciones extraordinarias del edificio | Propietario |
| Gas | METROGAS u otro proveedor | Inquilino |
| Luz | EDESUR, EDENOR u otro | Inquilino |
| Agua | AYSA u otro | Inquilino |
| Seguro de incendio | Obligatorio en contratos de locación | Propietario o Inquilino |
| Honorarios profesionales | Escribano, abogado, gestor | Variable |
| Reparación | Arreglo de mantenimiento | Variable |
| Impuesto provincial/municipal | Ingresos brutos, sellos | Variable |
| Administrativo | Gastos de gestión interna | Inmobiliaria |
| Otro | Libre | Configurable |

**Acciones disponibles:**
- Cargar gasto con comprobante adjunto
- Asignar responsable de pago
- Marcar como pagado
- Vincular a reparación
- Incluir/excluir de liquidación mensual
- Exportar listado por período

---

### 3.8 Módulo: Liquidaciones

**Descripción funcional:**
Generación automática del estado de cuenta mensual para cada propietario, con toda la información financiera del período.

**Pantallas principales:**
- Lista de liquidaciones (por propietario, período, estado)
- Detalle de liquidación (línea por línea con cobros, gastos y comisiones)
- Vista previa del PDF
- Pantalla de envío y confirmación

**Flujo de generación:**
```
1. El administrador selecciona: propietario + período

2. El sistema consolida automáticamente:
   a) Cobros del período (por propiedad)
   b) Gastos pagados por inmobiliaria en el período (deducibles)
   c) Comisión de administración (% configurado por contrato)
   d) Otros cargos o bonificaciones manuales

3. El sistema calcula:
   Total cobrado - Total gastos - Total comisiones = NETO A TRANSFERIR

4. El administrador revisa el borrador, puede:
   - Agregar/quitar ítems
   - Ajustar algún monto manualmente (con justificación)
   - Generar el PDF

5. Al confirmar: la liquidación pasa a estado "generada"
   → Se genera PDF descargable
   → Se envía por email/WhatsApp al propietario
   → Queda disponible en el historial del propietario

6. Al acreditar la transferencia, el administrador:
   - Adjunta comprobante de transferencia
   - Cierra la liquidación
```

**Estructura del PDF de liquidación:**
```
┌─────────────────────────────────────────┐
│  LIQUIDACIÓN MENSUAL                    │
│  Propietario: [nombre]   Período: [mes] │
├─────────────────────────────────────────┤
│  INGRESOS                               │
│  Propiedad A — Alquiler Enero 2026      │
│    Base: $350.000 + Ajuste ICL 4,2%     │
│    Total: $364.700                      │
│                                         │
│  Propiedad B — Alquiler Enero 2026      │
│    Total: $280.000                      │
│                                         │
│  SUBTOTAL INGRESOS: $644.700            │
├─────────────────────────────────────────┤
│  EGRESOS                                │
│  ABL - Propiedad A (Enero)  -$12.500    │
│  Gas - Propiedad A (Dic)    -$8.200     │
│                                         │
│  SUBTOTAL EGRESOS: -$20.700             │
├─────────────────────────────────────────┤
│  COMISIONES                             │
│  Administración 5% x Propiedad A       │
│    -$18.235                             │
│  Administración 5% x Propiedad B       │
│    -$14.000                             │
│                                         │
│  SUBTOTAL COMISIONES: -$32.235          │
├─────────────────────────────────────────┤
│  NETO A TRANSFERIR: $591.765            │
│  CBU: [CBU propietario]                 │
└─────────────────────────────────────────┘
```

---

### 3.9 Módulo: Ventas

**Descripción funcional:**
Gestión del pipeline de compraventa de inmuebles, desde la captación hasta la escrituración, para propiedades administradas y nuevas captaciones.

**Pantallas principales:**
- Tablero Kanban del pipeline de ventas (columnas por etapa)
- Lista de propiedades en venta (tabla con filtros)
- Ficha de venta (datos completos, historial de ofertas, documentación, tareas)
- Formulario de captación (propiedad nueva o selección de existente)
- Historial de ofertas por propiedad

**Pipeline de etapas:**
```
[CAPTACIÓN] → [PUBLICADA] → [VISITA] → [OFERTA] → [SEÑA] → [BOLETO] → [ESCRITURA] → [VENDIDA]
                                            │
                                      [OFERTA RECHAZADA]
                                            │
                                       (retorna a PUBLICADA)
```

**Acciones disponibles:**
- Registrar captación nueva (con datos de la propiedad, propietarios, precio y documentación)
- Publicar en cartera
- Registrar visita coordinada (fecha, interesado, notas)
- Registrar oferta recibida (monto, condiciones, comprador)
- Aceptar/rechazar oferta (con registro de motivo si rechaza)
- Registrar seña / reserva (monto, fecha, comprobante)
- Registrar boleto de compraventa
- Asignar escribano
- Registrar escritura (fecha, monto final, datos registrales)
- Cerrar venta (propiedad pasa a "vendida")
- Calcular comisión estimada
- Subir documentación del proceso

---

### 3.10 Módulo: Reparaciones

**Descripción funcional:**
Gestión de solicitudes de mantenimiento y reparaciones desde el reporte hasta la resolución, con seguimiento de presupuestos y costos.

**Pantallas principales:**
- Lista de reparaciones (filtros por estado, urgencia, propiedad, responsable)
- Detalle de reparación (historial de estados, fotos, presupuesto, notas)
- Formulario de alta
- Vista por propiedad (todas las reparaciones históricas)

**Flujo de reparación:**
```
REPORTE (inquilino/propietario/administración)
         │
         ▼
EVALUACIÓN (¿requiere presupuesto?)
         │
    SÍ ──┤── NO (reparación urgente menor)
         │              │
         ▼              ▼
  PRESUPUESTO     EJECUCIÓN DIRECTA
         │              │
         ▼              │
  APROBACIÓN            │
         │              │
         ▼◄─────────────┘
    EN EJECUCIÓN
         │
         ▼
    RESUELTA (con fotos del resultado)
         │
         ▼
GASTO GENERADO (opcional, vinculado al costo)
```

---

### 3.11 Módulo: Historial Fotográfico

**Descripción funcional:**
Registro visual cronológico del estado de cada propiedad, con categorización por tipo de evento.

**Tipos de foto:**
- Ingreso del inquilino (estado inicial)
- Egreso del inquilino (estado final para comparación)
- Reparación (antes y después)
- Marketing (fotos para publicación)
- Documento (foto de documento físico)
- General (otro tipo)

**Funcionalidades:**
- Subida masiva de fotos (drag & drop)
- Compresión automática sin pérdida perceptible de calidad
- Organización por fecha y tipo
- Vista en galería con zoom
- Comparación visual lado a lado (ingreso vs. egreso)
- Descarga individual o en ZIP del período

---

### 3.12 Módulo: Recibos Digitales

**Descripción funcional:**
Generación y distribución de comprobantes digitales para inquilinos (recibos de cobro) y propietarios (recibos de liquidación).

**Datos del recibo de cobro:**
- Número de recibo (secuencial)
- Datos de la inmobiliaria
- Datos del inquilino
- Datos de la propiedad
- Período correspondiente
- Monto base + ajuste aplicado (índice, porcentaje, fecha de aplicación)
- Monto por mora e intereses (si aplica)
- Total cobrado
- Forma de pago
- Fecha del cobro
- Firma o sello digital de la inmobiliaria
- Leyenda legal

**Canal de envío:**
- WhatsApp (mensaje con PDF adjunto o link)
- Email (con PDF adjunto)
- Descarga manual desde el sistema
- Historial de todos los envíos (fecha, canal, estado de entrega)

---

### 3.13 Módulo: Dashboard

Ver sección 6 — Dashboard y KPIs.

---

### 3.14 Módulo: Reportes

**Descripción funcional:**
Generación de informes analíticos para la toma de decisiones, exportables en PDF y Excel.

**Reportes disponibles:**

| Reporte | Descripción | Filtros |
|---|---|---|
| Cobros del período | Todos los cobros de un mes | Mes, propiedad, propietario |
| Deuda activa | Cobros pendientes y parciales | Antigüedad, inquilino, propiedad |
| Gastos del período | Gastos por categoría y responsable | Mes, tipo, propiedad |
| Liquidaciones | Historial de liquidaciones | Propietario, período |
| Rentabilidad por propiedad | Ingresos - Gastos por propiedad | Período, propietario |
| Contratos por vencer | Contratos próximos a vencer | Días hasta vencimiento |
| Vacancia | Propiedades sin contrato activo | Tipo, zona |
| Historial de aumentos | Aumentos aplicados por contrato | Índice, período |
| Reparaciones | Estado y costo de reparaciones | Período, propiedad, estado |
| Ventas | Pipeline y comisiones | Estado, período |

---

### 3.15 Módulo: Automatizaciones

**Descripción funcional:**
Motor de reglas que ejecuta acciones automáticas en base a eventos o condiciones del sistema.

**Reglas disponibles en MVP:**

| Disparador | Acción | Canal | Configurable |
|---|---|---|---|
| Contrato por vencer en 60 días | Notificación al administrador | Email interno | Sí |
| Contrato por vencer en 30 días | Notificación al propietario e inquilino | Email + WhatsApp | Sí |
| Contrato vencido sin renovación | Alerta crítica en dashboard | Sistema | Sí |
| Cobro no registrado X días después del vencimiento | Recordatorio al inquilino | WhatsApp | Sí |
| Aumento de alquiler vence en 7 días | Notificación al administrador | Email | Sí |
| Liquidación no generada al día X del mes | Recordatorio al administrador | Email | Sí |
| Ocupación sin contrato dura más de 30 días | Alerta crítica | Sistema + Email | Sí |
| Cobro registrado | Generar y enviar recibo | WhatsApp + Email | Sí |
| Reparación urgente sin asignar en 24h | Alerta escalada | Email + Sistema | Sí |

---

## 4. REGLAS DE NEGOCIO

### 4.1 Índices de actualización de alquileres

#### 4.1.1 ICL — Índice para Contratos de Locación (BCRA)

El ICL es publicado por el Banco Central de la República Argentina (BCRA) con frecuencia diaria. Su fórmula combina:

```
ICL = (50% × variación UVA) + (50% × variación RIPTE)

Donde:
- UVA: Unidad de Valor Adquisitivo (CPI-linked)
- RIPTE: Remuneración Imponible Promedio de los Trabajadores Estables (salarios formales)
```

**Aplicación en el sistema:**
- El sistema consumirá la API pública del BCRA para obtener el valor vigente del ICL en la fecha de actualización del contrato.
- Se registrará el valor exacto del índice utilizado y la fecha de consulta.
- Si la API no está disponible, el sistema mostrará alerta y permitirá ingreso manual del valor.
- El porcentaje de aumento = ((ICL_actual / ICL_fecha_inicio_período) - 1) × 100

**Fuente oficial:** `https://api.bcra.gob.ar/estadisticas/v1/` (endpoint público sin autenticación)

#### 4.1.2 IPC — Índice de Precios al Consumidor (INDEC)

Publicado mensualmente por el INDEC. Se utiliza el IPC Nacional o Nivel General.

```
Aumento = Variación porcentual acumulada del período pactado
```

**Aplicación:** Acceso vía web scraping del sitio del INDEC o ingreso manual (no existe API oficial pública estable). El sistema permitirá actualizar el índice manualmente o mediante ingreso de CSV descargado del INDEC.

#### 4.1.3 Índice libre o pactado

Contratos bajo DNU 70/2023 pueden acordar cualquier índice o porcentaje fijo. El sistema permite:
- Porcentaje fijo pactado (ej: 10% trimestral)
- Índice personalizado ingresado manualmente
- Sin actualización (moneda USD estable)

#### 4.1.4 Registro de actualización

Cada actualización genera un registro inmutable en la tabla `rent_increases` con:
- Contrato vinculado
- Fecha de aplicación
- Índice utilizado
- Valor del índice en la fecha anterior
- Valor del índice en la fecha de aplicación
- Porcentaje resultante
- Monto anterior
- Monto nuevo
- Estado: pendiente | aplicado | omitido (con justificación)

---

### 4.2 Intereses por mora

```
Fórmula:
Interés = Capital_adeudado × (Tasa_anual_BNA / 365) × Días_de_mora

Donde:
- Capital_adeudado: diferencia entre monto esperado y monto cobrado (o total si no pagó)
- Tasa_anual_BNA: tasa de interés para descubiertos del Banco Nación Argentina (configurable)
- Días_de_mora: días transcurridos desde la fecha de vencimiento hasta la fecha de cobro efectivo

Regla de imputación de pagos parciales:
  1° se imputan los intereses generados
  2° el remanente reduce el capital
```

La tasa BNA es configurable y actualizable desde el panel de configuración. El sistema guarda la tasa histórica utilizada para cada cálculo.

---

### 4.3 Comisiones y honorarios

**Comisión de administración:**
- Porcentaje mensual sobre el alquiler cobrado (configurable por contrato, default 5–10%)
- Se calcula sobre el monto base del alquiler, no sobre los gastos
- Se descuenta automáticamente en la liquidación

**Comisión de locación (al inicio del contrato):**
- Porcentaje del alquiler mensual × cantidad de meses acordada (ej: un mes de alquiler)
- O monto fijo pactado
- Se registra como ingreso de la inmobiliaria separado de las liquidaciones

**Comisión de ventas:**
- Porcentaje del precio de venta (comprador + vendedor, configurable)
- No impacta en liquidaciones de alquiler
- Se registra en el módulo de ventas

---

### 4.4 Dual currency — ARS + USD

**Regla general:**
- Cada transacción (cobro, gasto, liquidación) se almacena en su **moneda original**.
- Si se realiza un pago en moneda distinta al contrato, se registra el tipo de cambio **en el momento de la transacción**.
- No se realiza conversión automática: el administrador ingresa el tipo de cambio manualmente.

**Tipos de cambio disponibles:**
El sistema no conecta automáticamente con ninguna API de tipo de cambio en el MVP. El administrador configura el tipo de cambio de referencia diario desde el panel de configuración. Los tipos soportados son configurables:

```
OFICIAL BNA
BLUE / INFORMAL
CCL (Contado con Liquidación)
MEP (Dólar Bolsa)
EXPORTADOR
PERSONALIZADO
```

**Escenario común en Argentina:**
Contrato pactado en USD → inquilino paga en ARS al tipo de cambio negociado del día. El sistema registra:
- Moneda del contrato: USD
- Monto en USD: 500
- Tipo de cambio utilizado: 1.250 ARS/USD (tipo blue o según acuerdo)
- Monto cobrado en ARS: 625.000
- La liquidación al propietario puede generarse en ARS o en USD (configurable)

---

### 4.5 Múltiples titulares

Cuando una propiedad tiene múltiples propietarios co-titulares:

```
Propiedad A:
  Titular 1: Juan García      → 60%
  Titular 2: María García     → 40%
  Total:                        100%

Liquidación del período:
  Neto total:                 $500.000
  A Juan García (60%):        $300.000 → CBU_Juan
  A María García (40%):       $200.000 → CBU_María
```

El sistema genera una liquidación por titular o una liquidación unificada con el desglose proporcional, según configuración del propietario.

---

### 4.6 Gastos administrativos variables

Los siguientes gastos son variables y pueden diferir cada período:
- ABL (puede ser anual o semestral, cuotas)
- Expensas (varían mensualmente)
- Servicios (gas, luz, agua: según consumo)
- Reparaciones (imprevisibles)

El sistema **no proyecta** gastos futuros (para no generar expectativas falsas). Solo registra gastos reales ya facturados.

---

### 4.7 Contratos vencidos y renovaciones

```
Estado del contrato      Acción disponible
─────────────────────────────────────────────────────
Vigente                  Normal operation
Con 60 días para vencer  Alerta temprana + opción Renovar
Con 30 días para vencer  Alerta media + notificación partes
Vencido sin renovar      Alerta crítica + opción Renovar / Registrar Ocupación
Vencido con inquilino    Requiere acción: Renovar o Registrar Ocupación Sin Contrato
```

Al renovar un contrato:
1. El contrato original pasa a estado "renovado"
2. Se crea un nuevo contrato vinculado al anterior (campo `previous_contract_id`)
3. El nuevo contrato hereda propietario, inquilino y propiedad
4. El nuevo monto puede ser diferente al actualizado del contrato anterior
5. El historial de pagos del contrato original se mantiene separado

---

## 5. OCR Y AUTOMATIZACIÓN DOCUMENTAL

### 5.1 Propósito

El módulo OCR permite digitalizar contratos en papel o en PDF escaneado, extrayendo automáticamente los datos relevantes para pre-completar el formulario de alta de contrato. Esto reduce el tiempo de carga y los errores de tipeo.

### 5.2 Flujo completo

```
┌────────────────────────────────────────────────────────────┐
│                     FLUJO OCR                              │
└────────────────────────────────────────────────────────────┘

1. CARGA DEL DOCUMENTO
   El administrador sube: JPG / PNG / PDF (hasta 10 páginas)
   Restricciones: máx 10 MB por archivo, mín 150 DPI recomendado

2. PREPROCESAMIENTO (backend)
   - Conversión a escala de grises
   - Ajuste de contraste y nitidez (sharp.js)
   - Rotación automática si es necesario (corrección de ángulo)
   - Para PDFs multi-página: extracción de páginas como imágenes

3. RECONOCIMIENTO DE TEXTO (Tesseract.js, idioma: spa)
   - Output: texto bruto con coordenadas de cada palabra
   - Confianza (confidence score) por palabra

4. EXTRACCIÓN DE CAMPOS (regex + NLP básico)
   ┌────────────────────────────────────────────────────────┐
   │ Campo              │ Patrón de búsqueda                │
   ├────────────────────┼───────────────────────────────────┤
   │ Fecha inicio       │ DD/MM/YYYY o DD de [mes] de YYYY  │
   │ Fecha fin/venc.    │ Ídem                              │
   │ Monto mensual      │ $X.XXX | USD X.XXX | pesos X      │
   │ Moneda             │ "pesos" | "dólares" | "$" | "USD" │
   │ Nombre inquilino   │ Contexto: "locatario/a:" / "D./Dña." │
   │ DNI inquilino      │ Patrón: \d{7,8}                   │
   │ CUIT/CUIL          │ Patrón: \d{2}-\d{8}-\d{1}         │
   │ Dirección propiedad│ Contexto: "inmueble ubicado en"   │
   │ Índice actualiz.   │ Keywords: "ICL", "IPC", "UVA"     │
   │ Periodicidad       │ Keywords: "trimestral", "cuatrim."│
   │ % administración   │ Patrón: \d+(\.\d+)?%.*administr  │
   └────────────────────┴───────────────────────────────────┘

5. SCORE DE CONFIANZA
   - Por campo: HIGH (>85%), MEDIUM (60-85%), LOW (<60%)
   - Los campos LOW se marcan en amarillo para revisión manual
   - Los campos HIGH se pre-completan en verde

6. REVISIÓN MANUAL (frontend)
   - Formulario pre-completado con campos coloreados por confianza
   - El administrador revisa, corrige y confirma
   - NO se guarda automáticamente sin confirmación explícita

7. GUARDADO
   - Los datos confirmados se guardan en la base de datos
   - El documento original queda vinculado al contrato
   - Se registra en audit_log que el contrato se cargó vía OCR
```

### 5.3 Limitaciones documentadas

- Contratos manuscritos o con letra de mano dificultan el reconocimiento
- PDFs protegidos con contraseña no son procesables (se informa al usuario)
- Contratos con tablas complejas tienen menor precisión
- La extracción de cláusulas especiales es textual (no estructurada) en el MVP
- Calidad mínima recomendada: 150 DPI, sin manchas ni sombras significativas

### 5.4 Escalabilidad (Fase 3)

En fases posteriores se podrá reemplazar Tesseract.js por:
- **Google Cloud Vision API**: mayor precisión, especialmente en documentos deteriorados
- **AWS Textract**: detección inteligente de formularios y tablas
- **Azure AI Document Intelligence**: especializado en documentos legales

La interfaz del módulo está diseñada para que este reemplazo no afecte el resto del sistema (patrón adaptador).

---

## 6. DASHBOARD Y KPIs

### 6.1 Estructura del Dashboard

```
┌────────────────────────────────────────────────────────────────────┐
│  DASHBOARD PRINCIPAL                                               │
│  [Última actualización: hoy 09:23 hs]  [Período: Mayo 2026 ▾]    │
├──────────────────┬─────────────────┬────────────────┬─────────────┤
│  COBROS DEL MES  │ DEUDA ACTIVA    │ PROPIEDADES    │ ALERTAS     │
│  $1.240.500      │ $87.300         │ 24 total       │ 3 críticas  │
│  18/22 cobrados  │ 4 inquilinos    │ 18 alquiladas  │ 7 pendientes│
│  [ver detalle]   │ [ver detalle]   │ 2 disponibles  │ [ver todas] │
│                  │                 │ 1 en venta     │             │
│                  │                 │ 3 sin contrato │             │
├──────────────────┴─────────────────┴────────────────┴─────────────┤
│  INGRESOS / EGRESOS DEL MES                                        │
│  Ingresos: $1.240.500   Gastos imputados: $143.200                 │
│  Comisiones: $62.025    Neto liquidado: $1.035.275                 │
│  [Gráfico de barras: 6 últimos meses]                              │
├────────────────────────────────────────────────────────────────────┤
│  VENCIMIENTOS PRÓXIMOS (30 días)                                   │
│  [Tabla: contrato / inquilino / propiedad / vence / días restantes]│
├───────────────────────────┬────────────────────────────────────────┤
│  AUMENTOS PENDIENTES      │  LIQUIDACIONES PENDIENTES              │
│  3 contratos esperan aum. │  5 propietarios sin liquidación        │
│  [ver contratos]          │  [generar todas]                       │
├───────────────────────────┴────────────────────────────────────────┤
│  REPARACIONES ABIERTAS                                             │
│  2 urgentes / 4 normales / 1 baja                                  │
│  [ver reparaciones]                                                │
└────────────────────────────────────────────────────────────────────┘
```

### 6.2 KPIs por sección

**Módulo financiero:**

| KPI | Descripción | Cálculo |
|---|---|---|
| Ingreso bruto del mes | Total de cobros registrados | SUM(cobros del período) |
| Ingreso esperado del mes | Total de cobros que debían registrarse | SUM(alquileres activos del período) |
| Tasa de cobrabilidad | % de cobros cobrados sobre esperados | (cobrados / esperados) × 100 |
| Deuda total activa | Suma de saldos impagos | SUM(montos_pendientes) |
| Gastos imputados del mes | Total gastos pagados por inmobiliaria | SUM(gastos_inmobiliaria) |
| Comisiones generadas | Total comisiones del período | SUM(comisiones_contratos) |
| Neto a liquidar | Ingreso bruto - gastos - comisiones | Calculado |

**Módulo de propiedades:**

| KPI | Descripción |
|---|---|
| Total propiedades | Conteo total en cartera |
| Tasa de ocupación | % propiedades alquiladas sobre total |
| Propiedades disponibles | Sin contrato activo y sin ocupación irregular |
| Propiedades en venta | Con módulo de venta activo |
| Ocupaciones sin contrato | Situaciones irregulares activas |
| Vacancia promedio | Días promedio entre contratos por propiedad |

**Módulo de contratos:**

| KPI | Descripción |
|---|---|
| Contratos activos | Total contratos en estado "vigente" |
| Contratos por vencer (30 días) | Contratos que vencen en los próximos 30 días |
| Contratos vencidos sin renovar | Contratos expirados sin acción |
| Próximos aumentos | Contratos con fecha de actualización en los próximos 7/15/30 días |
| Aumentos aplicados en el mes | Actualizaciones ejecutadas en el período |

**Módulo de rentabilidad:**

| KPI | Descripción |
|---|---|
| Rentabilidad bruta por propiedad | (Ingresos - Gastos) / Valor de tasación × 100 (anualizado) |
| Rentabilidad neta por propietario | Neto liquidado / Inversión total del propietario |
| Propiedad más rentable | Ranking por rendimiento |
| Propiedad con mayor deuda | Ranking de incobrable |

### 6.3 Sistema de alertas

**Niveles de alerta:**

```
🔴 CRÍTICA   — Requiere acción inmediata
🟡 ADVERTENCIA — Requiere atención pronto
🔵 INFORMATIVA — Solo para conocimiento
```

| Condición | Nivel | Acción sugerida |
|---|---|---|
| Contrato vencido hace más de 7 días sin acción | 🔴 | Renovar o registrar ocupación |
| Propiedad con ocupación sin contrato > 30 días | 🔴 | Regularizar o desalojar |
| Cobro no registrado > 15 días del vencimiento | 🔴 | Contactar inquilino |
| Reparación urgente sin asignar > 24h | 🔴 | Asignar contratista |
| Contrato vence en menos de 30 días | 🟡 | Iniciar conversación de renovación |
| Aumento de alquiler pendiente > 7 días | 🟡 | Aplicar actualización |
| Liquidación del mes no generada al día 15 | 🟡 | Generar liquidación |
| Cobro no registrado entre 5 y 15 días | 🟡 | Enviar recordatorio |
| Contrato vence en 60 días | 🔵 | Tomar nota |
| Gasto pendiente de pago | 🔵 | Planificar pago |

---

## 7. CASOS ESPECIALES Y EDGE CASES

### 7.1 Pagos tardíos con acuerdo de plan de pago

Cuando un inquilino acuerda pagar su deuda en cuotas:

```
Deuda total: $150.000 (capital) + $18.000 (intereses) = $168.000

Plan pactado:
  Cuota 1 (15/01): $60.000
  Cuota 2 (15/02): $60.000
  Cuota 3 (15/03): $48.000

Imputación de cada cuota:
  Cuota 1: $18.000 → intereses, $42.000 → capital
  Cuota 2: $60.000 → capital
  Cuota 3: $48.000 → capital (saldo restante)
```

El sistema permite registrar un plan de pago con tabla de cuotas, estado por cuota y recibo por cada una.

### 7.2 Contrato en USD con pago en ARS (escenario común en Argentina)

```
Contrato: USD 500/mes
Inquilino paga en ARS al tipo de cambio negociado

Registro:
  Monto_contrato_USD: 500
  Tipo_cambio_aplicado: 1.200 (tipo blue negociado)
  Monto_cobrado_ARS: 600.000

Liquidación al propietario:
  Opción A: Liquidar en ARS → $600.000 - gastos - comisión
  Opción B: Liquidar en USD → USD 500 (el propietario recibe USD o el equivalente en ARS al TC oficial)
  → Configurable por propietario
```

### 7.3 Rescisión anticipada con penalidad

```
Contrato de 2 años, inquilino rescinde al mes 14 (le quedan 10 meses)

Penalidad estándar (DNU 70/2023 — actualmente libre):
  A definir en el contrato. Ejemplo: 2 meses de alquiler.

Registro en el sistema:
  Fecha de rescisión: [fecha]
  Motivo: voluntad_inquilino
  Penalidad aplicada: $X (2 meses de alquiler actualizado)
  Estado contrato → "rescindido"
  Cobro especial de penalidad → generado como ítem extra
  Estado propiedad → "disponible"
```

### 7.4 Propiedad vendida con inquilino activo (subrogación)

Cuando se vende una propiedad y el contrato de alquiler está vigente:
- La ley argentina permite que el contrato de alquiler continúe vigente ante el nuevo propietario (subrogación).
- El sistema registra el cambio de propietario en la propiedad (histórico), el contrato continúa vinculado.
- La liquidación a partir de la fecha de escritura se dirige al nuevo propietario.
- El historial completo anterior permanece vinculado al propietario original.

### 7.5 Liquidación con saldo negativo

Ocurre cuando los gastos pagados por la inmobiliaria superan los cobros del período:

```
Cobros del período:    $200.000
Gastos pagados:        $250.000 (reparación extraordinaria)
Comisión (5%):          $10.000

Neto = 200.000 - 250.000 - 10.000 = -60.000

→ El propietario le debe a la inmobiliaria $60.000
```

El sistema marca la liquidación como "saldo a favor de inmobiliaria", genera el PDF con el aviso explícito y registra la deuda del propietario en su cuenta corriente.

### 7.6 Múltiples cobros en el mismo mes

En algunos contratos con actualización mensual, puede haber en el mismo período:
- El cobro base del mes
- El cobro ajustado (si el aumento se aplica en el mismo mes)
- El interés de un pago anterior parcial

El sistema los registra como ítems separados dentro del mismo período, con descripción clara de cada concepto.

### 7.7 Gasto compartido entre propietario e inquilino

```
Reparación de cañería: $80.000 total
Acuerdo: 50% propietario, 50% inquilino

Registro:
  Gasto ID: GAS001
  Monto total: $80.000
  Porcentaje_propietario: 50% → $40.000 (se descuenta de liquidación)
  Porcentaje_inquilino: 50% → $40.000 (se agrega como cargo en próximo cobro)
```

### 7.8 Propiedad con múltiples propietarios en conflicto

Se puede marcar una propiedad como "bloqueada" con un campo de motivo (ej: "disputa judicial entre titulares"). Las propiedades bloqueadas:
- No pueden generar nuevos contratos
- No pueden generar liquidaciones
- Aparecen con alerta de color especial en el listado
- Mantienen historial completo intacto

### 7.9 Inquilino que es también garante en otro contrato

Un mismo individuo puede figurar como:
- Inquilino principal en Contrato A
- Co-inquilino en Contrato B
- Garante en Contrato C

El sistema los vincula como personas distintas dentro del mismo modelo (por DNI), y muestra el resumen consolidado en la ficha del individuo.

---

## 8. MODELO DE DATOS PRELIMINAR

### 8.1 Entidades y relaciones — pseudoSQL descriptivo

```sql
-- IDENTIDADES
TABLE owners (
  id              UUID PRIMARY KEY,
  type            ENUM('individual', 'company'),
  name            VARCHAR(200) NOT NULL,
  cuit_cuil       VARCHAR(13) NOT NULL UNIQUE,
  tax_status      ENUM('monotributista','responsable_inscripto','exento','consumidor_final'),
  fiscal_address  TEXT,
  phone           VARCHAR(50),
  email           VARCHAR(100),
  cbu             VARCHAR(22),
  bank_alias      VARCHAR(50),
  bank_name       VARCHAR(100),
  notes           TEXT,
  status          ENUM('active','inactive','blocked') DEFAULT 'active',
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP,
  deleted_at      TIMESTAMP  -- soft delete
)

TABLE tenants (
  id              UUID PRIMARY KEY,
  type            ENUM('individual', 'company'),
  name            VARCHAR(200) NOT NULL,
  dni_cuit        VARCHAR(13) NOT NULL UNIQUE,
  birthdate       DATE,  -- persona física
  address         TEXT,
  work_address    TEXT,
  employer        VARCHAR(200),
  employment_type ENUM('employee','self_employed','retired','other'),
  phone           VARCHAR(50),
  email           VARCHAR(100),
  notes           TEXT,
  status          ENUM('active','inactive') DEFAULT 'active',
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP,
  deleted_at      TIMESTAMP
)

-- PROPIEDADES
TABLE properties (
  id                    UUID PRIMARY KEY,
  type                  ENUM('house','apartment','commercial','office','land','garage','warehouse','other'),
  address_street        VARCHAR(200),
  address_number        VARCHAR(20),
  address_floor         VARCHAR(10),
  address_unit          VARCHAR(10),
  address_zipcode       VARCHAR(10),
  address_city          VARCHAR(100),
  address_province      VARCHAR(100),
  cadastral_id          VARCHAR(50),  -- partida inmobiliaria
  deed_number           VARCHAR(100),
  covered_sqm           DECIMAL(10,2),
  total_sqm             DECIMAL(10,2),
  age_years             INTEGER,
  rooms                 INTEGER,
  description           TEXT,
  valuation_ars         DECIMAL(15,2),
  valuation_usd         DECIMAL(12,2),
  status                ENUM('available','rented','for_sale','sold','squatted','in_renovation','blocked') DEFAULT 'available',
  abl_payer             ENUM('agency','owner','tenant') DEFAULT 'owner',
  ordinary_expenses_payer ENUM('agency','owner','tenant') DEFAULT 'tenant',
  extra_expenses_payer  ENUM('agency','owner','tenant') DEFAULT 'owner',
  utilities_payer       ENUM('agency','owner','tenant') DEFAULT 'tenant',
  estimated_expenses_ars DECIMAL(10,2),
  annual_abl_ars        DECIMAL(10,2),
  has_mortgage          BOOLEAN DEFAULT FALSE,
  has_lien              BOOLEAN DEFAULT FALSE,
  notes                 TEXT,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP,
  deleted_at            TIMESTAMP
)

TABLE property_owners (                      -- MANY-TO-MANY propietarios/propiedades
  property_id           UUID REFERENCES properties(id),
  owner_id              UUID REFERENCES owners(id),
  ownership_percentage  DECIMAL(5,2) NOT NULL,  -- suma debe ser 100.00
  PRIMARY KEY (property_id, owner_id)
)

-- CONTRATOS
TABLE contracts (
  id                    UUID PRIMARY KEY,
  property_id           UUID REFERENCES properties(id),
  start_date            DATE NOT NULL,
  end_date              DATE NOT NULL,
  duration_months       INTEGER,
  initial_amount        DECIMAL(12,2) NOT NULL,
  current_amount        DECIMAL(12,2),          -- último monto actualizado
  currency              ENUM('ARS','USD') DEFAULT 'ARS',
  adjustment_index      ENUM('ICL_BCRA','IPC_INDEC','CVS','fixed_rate','none'),
  adjustment_rate       DECIMAL(5,2),            -- % fijo si adjustment_index = fixed_rate
  adjustment_frequency  ENUM('monthly','quarterly','every_4_months','semi_annual','annual'),
  next_adjustment_date  DATE,                    -- calculado automáticamente
  admin_commission_pct  DECIMAL(5,2),            -- % administración
  initial_commission    DECIMAL(12,2),           -- comisión de locación
  guarantee_type        ENUM('personal','real_estate','insurance','bank_guarantee','none'),
  payment_day           INTEGER DEFAULT 10,       -- día de vencimiento de pago
  status                ENUM('draft','active','expired','terminated','renewed','suspended'),
  termination_date      DATE,
  termination_reason    TEXT,
  termination_penalty   DECIMAL(12,2),
  special_clauses       TEXT,
  previous_contract_id  UUID REFERENCES contracts(id),  -- para renovaciones
  document_url          VARCHAR(500),            -- contrato escaneado
  ocr_loaded            BOOLEAN DEFAULT FALSE,
  notes                 TEXT,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP,
  deleted_at            TIMESTAMP
)

TABLE contract_tenants (                    -- MANY-TO-MANY contratos/inquilinos
  contract_id           UUID REFERENCES contracts(id),
  tenant_id             UUID REFERENCES tenants(id),
  role                  ENUM('primary','co_tenant','guarantor'),
  PRIMARY KEY (contract_id, tenant_id, role)
)

-- COBROS
TABLE payments (
  id                    UUID PRIMARY KEY,
  contract_id           UUID REFERENCES contracts(id),
  period_month          INTEGER,  -- 1-12
  period_year           INTEGER,
  expected_amount       DECIMAL(12,2),
  paid_amount           DECIMAL(12,2),
  currency              ENUM('ARS','USD'),
  exchange_rate         DECIMAL(10,2),           -- tipo de cambio si pago en moneda distinta
  exchange_rate_type    VARCHAR(30),             -- 'oficial', 'blue', 'ccl', etc.
  due_date              DATE,
  payment_date          DATE,
  late_days             INTEGER,                 -- calculado
  late_interest         DECIMAL(12,2),           -- calculado o manual
  payment_method        ENUM('cash','transfer','check','direct_debit','mercado_pago','other'),
  origin_cbu            VARCHAR(22),
  status                ENUM('pending','partial','paid','late','uncollectable'),
  adjustment_index      VARCHAR(50),             -- índice aplicado en este período
  adjustment_pct        DECIMAL(5,2),            -- porcentaje de ajuste aplicado
  receipt_generated     BOOLEAN DEFAULT FALSE,
  notes                 TEXT,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP
)

TABLE payment_installments (               -- Plan de pago acordado
  id                    UUID PRIMARY KEY,
  payment_id            UUID REFERENCES payments(id),
  installment_number    INTEGER,
  due_date              DATE,
  amount                DECIMAL(12,2),
  paid_amount           DECIMAL(12,2),
  payment_date          DATE,
  status                ENUM('pending','paid','late'),
  notes                 TEXT
)

-- AUMENTOS
TABLE rent_increases (
  id                    UUID PRIMARY KEY,
  contract_id           UUID REFERENCES contracts(id),
  application_date      DATE,
  index_name            VARCHAR(50),
  previous_index_value  DECIMAL(10,4),
  new_index_value       DECIMAL(10,4),
  percentage_applied    DECIMAL(6,2),
  amount_before         DECIMAL(12,2),
  amount_after          DECIMAL(12,2),
  status                ENUM('pending','applied','skipped'),
  skip_reason           TEXT,
  created_at            TIMESTAMP DEFAULT NOW()
)

-- GASTOS
TABLE expenses (
  id                    UUID PRIMARY KEY,
  property_id           UUID REFERENCES properties(id),
  contract_id           UUID REFERENCES contracts(id),  -- opcional
  type                  ENUM('abl','ordinary_expenses','extra_expenses','gas','electricity','water','internet','insurance','repair','provincial_tax','municipal_tax','administrative','other'),
  description           VARCHAR(300),
  period_month          INTEGER,
  period_year           INTEGER,
  amount                DECIMAL(12,2),
  currency              ENUM('ARS','USD'),
  payer                 ENUM('agency','owner','tenant','shared'),
  agency_pct            DECIMAL(5,2),            -- si payer = shared
  owner_pct             DECIMAL(5,2),
  tenant_pct            DECIMAL(5,2),
  due_date              DATE,
  payment_date          DATE,
  status                ENUM('pending','paid','overdue'),
  affects_settlement    BOOLEAN DEFAULT TRUE,     -- si se descuenta de liquidación
  affects_tenant_charge BOOLEAN DEFAULT FALSE,    -- si se carga al inquilino
  receipt_url           VARCHAR(500),
  repair_id             UUID,                    -- FK a reparaciones (opcional)
  notes                 TEXT,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP,
  deleted_at            TIMESTAMP
)

-- LIQUIDACIONES
TABLE settlements (
  id                    UUID PRIMARY KEY,
  owner_id              UUID REFERENCES owners(id),
  period_month          INTEGER,
  period_year           INTEGER,
  gross_income          DECIMAL(12,2),           -- total cobros
  total_expenses        DECIMAL(12,2),           -- gastos pagados por inmobiliaria
  total_commissions     DECIMAL(12,2),           -- comisiones
  net_amount            DECIMAL(12,2),           -- neto a transferir (puede ser negativo)
  currency              ENUM('ARS','USD','MIXED'),
  exchange_rate         DECIMAL(10,2),
  status                ENUM('draft','generated','sent','closed','cancelled'),
  pdf_url               VARCHAR(500),
  sent_date             TIMESTAMP,
  transfer_date         DATE,
  transfer_receipt_url  VARCHAR(500),
  notes                 TEXT,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP
)

TABLE settlement_items (
  id                    UUID PRIMARY KEY,
  settlement_id         UUID REFERENCES settlements(id),
  type                  ENUM('payment','expense','commission','adjustment','other'),
  description           VARCHAR(300),
  property_id           UUID,
  amount                DECIMAL(12,2),
  currency              ENUM('ARS','USD'),
  is_debit              BOOLEAN,                 -- true = descuento, false = ingreso
  reference_id          UUID                     -- ID del cobro, gasto o comisión
)

-- VENTAS
TABLE sales (
  id                    UUID PRIMARY KEY,
  property_id           UUID REFERENCES properties(id),
  type                  ENUM('managed','new_captation'),
  list_price_amount     DECIMAL(12,2),
  list_price_currency   ENUM('ARS','USD'),
  accepted_offer_amount DECIMAL(12,2),
  accepted_offer_currency ENUM('ARS','USD'),
  payment_type          ENUM('cash','financed','mixed','trade'),
  earnest_amount        DECIMAL(12,2),
  earnest_date          DATE,
  deed_amount           DECIMAL(12,2),
  deed_date             DATE,
  notary_name           VARCHAR(200),
  estimated_closing_date DATE,
  commission_pct_seller DECIMAL(5,2),
  commission_pct_buyer  DECIMAL(5,2),
  total_commission      DECIMAL(12,2),
  pipeline_stage        ENUM('captation','published','visited','offer','accepted','earnest','deed_contract','deed_signed','sold'),
  notes                 TEXT,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP,
  deleted_at            TIMESTAMP
)

TABLE sale_parties (                        -- Compradores y vendedores
  id                    UUID PRIMARY KEY,
  sale_id               UUID REFERENCES sales(id),
  role                  ENUM('seller','buyer'),
  owner_id              UUID REFERENCES owners(id),   -- si es propietario registrado
  name                  VARCHAR(200),                 -- si es tercero no registrado
  cuit_cuil             VARCHAR(13),
  ownership_pct         DECIMAL(5,2)
)

TABLE sale_offers (                         -- Historial de ofertas
  id                    UUID PRIMARY KEY,
  sale_id               UUID REFERENCES sales(id),
  offer_amount          DECIMAL(12,2),
  offer_currency        ENUM('ARS','USD'),
  offer_date            DATE,
  buyer_name            VARCHAR(200),
  status                ENUM('pending','accepted','rejected','withdrawn'),
  rejection_reason      TEXT,
  notes                 TEXT
)

-- REPARACIONES
TABLE repairs (
  id                    UUID PRIMARY KEY,
  property_id           UUID REFERENCES properties(id),
  contract_id           UUID REFERENCES contracts(id),
  reported_by           ENUM('tenant','owner','agency'),
  report_date           DATE,
  description           TEXT,
  type                  ENUM('electrical','plumbing','gas','structure','painting','carpentry','equipment','other'),
  urgency               ENUM('urgent','normal','low'),
  provider_name         VARCHAR(200),
  budget_amount         DECIMAL(12,2),
  final_cost            DECIMAL(12,2),
  cost_payer            ENUM('agency','owner','tenant','shared'),
  status                ENUM('reported','evaluating','budgeted','approved','in_progress','resolved','cancelled'),
  resolution_date       DATE,
  expense_id            UUID,             -- gasto generado al resolver
  notes                 TEXT,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP
)

TABLE repair_photos (
  id                    UUID PRIMARY KEY,
  repair_id             UUID REFERENCES repairs(id),
  url                   VARCHAR(500),
  type                  ENUM('before','after','during'),
  taken_at              TIMESTAMP,
  notes                 VARCHAR(300)
)

-- FOTOGRAFÍAS DE PROPIEDADES
TABLE property_photos (
  id                    UUID PRIMARY KEY,
  property_id           UUID REFERENCES properties(id),
  url                   VARCHAR(500),
  type                  ENUM('entry','exit','repair','marketing','document','general'),
  contract_id           UUID,             -- opcional (para fotos de ingreso/egreso de inquilino)
  taken_at              TIMESTAMP,
  notes                 VARCHAR(300),
  created_at            TIMESTAMP DEFAULT NOW()
)

-- DOCUMENTOS
TABLE documents (
  id                    UUID PRIMARY KEY,
  entity_type           VARCHAR(50),      -- 'owner', 'tenant', 'property', 'contract', 'sale'
  entity_id             UUID,
  name                  VARCHAR(200),
  type                  VARCHAR(100),     -- 'dni', 'contract', 'deed', 'invoice', etc.
  url                   VARCHAR(500),
  size_bytes            INTEGER,
  mime_type             VARCHAR(100),
  ocr_processed         BOOLEAN DEFAULT FALSE,
  ocr_data              JSONB,            -- datos extraídos por OCR
  notes                 VARCHAR(300),
  created_at            TIMESTAMP DEFAULT NOW(),
  deleted_at            TIMESTAMP
)

-- RECIBOS
TABLE receipts (
  id                    UUID PRIMARY KEY,
  type                  ENUM('payment_receipt','settlement_receipt'),
  reference_id          UUID,             -- payment_id o settlement_id
  receipt_number        VARCHAR(20),      -- número secuencial
  recipient_name        VARCHAR(200),
  send_channels         JSONB,            -- ['email', 'whatsapp']
  status                ENUM('generated','sent','delivered','error'),
  sent_at               TIMESTAMP,
  pdf_url               VARCHAR(500),
  created_at            TIMESTAMP DEFAULT NOW()
)

-- OCUPACIONES SIN CONTRATO
TABLE informal_occupations (
  id                    UUID PRIMARY KEY,
  property_id           UUID REFERENCES properties(id),
  occupant_name         VARCHAR(200),
  occupant_phone        VARCHAR(50),
  start_date            DATE,
  reason                ENUM('expired_contract','owner_family','contract_in_progress','other'),
  informal_amount       DECIMAL(12,2),
  currency              ENUM('ARS','USD'),
  status                ENUM('active','regularized','vacated'),
  end_date              DATE,
  converted_to_contract_id UUID REFERENCES contracts(id),
  notes                 TEXT,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP
)

-- AUTOMATIZACIONES
TABLE automation_rules (
  id                    UUID PRIMARY KEY,
  name                  VARCHAR(100),
  trigger_event         VARCHAR(100),     -- 'contract_expiring_60d', 'payment_late_7d', etc.
  action_type           ENUM('send_whatsapp','send_email','create_alert','generate_receipt'),
  action_config         JSONB,            -- template_id, recipient, channel config
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMP DEFAULT NOW()
)

TABLE notifications (
  id                    UUID PRIMARY KEY,
  type                  VARCHAR(100),
  entity_type           VARCHAR(50),
  entity_id             UUID,
  title                 VARCHAR(200),
  message               TEXT,
  channel               ENUM('system','email','whatsapp'),
  status                ENUM('pending','sent','read','error'),
  sent_at               TIMESTAMP,
  read_at               TIMESTAMP,
  created_at            TIMESTAMP DEFAULT NOW()
)

-- AUDITORÍA
TABLE audit_log (
  id                    UUID PRIMARY KEY,
  table_name            VARCHAR(100),
  record_id             UUID,
  action                ENUM('INSERT','UPDATE','DELETE','RESTORE'),
  changed_fields        JSONB,            -- {field: {old: value, new: value}}
  performed_by          VARCHAR(100),     -- user ID o 'system'
  ip_address            VARCHAR(45),
  created_at            TIMESTAMP DEFAULT NOW()
)

-- CONFIGURACIÓN DEL SISTEMA
TABLE system_config (
  key                   VARCHAR(100) PRIMARY KEY,
  value                 TEXT,
  type                  VARCHAR(50),      -- 'string', 'number', 'boolean', 'json'
  description           VARCHAR(300),
  updated_at            TIMESTAMP
)
-- Entradas: bna_interest_rate, default_admin_pct, company_name, company_cuit, etc.
```

### 8.2 Índices recomendados

```sql
-- Búsquedas frecuentes por estado
CREATE INDEX idx_properties_status ON properties(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_contracts_status ON contracts(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_status ON payments(status);

-- Búsquedas por período
CREATE INDEX idx_payments_period ON payments(period_year, period_month);
CREATE INDEX idx_expenses_period ON expenses(period_year, period_month);
CREATE INDEX idx_settlements_period ON settlements(period_year, period_month);

-- Foreign keys (Prisma los crea automáticamente, pero verificar en producción)
CREATE INDEX idx_contracts_property_id ON contracts(property_id);
CREATE INDEX idx_payments_contract_id ON payments(contract_id);
CREATE INDEX idx_expenses_property_id ON expenses(property_id);
CREATE INDEX idx_settlements_owner_id ON settlements(owner_id);

-- Búsquedas por texto
CREATE INDEX idx_owners_cuit ON owners(cuit_cuil);
CREATE INDEX idx_tenants_dni ON tenants(dni_cuit);
CREATE INDEX idx_properties_address ON properties(address_city, address_street);
```

---

## 9. MVP Y ROADMAP

### 9.1 MVP Obligatorio — Fase 1 (estimado: 3–4 meses)

| Módulo | Estado en MVP | Funcionalidades incluidas |
|---|---|---|
| Autenticación | ✅ Completo | Login, JWT, cambio de contraseña |
| Propietarios | ✅ Completo | CRUD completo, documentos, historial |
| Inquilinos | ✅ Completo | CRUD completo, documentos, historial |
| Propiedades | ✅ Completo | CRUD, estado, propietarios vinculados |
| Contratos | ✅ Completo | Wizard, activación, vencimientos |
| Cobros | ✅ Completo | Registro, parciales, intereses, mora |
| Gastos | ✅ Completo | CRUD, categorías, asignación |
| Liquidaciones | ✅ Completo | Generación automática, PDF, historial |
| Recibos digitales | ✅ Completo | PDF, envío WhatsApp/email |
| Aumentos ICL/IPC | ✅ Completo | Cálculo automático + manual |
| OCR documental | ✅ Básico | Tesseract, contratos, revisión manual |
| WhatsApp | ✅ Básico | Notificaciones y recibos por whatsapp-web.js |
| Ventas | ✅ Básico | Pipeline, ofertas, seña, documentación |
| Dashboard | ✅ Completo | KPIs, alertas, vencimientos |
| Historial fotográfico | ⚠️ Básico | Subida, galería, tipos de foto |
| Reparaciones | ⚠️ Básico | CRUD, estados, fotos |
| Reportes | ⚠️ Básico | Cobros, gastos, deuda, contratos por vencer |
| Automatizaciones | ⚠️ Básico | Reglas preconfiguradas sin editor visual |
| Ocupaciones sin contrato | ✅ Completo | Registro, alertas, conversión |

### 9.2 Fase 2 — Mejoras y ampliación (estimado: +2 meses)

- Reportes avanzados con exportación a Excel y PDF parametrizable
- Editor visual de reglas de automatización
- Historial fotográfico comparativo (ingreso vs. egreso)
- Módulo de reparaciones completo con seguimiento de proveedores
- Calculadora de rentabilidad avanzada por propietario
- Vista de cartera disponible para publicación externa (landing simple)
- Mejora del pipeline de ventas con recordatorios automáticos
- Backup automático y restauración desde panel admin

### 9.3 Fase 3 — Integraciones y automatización avanzada (estimado: +2–3 meses)

- Integración AFIP: validación de CUIT en tiempo real, consulta de condición fiscal
- Integración Mercado Pago: link de pago para inquilinos, conciliación automática
- OCR Cloud: reemplazo de Tesseract por Google Vision o AWS Textract
- Firma digital: integración con algún proveedor de firma electrónica
- WhatsApp Business API oficial (Meta): plantillas verificadas, mayor confiabilidad
- IA generativa: asistente para generar contratos desde plantilla, clasificación automática de gastos
- API de BCRA automática: actualización de ICL sin intervención manual

---

## 10. RIESGOS FUNCIONALES

### 10.1 Riesgos de negocio

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Cambio en la legislación de alquileres (nuevo DNU o ley) | Alta | Alto | Sistema de índices configurable; el tipo de ajuste se define por contrato, no en el core del sistema |
| API BCRA no disponible en fecha de actualización | Media | Medio | Sistema permite ingreso manual del índice; alertas previas al administrador |
| Inconsistencia en tipo de cambio ARS/USD | Alta | Alto | Tipo de cambio siempre ingresado manualmente por operación; no hay conversión automática |
| Liquidaciones con errores de cálculo | Baja | Muy alto | Cálculo centralizado en el backend; PDF muestra línea por línea; historial de auditoría inmutable |
| Migración de datos de planillas antiguas | Media | Alto | El sistema no incluye migración automática en MVP; se provee plantilla de importación CSV |

### 10.2 Riesgos técnicos

| Riesgo | Mitigación |
|---|---|
| OCR con baja calidad de imagen | Score de confianza por campo; revisión manual obligatoria antes de guardar |
| Pérdida de datos por fallo de almacenamiento | Backups diarios automáticos PostgreSQL; volumes Docker separados para datos y uploads |
| Acceso no autorizado | JWT + httpOnly cookie; rate limiting en login; audit log de accesos |
| Pérdida de mensajes WhatsApp | Sistema de cola de mensajes con reintentos; log de todos los envíos |
| Corrupción de PDFs generados | Generación on-demand (no almacenados); se pueden regenerar en cualquier momento |

### 10.3 Riesgos de adopción

| Riesgo | Mitigación |
|---|---|
| Resistencia al cambio del equipo operativo | UI simple y orientada a flujos conocidos; capacitación inicial; documentación de usuario |
| Dependencia de conectividad a internet | El sistema no requiere offline mode; recomendación de conexión estable |
| Pérdida de historial al migrar desde planillas | Documentar proceso de ingreso manual de histórico; período de convivencia con planillas |

---

*Documento preparado por: Área de Tecnología*
*Versión: 1.0 | Fecha: Mayo 2026*
*Clasificación: Uso Interno — Confidencial*
