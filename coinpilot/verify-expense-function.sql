-- Script para verificar que la función mark_expense_as_paid esté funcionando correctamente

-- 1. Verificar que la función existe
SELECT 
    routine_name, 
    routine_type, 
    data_type
FROM information_schema.routines 
WHERE routine_name = 'mark_expense_as_paid';

-- 2. Verificar que las columnas necesarias existen
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'expenses' 
AND column_name IN ('last_paid_date', 'is_paid', 'due_date', 'frequency')
ORDER BY column_name;

-- 3. Verificar que hay gastos para probar
SELECT 
    id,
    name,
    amount,
    frequency,
    due_date,
    is_paid,
    last_paid_date,
    is_active
FROM expenses 
LIMIT 5;

-- 4. Función de prueba para marcar un gasto como pagado (reemplaza 'EXPENSE_ID_AQUI' con un ID real)
-- SELECT mark_expense_as_paid('EXPENSE_ID_AQUI');

-- 5. Verificar los permisos de la función
SELECT 
    routine_name,
    routine_type,
    security_type,
    is_deterministic
FROM information_schema.routines 
WHERE routine_name = 'mark_expense_as_paid';

-- 6. Verificar que las políticas RLS permiten actualizar
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'expenses'; 