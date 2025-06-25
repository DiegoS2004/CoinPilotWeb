-- Script para verificar y corregir la función mark_expense_as_paid

-- 1. Eliminar la función existente si hay problemas
DROP FUNCTION IF EXISTS mark_expense_as_paid(UUID);

-- 2. Crear la función nuevamente con mejor manejo de errores
CREATE OR REPLACE FUNCTION mark_expense_as_paid(expense_id UUID)
RETURNS void AS $$
DECLARE
    expense_record RECORD;
    next_due_date DATE;
BEGIN
    -- Get the expense record
    SELECT * INTO expense_record FROM expenses WHERE id = expense_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Expense not found with id: %', expense_id;
    END IF;
    
    -- Calculate next due date based on frequency
    CASE expense_record.frequency
        WHEN 'weekly' THEN
            next_due_date := expense_record.due_date + INTERVAL '7 days';
        WHEN 'biweekly' THEN
            next_due_date := expense_record.due_date + INTERVAL '14 days';
        WHEN 'monthly' THEN
            next_due_date := expense_record.due_date + INTERVAL '1 month';
        WHEN 'quarterly' THEN
            next_due_date := expense_record.due_date + INTERVAL '3 months';
        WHEN 'yearly' THEN
            next_due_date := expense_record.due_date + INTERVAL '1 year';
        ELSE
            -- Default to monthly if frequency is not recognized
            next_due_date := expense_record.due_date + INTERVAL '1 month';
    END CASE;
    
    -- Update the expense
    UPDATE expenses 
    SET 
        is_paid = true,
        last_paid_date = CURRENT_DATE,
        due_date = next_due_date,
        updated_at = NOW()
    WHERE id = expense_id;
    
    -- Verify the update was successful
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to update expense with id: %', expense_id;
    END IF;
    
    RAISE NOTICE 'Gasto marcado como pagado y fecha actualizada. ID: %, Nombre: %, Nueva fecha: %', 
                 expense_id, expense_record.name, next_due_date;
END;
$$ LANGUAGE plpgsql;

-- 3. Verificar que la función se creó correctamente
SELECT 
    routine_name, 
    routine_type, 
    data_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'mark_expense_as_paid';

-- 4. Probar la función con un gasto existente (descomenta y reemplaza el ID)
-- SELECT mark_expense_as_paid('TU_EXPENSE_ID_AQUI');

-- 5. Verificar que las columnas necesarias existen y tienen los tipos correctos
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'expenses' 
AND column_name IN ('last_paid_date', 'is_paid', 'due_date', 'frequency', 'updated_at')
ORDER BY column_name;

-- 6. Verificar que hay gastos para probar
SELECT 
    id,
    name,
    amount,
    frequency,
    due_date,
    is_paid,
    last_paid_date,
    is_active,
    updated_at
FROM expenses 
ORDER BY created_at DESC
LIMIT 3; 