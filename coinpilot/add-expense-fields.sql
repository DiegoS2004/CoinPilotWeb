-- Script simple para agregar nuevos campos a la tabla expenses
-- Ejecuta este script si el script principal da errores

-- Agregar columna last_paid_date si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'last_paid_date') THEN
        ALTER TABLE expenses ADD COLUMN last_paid_date DATE;
        RAISE NOTICE 'Columna last_paid_date agregada';
    ELSE
        RAISE NOTICE 'Columna last_paid_date ya existe';
    END IF;
END $$;

-- Agregar columna is_paid si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'is_paid') THEN
        ALTER TABLE expenses ADD COLUMN is_paid BOOLEAN DEFAULT false;
        RAISE NOTICE 'Columna is_paid agregada';
    ELSE
        RAISE NOTICE 'Columna is_paid ya existe';
    END IF;
END $$;

-- Crear índice para is_paid si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_expenses_is_paid') THEN
        CREATE INDEX idx_expenses_is_paid ON expenses(is_paid);
        RAISE NOTICE 'Índice idx_expenses_is_paid creado';
    ELSE
        RAISE NOTICE 'Índice idx_expenses_is_paid ya existe';
    END IF;
END $$;

-- Crear función para marcar gasto como pagado
CREATE OR REPLACE FUNCTION mark_expense_as_paid(expense_id UUID)
RETURNS void AS $$
DECLARE
    expense_record RECORD;
    next_due_date DATE;
BEGIN
    -- Get the expense record
    SELECT * INTO expense_record FROM expenses WHERE id = expense_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Expense not found';
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
    END CASE;
    
    -- Update the expense
    UPDATE expenses 
    SET 
        is_paid = true,
        last_paid_date = CURRENT_DATE,
        due_date = next_due_date,
        updated_at = NOW()
    WHERE id = expense_id;
    
    RAISE NOTICE 'Gasto marcado como pagado y fecha actualizada';
END;
$$ LANGUAGE plpgsql;

-- Verificar que todo se creó correctamente
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'expenses' 
AND column_name IN ('last_paid_date', 'is_paid')
ORDER BY column_name; 