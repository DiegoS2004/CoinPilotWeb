# Funcionalidades de Gastos Fijos

## Nuevas Características Implementadas

### 1. Marcado de Gastos como Pagados

**Funcionalidad**: Botón para marcar un gasto fijo como pagado y reiniciar automáticamente el contador.

**Cómo funciona**:
- Al hacer clic en "Marcar como pagado", se actualiza la fecha de vencimiento al siguiente período
- Se registra la fecha del último pago
- El gasto se marca como pagado visualmente
- El contador se reinicia automáticamente según la frecuencia del gasto

**Frecuencias soportadas**:
- Semanal: +7 días
- Quincenal: +14 días  
- Mensual: +1 mes
- Trimestral: +3 meses
- Anual: +1 año

### 2. Balance Neto sin Gastos Fijos

**Funcionalidad**: Nueva tarjeta en el dashboard que muestra el balance total sin considerar los gastos fijos mensuales.

**Cálculo**:
```
Balance Neto = Balance Total - Gastos Fijos Mensuales Pendientes
```

**Beneficios**:
- Visión más realista del dinero disponible
- Mejor planificación financiera
- Distinción entre gastos obligatorios y discrecionales

### 3. Visualización Mejorada

**Indicadores visuales**:
- ✅ Gastos pagados: Fondo verde claro y badge "Pagado"
- ⏰ Gastos pendientes: Badge con días restantes
- 🚨 Gastos vencidos: Badge rojo "Vencido"
- 📅 Fecha del último pago visible

**Información mostrada**:
- Monto del gasto
- Categoría
- Fecha de vencimiento
- Fecha del último pago (si aplica)
- Estado de pago
- Frecuencia

### 4. Cálculos Inteligentes

**Gastos pendientes**: Solo se consideran los gastos activos y no pagados para el total mensual.

**Gastos pagados**: Se muestran por separado para seguimiento histórico.

**Conversión de frecuencias**:
- Semanal: × 4.33 (promedio semanas por mes)
- Quincenal: × 2.17 (promedio quincenas por mes)
- Mensual: × 1
- Trimestral: ÷ 3
- Anual: ÷ 12

## Uso

### Marcar un Gasto como Pagado

1. Ve a la página de Gastos Fijos
2. Encuentra el gasto que quieres marcar como pagado
3. Haz clic en el botón "Marcar como pagado"
4. Confirma el pago en el diálogo
5. El gasto se actualizará automáticamente con la nueva fecha de vencimiento

### Ver el Balance Neto

1. En el dashboard principal, busca la tarjeta "Balance Neto"
2. Este valor muestra tu balance total sin los gastos fijos mensuales
3. Úsalo para planificar gastos discrecionales

## Base de Datos

### Nuevos Campos

- `last_paid_date`: Fecha del último pago realizado
- `is_paid`: Boolean que indica si el gasto está pagado

### Función SQL

`mark_expense_as_paid(expense_id UUID)`: Función que marca un gasto como pagado y calcula la próxima fecha de vencimiento.

## Configuración

Para aplicar los cambios en una base de datos existente, ejecuta el script SQL actualizado que incluye:

```sql
-- Agregar nuevos campos
ALTER TABLE expenses ADD COLUMN last_paid_date DATE;
ALTER TABLE expenses ADD COLUMN is_paid BOOLEAN DEFAULT false;

-- Crear índices
CREATE INDEX idx_expenses_is_paid ON expenses(is_paid);

-- Crear función para marcar como pagado
CREATE OR REPLACE FUNCTION mark_expense_as_paid(expense_id UUID)...
``` 