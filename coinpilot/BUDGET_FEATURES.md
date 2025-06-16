# Funcionalidades de Presupuesto

## 🎯 Nueva Página de Presupuesto

La nueva página de presupuesto te permite planificar y distribuir tu dinero de manera inteligente, basándose en tu balance neto (sin gastos fijos).

## ✨ Características Principales

### 1. **Balance Neto Disponible**
- Muestra tu balance total sin considerar los gastos fijos mensuales
- Te da una visión realista del dinero disponible para gastos discrecionales
- Se actualiza automáticamente basándose en tus transacciones y gastos fijos

### 2. **Planes de Presupuesto Predefinidos**

#### Regla 50-30-20
- **50% Necesidades**: Vivienda, alimentación, transporte, servicios básicos
- **30% Deseos**: Entretenimiento, ropa, restaurantes, hobbies
- **20% Ahorro**: Ahorro, inversiones, fondo de emergencia

#### Regla 60-20-20
- **60% Necesidades**: Mayor enfoque en gastos esenciales
- **20% Deseos**: Gastos discrecionales
- **20% Ahorro**: Ahorro e inversiones

#### Regla 70-20-10
- **70% Necesidades**: Enfoque conservador en gastos esenciales
- **20% Deseos**: Gastos personales limitados
- **10% Ahorro**: Ahorro mínimo

#### Regla 80-10-10
- **80% Necesidades**: Enfoque muy conservador
- **10% Deseos**: Gastos personales muy limitados
- **10% Ahorro**: Ahorro mínimo

### 3. **Modo Personalizado**
- Distribuye tu presupuesto por las categorías que ya tienes configuradas
- Usa sliders interactivos para ajustar los porcentajes
- Distribución automática equitativa al inicio
- Validación en tiempo real del total asignado

### 4. **Visualización con Gráficos**
- **Pie Chart**: Muestra la distribución del presupuesto de forma visual
- **Tooltips interactivos**: Información detallada al pasar el mouse
- **Colores diferenciados**: Cada categoría tiene su propio color
- **Barras de progreso**: Visualización del porcentaje asignado

### 5. **Validación Inteligente**
- **✅ Perfectamente asignado**: 100% del presupuesto distribuido
- **⚠️ Subasignado**: Menos del 100% asignado (dinero sin usar)
- **⚠️ Sobreasignado**: Más del 100% asignado (necesitas ajustar)

### 6. **Resumen del Presupuesto**
- **Total Disponible**: Tu balance neto completo
- **Total Asignado**: Dinero distribuido en el presupuesto
- **Sin Asignar**: Dinero restante disponible

### 7. **🆕 Próxima Fecha de Pago**
- **Cálculo automático**: Basado en tu próximo gasto fijo pendiente
- **Días restantes**: Cuenta regresiva hasta el próximo pago
- **Fecha completa**: Muestra el día exacto del próximo pago
- **Fallback inteligente**: Si no hay gastos fijos, usa fin de mes

### 8. **🆕 Presupuesto Diario y Semanal**
- **Cálculo automático**: Divide tu presupuesto por días hasta el próximo pago
- **Presupuesto diario**: Cuánto puedes gastar por día en cada categoría
- **Presupuesto semanal**: Cuánto puedes gastar por semana en cada categoría
- **Resumen visual**: Muestra las 3 categorías principales con presupuesto diario
- **Desglose completo**: Detalle de todas las categorías con total, diario y semanal

## 🎨 Interfaz de Usuario

### Diseño Responsivo
- **Desktop**: Vista completa con gráfico y lista lado a lado
- **Mobile**: Vista apilada para mejor usabilidad
- **Tablet**: Adaptación automática del layout

### Controles Interactivos
- **Toggle de visibilidad**: Ocultar/mostrar montos
- **Sliders**: Ajuste preciso de porcentajes
- **Dropdown**: Selección de planes predefinidos
- **Botones**: Cambio entre modos

### Indicadores Visuales
- **Colores**: Verde (positivo), Rojo (negativo), Naranja (advertencia)
- **Iconos**: Emojis y iconos de Lucide para mejor identificación
- **Badges**: Estados de asignación claramente marcados

## 📊 Cálculos Automáticos

### Balance Neto
```
Balance Neto = Balance Total - Gastos Fijos Mensuales Pendientes
```

### Distribución por Plan
```
Monto por Categoría = Balance Neto × (Porcentaje del Plan / 100)
```

### Validación
```
Total Asignado = Suma de todos los porcentajes
Estado = {
  "Perfecto": Total = 100%,
  "Subasignado": Total < 100%,
  "Sobreasignado": Total > 100%
}
```

### 🆕 Próxima Fecha de Pago
```
Próxima Fecha = Mínimo(fechas de gastos fijos pendientes)
Fallback = Fin del mes actual (si no hay gastos fijos)
```

### 🆕 Presupuesto Diario y Semanal
```
Días hasta próximo pago = (Fecha próximo pago - Hoy) / (24 * 60 * 60 * 1000)
Semanas hasta próximo pago = Días hasta próximo pago / 7

Presupuesto Diario = Presupuesto Total / Días hasta próximo pago
Presupuesto Semanal = Presupuesto Total / Semanas hasta próximo pago
```

## 🚀 Cómo Usar

### 1. **Acceder al Presupuesto**
- Ve al sidebar y haz clic en "Presupuesto"
- O navega directamente a `/dashboard/budget`

### 2. **Ver tu Balance Neto**
- Revisa la tarjeta principal que muestra tu dinero disponible
- Este valor se calcula automáticamente

### 3. **Seleccionar un Plan**
- Elige entre los planes predefinidos (50-30-20, 60-20-20, etc.)
- O activa el modo personalizado para usar tus categorías

### 4. **Ajustar (Modo Personalizado)**
- Usa los sliders para ajustar los porcentajes
- Observa cómo cambia la distribución en tiempo real
- Asegúrate de que el total sea 100%

### 5. **Analizar la Distribución**
- Revisa el gráfico circular para ver la distribución visual
- Usa los tooltips para información detallada
- Verifica el resumen final

### 6. **🆕 Revisar Próximo Pago**
- Ve la fecha exacta de tu próximo pago de gastos fijos
- Observa cuántos días restan hasta esa fecha
- Entiende que tu presupuesto se calcula hasta ese momento

### 7. **🆕 Usar Presupuesto Diario**
- Revisa cuánto puedes gastar por día en cada categoría
- Usa el resumen de las 3 categorías principales
- Consulta el desglose completo para todas las categorías

## 💡 Consejos de Uso

### Para Principiantes
1. **Empieza con 50-30-20**: Es el plan más equilibrado
2. **Ajusta gradualmente**: Modifica los porcentajes según tus necesidades
3. **Revisa mensualmente**: Actualiza tu presupuesto cada mes
4. **🆕 Usa el presupuesto diario**: Divide tu gasto diario por categorías

### Para Usuarios Avanzados
1. **Usa el modo personalizado**: Aprovecha tus categorías específicas
2. **Crea múltiples escenarios**: Prueba diferentes distribuciones
3. **Integra con gastos fijos**: Considera que ya están excluidos del balance
4. **🆕 Planifica por períodos**: Usa el presupuesto semanal para planificación a mediano plazo

### Mejores Prácticas
- **Mantén un 10-20% de ahorro**: Siempre incluye ahorro en tu presupuesto
- **Revisa tus necesidades reales**: Ajusta basándote en gastos históricos
- **Sé flexible**: Los presupuestos deben adaptarse a cambios en tu vida
- **🆕 Respeta el presupuesto diario**: Evita exceder el límite diario de cada categoría
- **🆕 Planifica para el próximo pago**: Tu presupuesto se reinicia después de cada pago de gastos fijos

## 🔧 Integración con el Sistema

### Con Gastos Fijos
- Los gastos fijos se excluyen automáticamente del balance neto
- **🆕 La próxima fecha de pago se calcula automáticamente**
- **🆕 El presupuesto diario se ajusta según los días hasta el próximo pago**
- No necesitas incluirlos en tu presupuesto discrecional

### Con Categorías Existentes
- El modo personalizado usa las categorías que ya tienes configuradas
- Mantiene la consistencia con el resto de la aplicación
- Permite un control granular de tus gastos
- **🆕 Cada categoría tiene su propio presupuesto diario y semanal**

### Con Reportes
- Los datos del presupuesto se pueden integrar con reportes futuros
- Comparación entre presupuesto planificado vs. gastos reales
- Análisis de tendencias y cumplimiento de objetivos
- **🆕 Seguimiento de cumplimiento del presupuesto diario**

## 🎯 Beneficios

### Planificación Financiera
- **Visión clara**: Sabes exactamente cuánto puedes gastar en cada categoría
- **Control de gastos**: Evitas gastos excesivos en áreas específicas
- **Objetivos claros**: Metas específicas para cada tipo de gasto
- **🆕 Guía diaria**: Sabes exactamente cuánto puedes gastar hoy

### Toma de Decisiones
- **Información basada en datos**: Decisiones financieras más inteligentes
- **Priorización**: Enfoque en lo más importante
- **Flexibilidad**: Adaptación a cambios en tus finanzas
- **🆕 Planificación temporal**: Presupuesto ajustado a tu ciclo de pagos

### Bienestar Financiero
- **Reducción de estrés**: Menos preocupación por gastos inesperados
- **Mejor ahorro**: Distribución automática hacia objetivos financieros
- **Hábitos saludables**: Desarrollo de buenas prácticas financieras
- **🆕 Control diario**: Seguimiento constante de tus gastos

## 🆕 Ejemplo Práctico

### Escenario
- **Balance neto**: $10,000
- **Plan seleccionado**: 50-30-20
- **Próximo pago**: 15 días

### Distribución
- **Necesidades (50%)**: $5,000
- **Deseos (30%)**: $3,000
- **Ahorro (20%)**: $2,000

### Presupuesto Diario
- **Necesidades**: $333.33 por día
- **Deseos**: $200 por día
- **Ahorro**: $133.33 por día

### Presupuesto Semanal
- **Necesidades**: $2,333.33 por semana
- **Deseos**: $1,400 por semana
- **Ahorro**: $933.33 por semana

### Uso Diario
- **Desayuno**: $15 (Deseos) - ✅ Dentro del presupuesto
- **Transporte**: $25 (Necesidades) - ✅ Dentro del presupuesto
- **Cena**: $35 (Deseos) - ✅ Dentro del presupuesto
- **Total del día**: $75 - ✅ Muy por debajo del límite diario 